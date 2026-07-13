import fs from "fs";
import path from "path";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";

const PROGRAM_ID =
  process.env.PROGRAM_ID || "FpjGHeB9K7ddMpk9q4uRfXPGTEHLy2yfH4Zw8aYFFxEG";

const WALLET_PATH =
  process.env.WALLET_PATH ||
  path.join(process.env.HOME || "", ".config/solana/id.json");

const CIRCUIT_DIR = path.resolve("..");
const PROOF_PATH = path.join(CIRCUIT_DIR, "target/face_login.proof");
const PUBLIC_WITNESS_PATH = path.join(CIRCUIT_DIR, "target/face_login.pw");

function loadKeypair(filePath: string) {
  const secret = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function main() {
  console.log("Face Login - On-chain Groth16 Verification");
  console.log("");

  if (!fs.existsSync(PROOF_PATH)) {
    throw new Error(`Proof file not found: ${PROOF_PATH}`);
  }

  if (!fs.existsSync(PUBLIC_WITNESS_PATH)) {
    throw new Error(`Public witness file not found: ${PUBLIC_WITNESS_PATH}`);
  }

  if (!fs.existsSync(WALLET_PATH)) {
    throw new Error(`Wallet not found: ${WALLET_PATH}`);
  }

  const proof = fs.readFileSync(PROOF_PATH);
  const publicWitness = fs.readFileSync(PUBLIC_WITNESS_PATH);
  const instructionData = Buffer.concat([proof, publicWitness]);

  console.log(`Proof path: ${PROOF_PATH}`);
  console.log(`Public witness path: ${PUBLIC_WITNESS_PATH}`);
  console.log(`Proof size: ${proof.length} bytes`);
  console.log(`Public witness size: ${publicWitness.length} bytes`);
  console.log(`Instruction data size: ${instructionData.length} bytes`);
  console.log("");

  const connection = new Connection(RPC_URL, "confirmed");
  const payer = loadKeypair(WALLET_PATH);
  const programId = new PublicKey(PROGRAM_ID);

  console.log(`Wallet: ${payer.publicKey.toBase58()}`);
  console.log(`Verifier program: ${programId.toBase58()}`);
  console.log(`RPC: ${RPC_URL}`);

  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${balance / 1_000_000_000} SOL`);

  const verifyInstruction = new TransactionInstruction({
    programId,
    keys: [],
    data: instructionData,
  });

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_000_000,
    }),
    verifyInstruction,
  );

  console.log("");
  console.log("Sending on-chain verification transaction...");

  const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });

  console.log("");
  console.log("✅ Proof verified successfully on-chain!");
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

main().catch((err) => {
  console.error("");
  console.error("❌ On-chain verification failed");

  if (err && typeof err === "object" && "logs" in err) {
    const e = err as { logs: string[] };
    console.error("");
    console.error("Program logs:");
    e.logs.forEach((log) => console.error(`  ${log}`));
  } else if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }

  process.exit(1);
});
