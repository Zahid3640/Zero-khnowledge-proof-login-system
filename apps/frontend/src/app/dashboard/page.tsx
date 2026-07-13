'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

type ProofDebug = {
  embeddingSize?: number;
  wallet?: string;
  userFacePda?: string;
  commitmentHexFromSolana?: string;
  threshold?: number;
  nonce?: number | string;
  localSunspotVerified?: boolean;
  onChainVerification?: {
    signature?: string;
    verifierProgramId?: string;
    proofSize?: number;
    publicWitnessSize?: number;
    instructionDataSize?: number;
  };
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

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={styles.badge}>
      <span className={styles.badgeDot} />
      {active ? label : `${label}: Pending`}
    </span>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [wallet, setWallet] = useState('');
  const [jwt, setJwt] = useState('');
  const [proofDebugRaw, setProofDebugRaw] = useState('');
  const [signature, setSignature] = useState('');
  const [verifierProgram, setVerifierProgram] = useState('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'circuit' | 'security'>('overview');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setWallet(
      localStorage.getItem('zk_face_wallet') ||
        localStorage.getItem('zk_face_registered_wallet') ||
        '',
    );

    setJwt(
      localStorage.getItem('zk_face_jwt') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        '',
    );

    setProofDebugRaw(localStorage.getItem('zk_face_login_proof_debug') || '');
    setSignature(localStorage.getItem('zk_face_onchain_verification_signature') || '');
    setVerifierProgram(localStorage.getItem('zk_face_onchain_verifier_program') || '');
  }, []);

  const proofDebug = useMemo<ProofDebug | null>(() => {
    if (!proofDebugRaw) return null;
    try {
      return JSON.parse(proofDebugRaw) as ProofDebug;
    } catch {
      return null;
    }
  }, [proofDebugRaw]);

  const finalSignature = signature || proofDebug?.onChainVerification?.signature || '';
  const finalVerifierProgram =
    verifierProgram || proofDebug?.onChainVerification?.verifierProgramId || '';
    const explorerUrl = finalSignature
    ? `https://explorer.solana.com/tx/${finalSignature}?cluster=devnet`
    : '';

  const isFullyVerified = Boolean(jwt && finalSignature && finalVerifierProgram);

  function handleLogout() {
    localStorage.removeItem('zk_face_jwt');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('zk_face_wallet');
    localStorage.removeItem('zk_face_login_proof_debug');
    localStorage.removeItem('zk_face_onchain_verification_signature');
    localStorage.removeItem('zk_face_onchain_verifier_program');

    router.push('/face-login');
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroGlow} />

          <div className={styles.topRow}>
            <div>
              <div className={styles.badges}>
                <Badge label="JWT Issued" active={Boolean(jwt)} />
                <Badge label="Solana Verified" active={Boolean(finalSignature)} />
              </div>

              <h1 className={styles.title}>ZK Face Auth Dashboard</h1>

              <p className={styles.subtitle}>
                Interactive proof console for the face-login flow. Your face embedding
                was converted into a Noir Groth16 proof and verified on-chain through
                a deployed Solana verifier program.
              </p>
            </div>

            <div className={styles.authCard}>
              <div className={styles.authLabel}>Auth State</div>
              <div className={styles.authValue}>{isFullyVerified ? 'Verified' : 'Partial'}</div>
              <div className={styles.authHint}>
                {isFullyVerified
                  ? 'JWT issued after Solana proof verification.'
                  : 'Missing verification data.'}
              </div>
            </div>
          </div>
        </header>

        <nav className={styles.tabs}>
          {(['overview', 'circuit', 'security'] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${selectedTab === tab ? styles.tabActive : ''}`}
              onClick={() => setSelectedTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>

        {selectedTab === 'overview' && (
          <>
            <div className={styles.statsGrid}>
              <StatCard label="Embedding Size" value={proofDebug?.embeddingSize ?? 'N/A'} />
              <StatCard
                label="Proof Size"
                value={
                  proofDebug?.onChainVerification?.proofSize
                    ? `${proofDebug.onChainVerification.proofSize} B`
                    : 'N/A'
                }
              />
              <StatCard
                label="Public Witness"
                value={
                  proofDebug?.onChainVerification?.publicWitnessSize
                    ? `${proofDebug.onChainVerification.publicWitnessSize} B`
                    : 'N/A'
                }
              />
              <StatCard label="Threshold" value={proofDebug?.threshold ?? 'N/A'} />
            </div>

            <div className={styles.mainGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Verification Flow</h2>
                    <p className={styles.panelText}>
                      Each stage must succeed before the backend issues the session JWT.
                    </p>
                  </div>
                </div>

                <div className={styles.timeline}>
                  {[
                    ['1', 'Face Capture', 'User face image captured in browser.'],
                    ['2', 'Noir Witness', 'Embedding converted into circuit witness.'],
                    ['3', 'Groth16 Proof', 'Sunspot generated proof and public witness.'],
                    ['4', 'Solana Verify', 'Verifier program accepted the proof.'],
                    ['5', 'JWT Issued', 'Backend issued auth token after success.'],
                  ].map(([num, title, desc]) => (
                    <div className={styles.step} key={num}>
                      <div className={styles.stepNumber}>{num}</div>
                      <div className={styles.stepTitle}>{title}</div>
                      <div className={styles.stepDesc}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Session</h2>

                <div className={styles.sessionGrid}>
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Wallet</div>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldValue}>{short(wallet)}</div>
                      <CopyButton value={wallet} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Nonce</div>
                    <div className={styles.fieldValue}>{proofDebug?.nonce ?? 'N/A'}</div>
                  </div>

                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Status</div>
                    <div className={styles.fieldValue}>
                      {isFullyVerified ? 'On-chain proof verified' : 'Verification incomplete'}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.panel} ${styles.fullWidth}`}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Solana On-chain Verification</h2>
                    <p className={styles.panelText}>
                      This transaction proves your ZK proof was verified by the deployed
                      Groth16 verifier program on Solana Devnet.
                    </p>
                  </div>

                  {explorerUrl && (
                    <Link className={styles.primaryButton} href={explorerUrl} target="_blank">
                      Open Explorer
                    </Link>
                  )}
                </div>

                <div className={styles.txBox}>
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Verifier Program</div>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldValue}>
                        {finalVerifierProgram || 'Verifier program not found'}
                      </div>
                      <CopyButton value={finalVerifierProgram} />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Verification Transaction</div>
                    <div className={styles.fieldRow}>
                      <div className={styles.fieldValue}>
                        {finalSignature || 'Transaction signature not found'}
                      </div>
                      <CopyButton value={finalSignature} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedTab === 'circuit' && (
          <div className={styles.grid}>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Circuit Commitment</h2>
              <p className={styles.panelText}>
                The backend fetched this commitment from the Solana FaceAuth PDA and
                used it as the proof-bound commitment.
              </p>

              <div className={styles.codeBox}>
                {proofDebug?.commitmentHexFromSolana || 'N/A'}
              </div>
            </div>

            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>User Face PDA</h2>
              <div className={styles.codeBox}>{proofDebug?.userFacePda || 'N/A'}</div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Raw Proof Debug</h2>
                  <p className={styles.panelText}>
                    Toggle the raw response saved from the backend verification flow.
                  </p>
                </div>

                <button className={styles.secondaryButton} onClick={() => setShowDebug((v) => !v)}>
                  {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
              </div>

              {showDebug && (
                <pre className={styles.debugBox}>{proofDebugRaw || 'No debug data found'}</pre>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'security' && (
          <div className={styles.warningGrid}>
            <div className={styles.warningCard}>
              <div className={styles.warningTitle}>Verified</div>
              <div className={styles.warningText}>
                Groth16 proof was generated from your Noir circuit and accepted by the
                Solana verifier program.
              </div>
            </div>

            <div className={styles.warningCard}>
              <div className={styles.warningTitle}>Production Hardening</div>
              <div className={styles.warningText}>
                Public inputs should be explicitly bound to commitment, nonce, threshold,
                wallet/session, and replay protection.
              </div>
            </div>

            <div className={styles.warningCard}>
              <div className={styles.warningTitle}>JWT Safety</div>
              <div className={styles.warningText}>
                JWT is displayed for development only. In production, never expose bearer
                tokens in the dashboard UI.
              </div>
            </div>
          </div>
        )}

        <div className={styles.actionBar}>
          <Link className={styles.secondaryButton} href="/face-login">
            Verify Again
          </Link>

          <Link className={styles.secondaryButton} href="/face-register">
            Update Face Commitment
          </Link>

          <button className={styles.dangerButton} onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className={`${styles.panel} ${styles.jwtPanel}`}>
          <h2 className={styles.panelTitle}>JWT</h2>
          <div className={styles.codeBox}>{jwt || 'JWT not found'}</div>
        </div>
      </section>
    </main>
  );
}
