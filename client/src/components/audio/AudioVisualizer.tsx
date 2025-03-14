
import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  color?: string;
}

export default function AudioVisualizer({ audioLevel, color = '#8B5CF6' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const barCount = 20;
    const barWidth = canvas.width / (barCount * 2);
    const height = canvas.height;

    ctx.fillStyle = color;
    
    for (let i = 0; i < barCount; i++) {
      // Create randomized bar heights based on audio level
      const barHeight = height * normalizedLevel * (0.5 + Math.random() * 0.5);
      
      // Draw mirrored bars
      ctx.fillRect(i * barWidth * 2, height - barHeight, barWidth, barHeight);
      ctx.fillRect(canvas.width - (i * barWidth * 2) - barWidth, height - barHeight, barWidth, barHeight);
    }
  }, [audioLevel, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={50}
      className="w-full h-full"
    />
  );
}
