'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw } from 'lucide-react';

export default function CameraCapture({
  onCapture,
  onSkip,
  showSkip = true,
}: {
  onCapture: (photoBase64: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flash, setFlash] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async (facing: 'user' | 'environment') => {
      try {
        setCameraReady(false);
        // Stop previous stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError('Camera access denied or not available');
          console.error('Camera error:', err);
        }
      }
    };

    startCamera(facingMode);

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onCapture(dataUrl);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="space-y-4">
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
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            {/* Face guide overlay - oval outline */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 rounded-[50%] border-2 border-white/30 border-dashed" />
              </div>
            )}
          </>
        )}
        {flash && <div className="absolute inset-0 bg-white camera-flash pointer-events-none" />}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={capture}
          className="flex-1 h-14 rounded-xl text-base font-semibold"
          disabled={!!error || !cameraReady}
        >
          <Camera className="h-5 w-5 mr-2" />
          Capture
        </Button>
        <Button
          variant="outline"
          onClick={toggleCamera}
          className="h-14 px-4 rounded-xl"
          disabled={!!error}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        {showSkip && onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="h-14 px-4 rounded-xl"
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
