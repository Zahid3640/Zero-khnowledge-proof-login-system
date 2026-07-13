'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import FaceCapture from '@/components/FaceCapture';
import { generateFaceEmbeddingFromImage } from '@/lib/faceEmbedding';
import { createPoseidonCommitmentFromBackend } from '@/lib/poseidonCommitmentApi';
import {
  registerFaceCommitmentHex,
  updateFaceCommitmentHex,
} from '@/lib/solanaFaceAuth';
import styles from './face-register.module.css';

type SolanaResult = {
  tx: string;
  wallet: string;
  userFacePda: string;
};

function short(value: string, start = 10, end = 8) {
  if (!value) return 'N/A';
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }

  return (
    <button className={styles.copyButton} onClick={copy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function FaceRegisterPage() {
  const [status, setStatus] = useState('');
  const [capturedImage, setCapturedImage] = useState('');
  const [embedding, setEmbedding] = useState<number[]>([]);
  const [landmarksDetected, setLandmarksDetected] = useState<number | null>(null);
  const [commitmentHex, setCommitmentHex] = useState('');
  const [commitmentBytes, setCommitmentBytes] = useState<number[]>([]);
  const [solanaResult, setSolanaResult] = useState<SolanaResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const explorerUrl = solanaResult?.tx
    ? `https://explorer.solana.com/tx/${solanaResult.tx}?cluster=devnet`
    : '';

  const completedSteps = useMemo(() => {
    return {
      capture: Boolean(capturedImage),
      embedding: embedding.length === 24,
      commitment: Boolean(commitmentHex),
      solana: Boolean(solanaResult?.tx),
    };
  }, [capturedImage, embedding.length, commitmentHex, solanaResult]);

  async function handleCapture(image: string) {
    try {
      setIsProcessing(true);
      setStatus('Generating face embedding from captured image...');

      setCapturedImage(image);

      const embeddingResult = await generateFaceEmbeddingFromImage(image);
      const quantized = embeddingResult.quantizedEmbedding;

      setEmbedding(quantized);
      setLandmarksDetected(embeddingResult.landmarkCount ?? 478);

      setStatus('Generating Poseidon commitment through backend circuit...');

      const commitmentResult = await createPoseidonCommitmentFromBackend(quantized);

      setCommitmentHex(commitmentResult.commitmentHex);
      setCommitmentBytes(commitmentResult.commitmentBytes);

      localStorage.setItem('zk_face_registered_embedding', JSON.stringify(quantized));
      localStorage.setItem(
        'zk_face_registered_commitment_bytes',
        JSON.stringify(commitmentResult.commitmentBytes),
      );
      localStorage.setItem('zk_face_registered_commitment_hex', commitmentResult.commitmentHex);

      setStatus('Face embedding and Poseidon commitment generated. Now register or update it on Solana.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRegister() {
    try {
      if (!commitmentHex) {
        throw new Error('Generate commitment first by capturing your face.');
      }

      setIsProcessing(true);
      setStatus('Submitting commitment to Solana FaceAuth program...');

      const result = await registerFaceCommitmentHex(commitmentHex);

      setSolanaResult(result);

      localStorage.setItem('zk_face_registered_wallet', result.wallet);
      localStorage.setItem('zk_face_registered_pda', result.userFacePda);
      localStorage.setItem('zk_face_registered_tx', result.tx);

      setStatus('Face commitment registered on Solana successfully. Only the commitment is public; the private face witness stays user-controlled.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUpdate() {
    try {
      if (!commitmentHex) {
        throw new Error('Generate commitment first by capturing your face.');
      }

      setIsProcessing(true);
      setStatus('Updating existing Solana face commitment...');

      const result = await updateFaceCommitmentHex(commitmentHex);

      setSolanaResult(result);

      localStorage.setItem('zk_face_registered_wallet', result.wallet);
      localStorage.setItem('zk_face_registered_pda', result.userFacePda);
      localStorage.setItem('zk_face_registered_tx', result.tx);

      setStatus('Face commitment updated on Solana successfully. Only the Poseidon commitment is stored on-chain; your private face witness remains user-controlled on this device.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.badge}>FACE REGISTRATION · POSEIDON · SOLANA</div>

            <h1 className={styles.title}>Register Your Face Commitment</h1>

            <p className={styles.subtitle}>
              Capture your face, extract a quantized landmark embedding, generate a
              32-byte Poseidon commitment, and store that commitment in your Solana
              FaceAuth PDA.
            </p>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusLabel}>Registration State</div>
            <div className={styles.statusValue}>
              {completedSteps.solana ? 'On-chain' : commitmentHex ? 'Ready' : 'Capture'}
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.cameraFrame}>
              <FaceCapture onCapture={handleCapture} />
            </div>

            {status && <div className={styles.status}>{status}</div>}

          </section>

          <aside className={styles.panel}>
            <h2 style={{ marginTop: 0 }}>Registration Flow</h2>

            <div className={styles.flow}>
              <div className={`${styles.step} ${completedSteps.capture ? styles.stepActive : ''}`}>
                <div className={styles.stepNum}>1</div>
                <div>
                  <div className={styles.stepTitle}>Capture Face</div>
                  <div className={styles.stepText}>Camera frame saved in browser.</div>
                </div>
              </div>

              <div className={`${styles.step} ${completedSteps.embedding ? styles.stepActive : ''}`}>
                <div className={styles.stepNum}>2</div>
                <div>
                  <div className={styles.stepTitle}>Generate Embedding</div>
                  <div className={styles.stepText}>MediaPipe landmarks converted into 24 values.</div>
                </div>
              </div>

              <div className={`${styles.step} ${completedSteps.commitment ? styles.stepActive : ''}`}>
                <div className={styles.stepNum}>3</div>
                <div>
                  <div className={styles.stepTitle}>Poseidon Commitment</div>
                  <div className={styles.stepText}>Backend circuit creates commitment hash.</div>
                </div>
              </div>

              <div className={`${styles.step} ${completedSteps.solana ? styles.stepActive : ''}`}>
                <div className={styles.stepNum}>4</div>
                <div>
                  <div className={styles.stepTitle}>Store on Solana</div>
                  <div className={styles.stepText}>Commitment stored in FaceAuth PDA.</div>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.primary} onClick={handleRegister} disabled={isProcessing}>
                Register on Solana
              </button>

              <button className={styles.secondary} onClick={handleUpdate} disabled={isProcessing}>
                Update Existing
              </button>

              <Link className={styles.linkButton} href="/face-login">
                Go to Login
              </Link>
            </div>
          </aside>

          <section className={`${styles.panel} ${styles.wide}`}>
            <h2 style={{ marginTop: 0 }}>Proof Material</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Landmarks Detected</div>
                <div className={styles.infoValue}>{landmarksDetected ?? 'N/A'}</div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoLabel}>Vector Length</div>
                <div className={styles.infoValue}>{embedding.length || 'N/A'}</div>
              </div>

              <div className={`${styles.infoCard} ${styles.wide}`}>
                <div className={styles.infoLabel}>Quantized Face Embedding</div>
                <div className={styles.code}>
                  {embedding.length ? `[${embedding.join(', ')}]` : 'Capture a face to generate embedding.'}
                </div>
              </div>

              <div className={`${styles.infoCard} ${styles.wide}`}>
                <div className={styles.infoLabel}>Poseidon Commitment Hex</div>
                <div className={styles.code}>{commitmentHex || 'No commitment generated yet.'}</div>
              </div>

              <div className={`${styles.infoCard} ${styles.wide}`}>
                <div className={styles.infoLabel}>Commitment Bytes</div>
                <div className={styles.code}>
                  {commitmentBytes.length ? `[${commitmentBytes.join(', ')}]` : 'No bytes generated yet.'}
                </div>
              </div>
            </div>
          </section>

          {solanaResult && (
            <section className={`${styles.panel} ${styles.wide}`}>
              <div className={styles.txHeader}>
                <div>
                  <h2 style={{ margin: 0 }}>Solana Registration Result</h2>
                  <p style={{ color: '#94a3b8', marginTop: 8 }}>
                    Your Poseidon commitment is now linked with your wallet on Solana Devnet.
                  </p>
                </div>

                {explorerUrl && (
                  <Link className={styles.linkButton} href={explorerUrl} target="_blank">
                    Open Explorer
                  </Link>
                )}
              </div>

              <div className={styles.transactionBox}>
                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>Wallet</div>
                  <div className={styles.infoValue}>{solanaResult.wallet}</div>
                  <div style={{ marginTop: 10 }}>
                    <CopyButton value={solanaResult.wallet} />
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoLabel}>User Face PDA</div>
                  <div className={styles.infoValue}>{solanaResult.userFacePda}</div>
                  <div style={{ marginTop: 10 }}>
                    <CopyButton value={solanaResult.userFacePda} />
                  </div>
                </div>

                <div className={`${styles.infoCard} ${styles.wide}`}>
                  <div className={styles.infoLabel}>Transaction</div>
                  <div className={styles.infoValue}>{solanaResult.tx}</div>
                  <div style={{ marginTop: 10 }}>
                    <CopyButton value={solanaResult.tx} />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
