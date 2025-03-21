
import { useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/context/ThemeContext';

interface AudioVisualizerProps {
  audioLevel: number;
  color?: string;
}

export default function AudioVisualizer({ audioLevel, color }: AudioVisualizerProps) {
  const { primaryColor, highContrastMode } = useTheme();
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

    // Use high contrast color if in high contrast mode, otherwise use theme color
    let visualizerColor = color || primaryColor || '#8B5CF6';
    
    // In high contrast mode, we always use bright yellow for better visibility
    if (highContrastMode) {
      visualizerColor = '#FFFF00';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
    }
    
    ctx.fillStyle = visualizerColor;
    
    for (let i = 0; i < barCount; i++) {
      // Make visualizer more responsive in high contrast mode
      const randomFactor = highContrastMode ? 0.3 : 0.5;
      const barHeight = height * normalizedLevel * (0.5 + Math.random() * randomFactor);
      
      // Left side bars
      ctx.fillRect(i * barWidth * 2, height - barHeight, barWidth, barHeight);
      if (highContrastMode) {
        ctx.strokeRect(i * barWidth * 2, height - barHeight, barWidth, barHeight);
      }
      
      // Right side bars
      ctx.fillRect(canvas.width - (i * barWidth * 2) - barWidth, height - barHeight, barWidth, barHeight);
      if (highContrastMode) {
        ctx.strokeRect(canvas.width - (i * barWidth * 2) - barWidth, height - barHeight, barWidth, barHeight);
      }
    }
  }, [audioLevel, color, isMobile, primaryColor, highContrastMode]);

  return (
    <div className={`rounded-md ${highContrastMode ? 'border border-white p-1' : ''}`}>
      <canvas
        ref={canvasRef}
        width={300}
        height={isMobile ? 40 : 50}
        className="w-full h-full rounded-md"
        aria-label="Audio visualization showing audio levels"
        role="img"
      />
    </div>
  );
}
