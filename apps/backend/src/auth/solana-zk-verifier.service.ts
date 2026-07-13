import { Injectable } from '@nestjs/common';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SolanaZkVerifierService {
  private readonly rpcUrl =
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  private readonly verifierProgramId = new PublicKey(
    process.env.SOLANA_ZK_VERIFIER_PROGRAM_ID ||
      'FpjGHeB9K7ddMpk9q4uRfXPGTEHLy2yfH4Zw8aYFFxEG',
  );

  private readonly walletPath =
    process.env.SOLANA_BACKEND_WALLET_PATH ||
    path.join(process.env.HOME || '', '.config/solana/id.json');

  private loadBackendKeypair(): Keypair {
    if (!fs.existsSync(this.walletPath)) {
      throw new Error(`Backend Solana wallet not found: ${this.walletPath}`);
    }

    const secret = JSON.parse(fs.readFileSync(this.walletPath, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }

  async verifyProofOnChain(params: {
    proofPath: string;
    publicWitnessPath: string;
  }): Promise<{
    signature: string;
    verifierProgramId: string;
    proofSize: number;
    publicWitnessSize: number;
    instructionDataSize: number;
  }> {
    const proofPath = path.resolve(params.proofPath);
    const publicWitnessPath = path.resolve(params.publicWitnessPath);

    if (!fs.existsSync(proofPath)) {
      throw new Error(`Proof file not found: ${proofPath}`);
    }

    if (!fs.existsSync(publicWitnessPath)) {
      throw new Error(`Public witness file not found: ${publicWitnessPath}`);
    }

    const proof = fs.readFileSync(proofPath);
    const publicWitness = fs.readFileSync(publicWitnessPath);
    const instructionData = Buffer.concat([proof, publicWitness]);

    const connection = new Connection(this.rpcUrl, 'confirmed');
    const payer = this.loadBackendKeypair();

    const verifyInstruction = new TransactionInstruction({
      programId: this.verifierProgramId,
      keys: [],
      data: instructionData,
    });

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_000_000,
      }),
      verifyInstruction,
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: 'confirmed',
    });

    return {
      signature,
      verifierProgramId: this.verifierProgramId.toBase58(),
      proofSize: proof.length,
      publicWitnessSize: publicWitness.length,
      instructionDataSize: instructionData.length,
    };
  }
}
