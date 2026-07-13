import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';
import idl from '@/idl/face_auth.json';

const PROGRAM_ID = new PublicKey('42X4XP4LuW5jm2cCkZhib61iJx62dnw8AEEYJQzPhhJW');
const DEVNET_RPC = 'https://api.devnet.solana.com';

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction: anchor.Wallet['signTransaction'];
  signAllTransactions: anchor.Wallet['signAllTransactions'];
};

declare global {
  interface Window {
    solana?: PhantomProvider;
    Buffer?: typeof Buffer;
  }
}

function getPhantomProvider() {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  if (!window.Buffer) {
    window.Buffer = Buffer;
  }

  const provider = window.solana;

  if (!provider || !provider.isPhantom) {
    throw new Error('Phantom wallet not found. Please install Phantom.');
  }

  return provider;
}

async function getAnchorProgram() {
  const phantom = getPhantomProvider();

  const { publicKey } = await phantom.connect();

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  const wallet = {
    publicKey,
    signTransaction: phantom.signTransaction.bind(phantom),
    signAllTransactions: phantom.signAllTransactions.bind(phantom),
  } as unknown as anchor.Wallet;

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  anchor.setProvider(provider);

  const program = new anchor.Program(idl as anchor.Idl, provider);

  return {
    program,
    provider,
    walletPublicKey: publicKey,
  };
}

export async function registerFaceCommitmentHex(commitmentHex: string) {
  if (!commitmentHex.startsWith('0x') || commitmentHex.length !== 66) {
    throw new Error('Commitment hex must be 0x + 64 hex characters');
  }

  const { program, walletPublicKey } = await getAnchorProgram();

  const [userFacePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user-face-v2'), walletPublicKey.toBuffer()],
    PROGRAM_ID,
  );

  const tx = await program.methods
    .registerCommitmentHex(commitmentHex)
    .accounts({
      userFace: userFacePda,
      owner: walletPublicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return {
    tx,
    wallet: walletPublicKey.toBase58(),
    userFacePda: userFacePda.toBase58(),
  };
}

export async function updateFaceCommitmentHex(commitmentHex: string) {
  if (!commitmentHex.startsWith('0x') || commitmentHex.length !== 66) {
    throw new Error('Commitment hex must be 0x + 64 hex characters');
  }

  const { program, walletPublicKey } = await getAnchorProgram();

  const [userFacePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user-face-v2'), walletPublicKey.toBuffer()],
    PROGRAM_ID,
  );

  const tx = await program.methods
    .updateCommitmentHex(commitmentHex)
    .accounts({
      userFace: userFacePda,
      owner: walletPublicKey,
    })
    .rpc();

  return {
    tx,
    wallet: walletPublicKey.toBase58(),
    userFacePda: userFacePda.toBase58(),
  };
}
