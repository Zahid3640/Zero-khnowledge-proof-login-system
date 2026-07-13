'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FaceCapture.module.css';

type FaceCaptureProps = {
  onCapture: (imageDataUrl: string) => void | Promise<void>;
};

export default function FaceCapture({ onCapture }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImage, setCapturedImage] = useState('');
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [status, setStatus] = useState('');

  async function startCamera() {
    try {
      setStatus('Starting camera...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCapturedImage('');
      setIsCameraRunning(true);
      setStatus('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraRunning(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function captureFace() {
    const video = videoRef.current;

    if (!video) {
      setStatus('Camera not ready');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext('2d');

    if (!context) {
      setStatus('Could not create image context');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/png');

    setCapturedImage(imageDataUrl);
    setStatus('Face captured successfully');

    stopCamera();

    await onCapture(imageDataUrl);
  }

  function retake() {
    setCapturedImage('');
    setStatus('');
    void startCamera();
  }

  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.viewer}>
        {capturedImage ? (
          <img
            className={styles.media}
            src={capturedImage}
            alt="Captured face"
          />
        ) : (
          <video
            ref={videoRef}
            className={styles.media}
            playsInline
            muted
            autoPlay
          />
        )}

        <div className={styles.scanOverlay}>
          <div className={styles.cornerTopLeft} />
          <div className={styles.cornerTopRight} />
          <div className={styles.cornerBottomLeft} />
          <div className={styles.cornerBottomRight} />
        </div>

        <div className={styles.liveBadge}>
          {capturedImage ? 'Captured Frame' : isCameraRunning ? 'Live Camera' : 'Camera Stopped'}
        </div>
      </div>

      {status ? <div className={styles.status}>{status}</div> : null}

      <div className={styles.actions}>
        {!capturedImage ? (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={captureFace}
              disabled={!isCameraRunning}
            >
              Capture Face
            </button>

            <button
              type="button"
              className={styles.secondary}
              onClick={isCameraRunning ? stopCamera : startCamera}
            >
              {isCameraRunning ? 'Stop Camera' : 'Start Camera'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={retake}
            >
              Retake Face
            </button>

            <button
              type="button"
              className={styles.secondary}
              onClick={() => void onCapture(capturedImage)}
            >
              Use This Frame
            </button>
          </>
        )}
      </div>
    </div>
  );
}
