'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function AutoCapture({
  onCaptured,
}: {
  onCaptured: (photoBase64: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'starting' | 'ready' | 'captured'>('starting');
  const [countdown, setCountdown] = useState(2);
  const capturedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) setStatus('ready');
          };
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError('Camera access denied');
          console.error('Camera error:', err);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capture = useCallback(() => {
    if (capturedRef.current || !videoRef.current || !canvasRef.current) return;
    capturedRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setStatus('captured');

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    onCaptured(dataUrl);
  }, [onCaptured]);

  // Auto-capture after countdown when camera is ready
  useEffect(() => {
    if (status !== 'ready') return;
    if (countdown <= 0) {
      const id = setTimeout(capture, 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, capture]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="text-white/80 text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            {/* Face guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-56 rounded-[50%] border-2 border-white/30 border-dashed" />
            </div>
          </>
        )}

        {/* Countdown overlay */}
        {status === 'ready' && countdown > 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{countdown}</span>
            </div>
          </div>
        )}

        {/* Captured flash */}
        {status === 'captured' && (
          <div className="absolute inset-0 bg-white camera-flash pointer-events-none" />
        )}

        {/* Scanning line after capture */}
        {status === 'captured' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-44 h-56 rounded-[50%] border-2 border-emerald-400 animate-pulse" />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Status text */}
      <div className="text-center">
        {status === 'starting' && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Camera starting...
          </p>
        )}
        {status === 'ready' && countdown > 0 && (
          <p className="text-sm font-semibold text-emerald-600">
            Photo in {countdown}... face frame mein rakhein
          </p>
        )}
        {status === 'captured' && (
          <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            Scanning face...
          </p>
        )}
      </div>
    </div>
  );
}
