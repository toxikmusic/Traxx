
import { useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AudioVisualizerProps {
  audioLevel: number;
  color?: string;
}

export default function AudioVisualizer({ audioLevel, color = '#8B5CF6' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Convert audio level (dB) to a visual height (0-1)
    const normalizedLevel = Math.min(Math.max((audioLevel + 60) / 60, 0), 1);
    
    // Draw visualization
    const barCount = isMobile ? 12 : 20; // Fewer bars on mobile
    const barWidth = canvas.width / (barCount * 2);
    const height = canvas.height;

    ctx.fillStyle = color;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = height * normalizedLevel * (0.5 + Math.random() * 0.5);
      ctx.fillRect(i * barWidth * 2, height - barHeight, barWidth, barHeight);
      ctx.fillRect(canvas.width - (i * barWidth * 2) - barWidth, height - barHeight, barWidth, barHeight);
    }
  }, [audioLevel, color, isMobile]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={isMobile ? 40 : 50}
      className="w-full h-full"
    />
  );
}
