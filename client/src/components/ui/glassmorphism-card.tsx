
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassmorphismCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glowEffect?: boolean;
  borderEffect?: boolean;
}

export function GlassmorphismCard({
  children,
  className,
  hoverEffect = true,
  glowEffect = false,
  borderEffect = false,
}: GlassmorphismCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl backdrop-blur-md bg-white/5 border border-white/10",
        hoverEffect && "transition-all duration-300 hover:translate-y-[-2px] hover:bg-white/10",
        glowEffect && "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-purple-500/20 before:to-pink-500/20 before:opacity-0 before:transition-opacity hover:before:opacity-100",
        borderEffect && "after:absolute after:inset-0 after:rounded-xl after:p-[1px] after:bg-gradient-to-br after:from-purple-500/50 after:to-pink-500/50 after:content-[''] after:opacity-0 hover:after:opacity-100 after:transition-opacity",
        className
      )}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
