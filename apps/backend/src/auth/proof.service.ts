import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { PoseidonCommitmentService } from './poseidon-commitment.service';
import { SolanaCommitmentService } from './solana-commitment.service';
import { SolanaZkVerifierService } from './solana-zk-verifier.service';

const execFileAsync = promisify(execFile);

const EMBEDDING_SIZE = 24;

type DynamicProofInput = {
  wallet: string;
  registeredEmbedding: number[];
  currentEmbedding: number[];
  threshold: number;
  nonce: string;
};

@Injectable()
export class ProofService {
  constructor(
    private readonly poseidonCommitmentService: PoseidonCommitmentService,
    private readonly solanaCommitmentService: SolanaCommitmentService,
    private readonly solanaZkVerifierService: SolanaZkVerifierService,
  ) {}

  private getCircuitPath() {
    return path.resolve(
      process.cwd(),
      process.env.NOIR_CIRCUIT_PATH || '../../circuits/face-login',
    );
  }

  private toCircuitU64(value: number) {
    return Math.abs(Math.round(value));
  }

  private toCircuitEmbedding(values: number[]) {
    if (!Array.isArray(values) || values.length < EMBEDDING_SIZE) {
      throw new Error(`Embedding must contain at least ${EMBEDDING_SIZE} numbers`);
    }

    return values
      .slice(0, EMBEDDING_SIZE)
      .map((value) => this.toCircuitU64(value));
  }

  private nonceToU64(nonce: string) {
    const clean = nonce.replace(/[^a-fA-F0-9]/g, '').slice(0, 12);

    if (!clean) {
      return 1;
    }

    const value = parseInt(clean, 16);

    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }

  private formatNoirArray(values: number[]) {
    return values.map((value) => `"${value}"`).join(', ');
  }

  private async writeProverToml(input: DynamicProofInput) {
    const circuitPath = this.getCircuitPath();

    const registeredEmbedding = this.toCircuitEmbedding(input.registeredEmbedding);
    const currentEmbedding = this.toCircuitEmbedding(input.currentEmbedding);

    const onChain = await this.solanaCommitmentService.getCommitmentHex(input.wallet);

    const localPoseidon =
      await this.poseidonCommitmentService.generateCommitment(registeredEmbedding);

    if (localPoseidon.commitmentHex !== onChain.commitmentHex) {
      throw new Error(
        `Registered embedding does not match on-chain commitment. Local ${localPoseidon.commitmentHex}, on-chain ${onChain.commitmentHex}`,
      );
    }

    const threshold = Math.max(1, Math.round(input.threshold));
    const nonce = this.nonceToU64(input.nonce);

    const proverToml = `registered_embedding = [${this.formatNoirArray(registeredEmbedding)}]

current_embedding = [${this.formatNoirArray(currentEmbedding)}]

commitment = "${onChain.commitmentHex}"
threshold = "${threshold}"
nonce = "${nonce}"
`;

    fs.writeFileSync(path.join(circuitPath, 'Prover.toml'), proverToml);

    return {
      circuitPath,
      wallet: input.wallet,
      userFacePda: onChain.userFacePda,
      registeredEmbedding,
      currentEmbedding,
      commitmentHex: onChain.commitmentHex,
      commitmentBytes: localPoseidon.commitmentBytes,
      threshold,
      nonce,
    };
  }

  private assertSunspotArtifacts(targetPath: string) {
    const requiredFiles = [
      'face_login.json',
      'face_login.ccs',
      'face_login.pk',
      'face_login.vk',
    ];

    for (const fileName of requiredFiles) {
      const filePath = path.join(targetPath, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Missing Sunspot artifact: ${filePath}. Run the one-time setup/deploy flow before backend login.`,
        );
      }
    }
  }

  async generateAndVerifyProof(input: DynamicProofInput): Promise<{
    verified: boolean;
    publicInputsPath: string;
    proofPath: string;
    vkPath: string;
    circuitDebug: unknown;
  }> {
    const debug = await this.writeProverToml(input);
    const circuitPath = debug.circuitPath;
    const targetPath = path.join(circuitPath, 'target');

    this.assertSunspotArtifacts(targetPath);

    await execFileAsync('nargo', ['execute', 'witness'], {
      cwd: circuitPath,
    });

    await execFileAsync(
      'sunspot',
      [
        'prove',
        './target/face_login.json',
        './target/witness.gz',
        './target/face_login.ccs',
        './target/face_login.pk',
      ],
      {
        cwd: circuitPath,
      },
    );

    const onChainVerification =
      await this.solanaZkVerifierService.verifyProofOnChain({
        proofPath: path.join(targetPath, 'face_login.proof'),
        publicWitnessPath: path.join(targetPath, 'face_login.pw'),
      });

    return {
      verified: true,
      publicInputsPath: path.join(targetPath, 'face_login.pw'),
      proofPath: path.join(targetPath, 'face_login.proof'),
      vkPath: path.join(targetPath, 'face_login.vk'),
      circuitDebug: {
        embeddingSize: EMBEDDING_SIZE,
        wallet: debug.wallet,
        userFacePda: debug.userFacePda,
        registeredEmbedding: debug.registeredEmbedding,
        currentEmbedding: debug.currentEmbedding,
        commitmentHexFromSolana: debug.commitmentHex,
        commitmentBytes: debug.commitmentBytes,
        threshold: debug.threshold,
        nonce: debug.nonce,
        onChainVerification,
      },
    };
  }

  async verifyExistingProof(): Promise<boolean> {
    const circuitPath = this.getCircuitPath();

    try {
      const { stdout, stderr } = await execFileAsync(
        'sunspot',
        [
          'verify',
          './target/face_login.vk',
          './target/face_login.proof',
          './target/face_login.pw',
        ],
        { cwd: circuitPath },
      );

      const output = `${stdout}\n${stderr}`;

      return output.includes('Verification successful');
    } catch (error) {
      console.error('sunspot verify failed:', error);
      return false;
    }
  }
}
