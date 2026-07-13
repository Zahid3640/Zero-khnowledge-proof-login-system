import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;

const WASM_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

// Small MVP vector. Later we can increase this.
const SELECTED_LANDMARK_INDICES = [
  1,    // nose
  33,   // left eye outer
  263,  // right eye outer
  61,   // mouth left
  291,  // mouth right
  199,  // chin-ish
  10,   // forehead
  152,  // chin
];

async function getFaceLandmarker() {
  if (faceLandmarker) {
    return faceLandmarker;
  }

  const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
    numFaces: 1,
  });

  return faceLandmarker;
}

function loadImage(imageDataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load captured image'));

    image.src = imageDataUrl;
  });
}

function normalizeLandmarks(landmarks: NormalizedLandmark[]) {
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  const centerX = nose.x;
  const centerY = nose.y;
  const centerZ = nose.z ?? 0;

  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;

  const eyeDistance = Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy) || 1;

  return SELECTED_LANDMARK_INDICES.flatMap((index) => {
    const point = landmarks[index];

    return [
      (point.x - centerX) / eyeDistance,
      (point.y - centerY) / eyeDistance,
      ((point.z ?? 0) - centerZ) / eyeDistance,
    ];
  });
}

export function quantizeEmbedding(values: number[], scale = 10000) {
  return values.map((value) => Math.round(value * scale));
}

export async function generateFaceEmbeddingFromImage(imageDataUrl: string) {
  const landmarker = await getFaceLandmarker();
  const image = await loadImage(imageDataUrl);

  const result = landmarker.detect(image);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error('No face detected. Please capture a clear front-facing image.');
  }

  const landmarks = result.faceLandmarks[0];

  const normalizedEmbedding = normalizeLandmarks(landmarks);
  const quantizedEmbedding = quantizeEmbedding(normalizedEmbedding);

  return {
    faceCount: result.faceLandmarks.length,
    landmarkCount: landmarks.length,
    normalizedEmbedding,
    quantizedEmbedding,
  };
}

function int32ToBytes(value: number): number[] {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);

  view.setInt32(0, value, false);

  return Array.from(new Uint8Array(buffer));
}

export async function createCommitmentFromEmbedding(embedding: number[]) {
  const bytes = embedding.flatMap((value) => int32ToBytes(value));

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new Uint8Array(bytes),
  );

  const commitmentBytes = Array.from(new Uint8Array(digest));

  const commitmentHex =
    '0x' +
    commitmentBytes
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

  return {
    commitmentBytes,
    commitmentHex,
  };
}

export function createNoirCommitmentFromEmbedding(embedding: number[]) {
  const values = embedding.slice(0, 24).map((value) => Math.abs(Math.round(value)));

  if (values.length !== 24) {
    throw new Error('Embedding must contain 24 values');
  }

  const commitmentU64 = values.reduce((acc, value, index) => {
    return acc + value * (index + 11);
  }, 0);

  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);

  // Store commitment as big-endian u64 in the last 8 bytes.
  // First 24 bytes remain zero.
  const big = BigInt(commitmentU64);

  view.setBigUint64(24, big, false);

  const commitmentBytes = Array.from(new Uint8Array(buffer));

  const commitmentHex =
    '0x' +
    commitmentBytes
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

  return {
    commitmentU64,
    commitmentBytes,
    commitmentHex,
  };
}
