import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

const EMBEDDING_SIZE = 24;

@Injectable()
export class PoseidonCommitmentService {
  private getCircuitPath() {
    return path.resolve(process.cwd(), '../../circuits/poseidon-commitment');
  }

  private toCircuitEmbedding(values: number[]) {
    if (!Array.isArray(values) || values.length < EMBEDDING_SIZE) {
      throw new Error(`Embedding must contain at least ${EMBEDDING_SIZE} numbers`);
    }

    return values
      .slice(0, EMBEDDING_SIZE)
      .map((value) => Math.abs(Math.round(value)));
  }

  private formatNoirArray(values: number[]) {
    return values.map((value) => `"${value}"`).join(', ');
  }

  private fieldHexToBytes(hex: string) {
    const clean = hex.replace(/^0x/, '').padStart(64, '0');

    if (clean.length !== 64) {
      throw new Error(`Invalid Poseidon field hex length: ${clean.length}`);
    }

    return Array.from(Buffer.from(clean, 'hex'));
  }

  async generateCommitment(embeddingInput: number[]) {
    const circuitPath = this.getCircuitPath();
    const embedding = this.toCircuitEmbedding(embeddingInput);

    const proverToml = `embedding = [${this.formatNoirArray(embedding)}]
`;

    fs.writeFileSync(path.join(circuitPath, 'Prover.toml'), proverToml);

    const targetPath = path.join(circuitPath, 'target');

    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, {
        recursive: true,
        force: true,
      });
    }

    await execFileAsync('nargo', ['compile'], {
      cwd: circuitPath,
    });

    const { stdout, stderr } = await execFileAsync('nargo', ['execute'], {
      cwd: circuitPath,
    });

    const output = `${stdout}\n${stderr}`;

    const match = output.match(/Circuit output:\s*(0x[a-fA-F0-9]+)/);

    if (!match) {
      throw new Error(`Could not read Poseidon commitment from nargo output: ${output}`);
    }

    const commitmentHex = match[1];
    const commitmentBytes = this.fieldHexToBytes(commitmentHex);

    return {
      embeddingSize: EMBEDDING_SIZE,
      embedding,
      commitmentHex,
      commitmentBytes,
    };
  }
}
