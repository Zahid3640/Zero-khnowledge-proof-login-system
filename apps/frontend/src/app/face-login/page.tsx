'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FaceCapture from '@/components/FaceCapture';
import { generateFaceEmbeddingFromImage } from '@/lib/faceEmbedding';
import {
  getStoredRegisteredEmbedding,
  getStoredRegisteredWallet,
  squaredDistance,
} from '@/lib/faceMatch';

const MATCH_THRESHOLD = 15000000;
const CIRCUIT_THRESHOLD = 1000000000;

export default function FaceLoginPage() {
  const router = useRouter();

  const [status, setStatus] = useState('');
  const [wallet, setWallet] = useState('');
  const [currentEmbedding, setCurrentEmbedding] = useState<number[]>([]);
  const [registeredEmbedding, setRegisteredEmbedding] = useState<number[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [token, setToken] = useState('');
  const [circuitDebug, setCircuitDebug] = useState<unknown>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  async function requestNonce(inputWallet: string) {
    const response = await fetch(`${apiUrl}/auth/nonce/${inputWallet}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get nonce');
    }

    return data;
  }

  async function verifyWithBackend(input: {
    wallet: string;
    registeredEmbedding: number[];
    currentEmbedding: number[];
  }) {
    const response = await fetch(`${apiUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: input.wallet,
        registeredEmbedding: input.registeredEmbedding,
        currentEmbedding: input.currentEmbedding,
        threshold: CIRCUIT_THRESHOLD,
      }),
    });

    const data = await response.json();

    console.log('AUTH VERIFY RESPONSE:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Backend proof verification failed');
    }

    return data;
  }

  function saveLoginProofDebug(loginResult: any, fallbackWallet: string) {
    const proofDebug =
      loginResult?.proof?.circuitDebug ||
      loginResult?.proofResult?.circuitDebug ||
      loginResult?.circuitDebug ||
      null;

    const onChainVerification =
      proofDebug?.onChainVerification ||
      loginResult?.proof?.circuitDebug?.onChainVerification ||
      loginResult?.proofResult?.circuitDebug?.onChainVerification ||
      loginResult?.circuitDebug?.onChainVerification ||
      null;

    console.log('PROOF DEBUG:', proofDebug);
    console.log('ON CHAIN VERIFICATION:', onChainVerification);

    localStorage.setItem('zk_face_jwt', loginResult.accessToken || '');
    localStorage.setItem('zk_face_wallet', loginResult.wallet || fallbackWallet);

    localStorage.setItem(
      'zk_face_login_proof_debug',
      JSON.stringify(proofDebug || loginResult, null, 2),
    );

    if (onChainVerification?.signature) {
      localStorage.setItem(
        'zk_face_onchain_verification_signature',
        onChainVerification.signature,
      );

      localStorage.setItem(
        'zk_face_onchain_verifier_program',
        onChainVerification.verifierProgramId || '',
      );
    }

  }

  async function handleCapture(image: string) {
    try {
      setStatus('Generating current face embedding...');

      const storedWallet = getStoredRegisteredWallet();
      const storedEmbedding = getStoredRegisteredEmbedding();

      if (!storedWallet) {
        throw new Error('No registered wallet found. Please register your face first.');
      }

      const currentResult = await generateFaceEmbeddingFromImage(image);
      const current = currentResult.quantizedEmbedding;

      const computedDistance = squaredDistance(storedEmbedding, current);

      setWallet(storedWallet);
      setRegisteredEmbedding(storedEmbedding);
      setCurrentEmbedding(current);
      setDistance(computedDistance);

      if (computedDistance > MATCH_THRESHOLD) {
        setStatus(
          `Face does not match. Distance ${computedDistance} is above threshold ${MATCH_THRESHOLD}.`,
        );
        return;
      }

      setStatus('Face matched locally. Requesting backend nonce...');

      await requestNonce(storedWallet);

      setStatus('Nonce received. Generating proof and verifying on Solana...');

      const loginResult = await verifyWithBackend({
        wallet: storedWallet,
        registeredEmbedding: storedEmbedding,
        currentEmbedding: current,
      });

      saveLoginProofDebug(loginResult, storedWallet);

      setToken(loginResult.accessToken || '');
      setCircuitDebug(
        loginResult?.proof?.circuitDebug ||
          loginResult?.circuitDebug ||
          loginResult,
      );

      setStatus('ZK proof verified on Solana. Redirecting to dashboard...');

      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="badge">Face Login</div>

        <h1>Login with Your Face</h1>

        <p className="subtitle">
          Capture your face again. The app compares your current embedding with
          the registered embedding, then sends both embeddings to the backend to
          generate a Noir Groth16 proof and verify it on Solana.
        </p>

        <FaceCapture onCapture={handleCapture} />

        {status && <div className="status">{status}</div>}

        {wallet && (
          <div className="box">
            <strong>Registered wallet</strong>
            <p>{wallet}</p>
          </div>
        )}

        {distance !== null && (
          <div className="box">
            <strong>Face match distance</strong>
            <p>Distance: {distance}</p>
            <p>Threshold: {MATCH_THRESHOLD}</p>
            <p>Matched: {distance <= MATCH_THRESHOLD ? 'Yes' : 'No'}</p>
          </div>
        )}

        {registeredEmbedding.length > 0 && (
          <div className="box">
            <strong>Registered embedding</strong>
            <p>[{registeredEmbedding.slice(0, 24).join(', ')}]</p>
          </div>
        )}

        {currentEmbedding.length > 0 && (
          <div className="box">
            <strong>Current embedding</strong>
            <p>[{currentEmbedding.slice(0, 24).join(', ')}]</p>
          </div>
        )}

        {circuitDebug !== null && (
          <div className="box">
            <strong>Circuit debug</strong>
            <p>{JSON.stringify(circuitDebug)}</p>
          </div>
        )}

        {token && (
          <div className="box token">
            <strong>JWT</strong>
            <p>{token}</p>
          </div>
        )}
      </section>
    </main>
  );
}
