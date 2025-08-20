import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  value?: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ value, size = 256, className }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).catch((error) => {
      console.error('QR Code generation failed:', error);
    });
  }, [value, size]);

  if (!value) {
    return (
      <div 
        className={cn("bg-white rounded-xl p-4 flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        data-testid="qr-code-placeholder"
      >
        <div className="text-slate-500 text-center">
          <div className="text-2xl mb-2">📱</div>
          <div className="text-sm">QR Code</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl p-4", className)} data-testid="qr-code-canvas">
      <canvas ref={canvasRef} />
    </div>
  );
}
