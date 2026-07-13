import { Injectable } from '@nestjs/common';
import * as anchor from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const PROGRAM_ID = new PublicKey('42X4XP4LuW5jm2cCkZhib61iJx62dnw8AEEYJQzPhhJW');
const DEVNET_RPC = 'https://api.devnet.solana.com';

type AnySolanaTransaction = Transaction | VersionedTransaction;

type UserFaceHexAccount = {
  owner: PublicKey;
  commitmentHex: string;
  isActive: boolean;
  createdAt: anchor.BN;
  updatedAt: anchor.BN;
  bump: number;
};

type FaceAuthAccountNamespace = {
  userFaceHexAccount: {
    fetch: (address: PublicKey) => Promise<UserFaceHexAccount>;
  };
};

@Injectable()
export class SolanaCommitmentService {
  private getProgram() {
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    const payer = Keypair.generate();

    const dummyWallet: anchor.Wallet = {
      payer,
      publicKey: payer.publicKey,

      signTransaction: async <T extends AnySolanaTransaction>(
        tx: T,
      ): Promise<T> => {
        return tx;
      },

      signAllTransactions: async <T extends AnySolanaTransaction>(
        txs: T[],
      ): Promise<T[]> => {
        return txs;
      },
    };

    const provider = new anchor.AnchorProvider(connection, dummyWallet, {
      commitment: 'confirmed',
    });

    const idlPath = path.resolve(
      process.cwd(),
      '../../target/idl/face_auth.json',
    );

    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

    return new anchor.Program(idl as anchor.Idl, provider);
  }

  getUserFaceV2Pda(wallet: string) {
    const owner = new PublicKey(wallet);

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('user-face-v2'), owner.toBuffer()],
      PROGRAM_ID,
    );

    return pda;
  }

  async getCommitmentHex(wallet: string) {
    const program = this.getProgram();
    const userFacePda = this.getUserFaceV2Pda(wallet);

    const accounts = program.account as unknown as FaceAuthAccountNamespace;

    if (!accounts.userFaceHexAccount) {
      throw new Error(
        'userFaceHexAccount not found in IDL. Run anchor build, copy latest IDL, and restart backend.',
      );
    }

    const account = await accounts.userFaceHexAccount.fetch(userFacePda);

    const commitmentHex = String(account.commitmentHex);

    if (!commitmentHex.startsWith('0x') || commitmentHex.length !== 66) {
      throw new Error(`Invalid on-chain commitment_hex: ${commitmentHex}`);
    }

    if (!account.isActive) {
      throw new Error('On-chain face commitment is inactive');
    }

    return {
      wallet,
      userFacePda: userFacePda.toBase58(),
      commitmentHex,
      isActive: Boolean(account.isActive),
      createdAt: account.createdAt.toString(),
      updatedAt: account.updatedAt.toString(),
    };
  }
}
