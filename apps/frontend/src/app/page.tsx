import Link from 'next/link';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.hero}>
          <div className={styles.left}>
            <div className={styles.badge}>ZK FACE LOGIN · SOLANA DEVNET</div>

            <h1 className={styles.title}>
              Prove your face.
              <br />
              <span className={styles.gradientText}>Reveal nothing.</span>
            </h1>

            <p className={styles.subtitle}>
              Register a face commitment on Solana, then login by generating a
              Noir Groth16 proof that is verified on-chain before the backend
              issues your JWT session.
            </p>

            <div className={styles.actions}>
              <Link href="/face-register" className={styles.primary}>
                Register Face
              </Link>

              <Link href="/face-login" className={styles.secondary}>
                Login with Face
              </Link>
            </div>

            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div className={styles.stepTitle}>Capture</div>
                <div className={styles.stepText}>Browser camera captures face landmarks.</div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div className={styles.stepTitle}>Commit</div>
                <div className={styles.stepText}>Poseidon commitment is stored on Solana.</div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div className={styles.stepTitle}>Prove</div>
                <div className={styles.stepText}>Noir circuit generates Groth16 proof.</div>
              </div>

              <div className={styles.step}>
                <div className={styles.stepNum}>4</div>
                <div className={styles.stepTitle}>Verify</div>
                <div className={styles.stepText}>Solana verifier validates proof on-chain.</div>
              </div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.icon}>🧬</div>
                <div className={styles.pill}>Registration</div>
              </div>

              <h2 className={styles.cardTitle}>New user?</h2>
              <p className={styles.cardText}>
                Capture your face, generate a 24-value quantized embedding, hash
                it into a Poseidon commitment, and update your FaceAuth PDA.
              </p>

              <div className={styles.actions}>
                <Link href="/face-register" className={styles.primary}>
                  Start Registration
                </Link>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.icon}>🔐</div>
                <div className={styles.pill}>Login</div>
              </div>

              <h2 className={styles.cardTitle}>Already registered?</h2>
              <p className={styles.cardText}>
                Capture your face again, generate a ZK proof, verify it through
                the deployed Solana verifier program, and enter the dashboard.
              </p>

              <div className={styles.actions}>
                <Link href="/face-login" className={styles.secondary}>
                  Login with ZK Proof
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
