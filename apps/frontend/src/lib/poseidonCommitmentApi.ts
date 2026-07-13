export type PoseidonCommitmentResult = {
  embeddingSize: number;
  embedding: number[];
  commitmentHex: string;
  commitmentBytes: number[];
};

export async function createPoseidonCommitmentFromBackend(
  embedding: number[],
): Promise<PoseidonCommitmentResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const response = await fetch(`${apiUrl}/auth/poseidon-commitment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embedding }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create Poseidon commitment');
  }

  if (!Array.isArray(data.commitmentBytes) || data.commitmentBytes.length !== 32) {
    throw new Error('Backend returned invalid Poseidon commitment bytes');
  }

  return data;
}
