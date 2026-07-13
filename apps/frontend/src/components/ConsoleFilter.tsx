'use client';

import { useEffect } from 'react';

export default function ConsoleFilter() {
  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      const message = args.map(String).join(' ');

      if (
        message.includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
        message.includes('XNNPACK delegate')
      ) {
        return;
      }

      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
