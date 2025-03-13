
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CustomButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function CustomButton({
  children,
  className,
  variant = 'default',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  ...props
}: CustomButtonProps) {
  const sizeClasses = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  const variantClasses = {
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    outline: 'border border-primary hover:bg-primary/10 text-primary',
    ghost: 'hover:bg-primary/10 text-primary',
    gradient: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg',
  };

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      
      {variant === 'gradient' && (
        <span className="absolute inset-0 overflow-hidden rounded-md">
          <span className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-600/0 via-purple-600/30 to-purple-600/0 opacity-0 hover:opacity-100 animate-pulse" style={{ animationDuration: '3s' }}></span>
        </span>
      )}
    </button>
  );
}
