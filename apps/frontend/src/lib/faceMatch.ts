export function squaredDistance(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error(`Embedding length mismatch: ${a.length} != ${b.length}`);
  }

  return a.reduce((sum, value, index) => {
    const diff = value - b[index];
    return sum + diff * diff;
  }, 0);
}

export function getStoredRegisteredEmbedding() {
  const raw = localStorage.getItem('zk_face_registered_embedding');

  if (!raw) {
    throw new Error('No registered face embedding found. Please register your face first.');
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Stored registered embedding is invalid.');
  }

  return parsed.map(Number);
}

export function getStoredRegisteredWallet() {
  return localStorage.getItem('zk_face_registered_wallet') || '';
}
