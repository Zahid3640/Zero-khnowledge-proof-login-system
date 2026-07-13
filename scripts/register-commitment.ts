import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";

async function main() {
  process.env.ANCHOR_PROVIDER_URL ||= "https://api.devnet.solana.com";
  process.env.ANCHOR_WALLET ||= `${process.env.HOME}/.config/solana/id.json`;

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("target/idl/face_auth.json", "utf8"));

  const programId = new PublicKey("42X4XP4LuW5jm2cCkZhib61iJx62dnw8AEEYJQzPhhJW");
  const program = new anchor.Program(idl, provider);

  const owner = provider.wallet.publicKey;

  const [userFacePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user-face"), owner.toBuffer()],
    programId
  );

  const commitment = Array.from(Buffer.alloc(32, 7));

  console.log("Network: Devnet");
  console.log("Owner:", owner.toBase58());
  console.log("Program ID:", programId.toBase58());
  console.log("UserFace PDA:", userFacePda.toBase58());
  console.log("Commitment:", commitment);

  const tx = await program.methods
    .registerCommitment(commitment)
    .accounts({
      userFace: userFacePda,
      owner,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Register commitment tx:", tx);

  const account = await program.account.userFaceAccount.fetch(userFacePda);

  console.log("Stored user face account:");
  console.log({
    owner: account.owner.toBase58(),
    commitment: Array.from(account.commitment),
    isActive: account.isActive,
    createdAt: account.createdAt.toString(),
    updatedAt: account.updatedAt.toString(),
    bump: account.bump,
  });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
