import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { ProofService } from './proof.service';

type VerifyProofInput = {
  wallet: string;
  registeredEmbedding?: number[];
  currentEmbedding?: number[];
  threshold?: number;
};

@Injectable()
export class AuthService {
  private readonly nonceStore = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly proofService: ProofService,
  ) {}

  createNonce(wallet: string) {
    const nonce = randomBytes(16).toString('hex');

    this.nonceStore.set(wallet, nonce);

    return {
      wallet,
      nonce,
      message: `Login to ZK Face Login with nonce: ${nonce}`,
    };
  }

  async verifyProofAndLogin(input: VerifyProofInput) {
    const savedNonce = this.nonceStore.get(input.wallet);

    if (!savedNonce) {
      throw new UnauthorizedException('Nonce not found or expired');
    }

    let verified = false;
    let circuitDebug: unknown = null;

    if (
      input.registeredEmbedding &&
      input.currentEmbedding &&
      typeof input.threshold === 'number'
    ) {
      const result = await this.proofService.generateAndVerifyProof({
        wallet: input.wallet,
        registeredEmbedding: input.registeredEmbedding,
        currentEmbedding: input.currentEmbedding,
        threshold: input.threshold,
        nonce: savedNonce,
      });

      verified = result.verified;
      circuitDebug = result.circuitDebug;
    } else {
      verified = await this.proofService.verifyExistingProof();
    }

    if (!verified) {
      throw new UnauthorizedException('Invalid ZK proof');
    }

    this.nonceStore.delete(input.wallet);

    const token = await this.jwtService.signAsync({
      sub: input.wallet,
      wallet: input.wallet,
      authMethod: 'zk-face-proof',
    });

    return {
      success: true,
      wallet: input.wallet,
      accessToken: token,
      circuitDebug,
      proof: {
        verified,
        circuitDebug,
      },
    };
  }
}
