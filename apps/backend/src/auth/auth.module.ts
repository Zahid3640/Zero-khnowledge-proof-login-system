import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProofService } from './proof.service';
import { PoseidonCommitmentService } from './poseidon-commitment.service';
import { SolanaCommitmentService } from './solana-commitment.service';
import { SolanaZkVerifierService } from './solana-zk-verifier.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    ProofService,
    PoseidonCommitmentService,
    SolanaCommitmentService,
    SolanaZkVerifierService,
  ],
})
export class AuthModule {}
