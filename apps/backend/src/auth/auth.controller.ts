import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PoseidonCommitmentService } from './poseidon-commitment.service';
import { SolanaCommitmentService } from './solana-commitment.service';

type VerifyProofDto = {
  wallet: string;
  registeredEmbedding?: number[];
  currentEmbedding?: number[];
  threshold?: number;
};

type PoseidonCommitmentDto = {
  embedding: number[];
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly poseidonCommitmentService: PoseidonCommitmentService,
    private readonly solanaCommitmentService: SolanaCommitmentService,
  ) {}

  @Get('nonce/:wallet')
  createNonce(@Param('wallet') wallet: string) {
    return this.authService.createNonce(wallet);
  }

  @Get('commitment/:wallet')
  async getCommitment(@Param('wallet') wallet: string) {
    return this.solanaCommitmentService.getCommitmentHex(wallet);
  }

  @Post('verify')
  async verifyProof(@Body() body: VerifyProofDto) {
    return this.authService.verifyProofAndLogin(body);
  }

  @Post('poseidon-commitment')
  async createPoseidonCommitment(@Body() body: PoseidonCommitmentDto) {
    return this.poseidonCommitmentService.generateCommitment(body.embedding);
  }
}
