import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserSettings } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

type ThemeContextType = {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  highContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default color if no settings are found
const DEFAULT_PRIMARY_COLOR = '#8B5CF6'; // Purple

// High contrast colors - these provide better accessibility
const HIGH_CONTRAST_COLORS = {
  background: '#000000',
  foreground: '#FFFFFF',
  primary: '#FFFF00', // Yellow is high visibility
  border: '#FFFFFF',
  muted: '#505050',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [highContrastMode, setHighContrastMode] = useState(false);
  
  // Get the authenticated user
  const { user } = useAuth();
  
  const { data: settings } = useQuery({
    queryKey: ['/api/user-settings', user?.id],
    queryFn: () => user ? getUserSettings(user.id) : Promise.reject('No authenticated user'),
    enabled: !!user, // Only run the query if we have a user
  });
  
  // Update theme when settings are loaded
  useEffect(() => {
    if (settings) {
      setPrimaryColor(settings.uiColor || DEFAULT_PRIMARY_COLOR);
      setHighContrastMode(settings.highContrastMode || false);
      
      // Apply the appropriate theme
      if (settings.highContrastMode) {
        applyHighContrastMode();
      } else {
        updateCssVariables(settings.uiColor || DEFAULT_PRIMARY_COLOR);
      }
    }
  }, [settings]);
  
  // Apply high contrast mode
  const applyHighContrastMode = () => {
    const root = document.documentElement;
    
    // Set high contrast colors
    root.style.setProperty('--background', HIGH_CONTRAST_COLORS.background);
    root.style.setProperty('--foreground', HIGH_CONTRAST_COLORS.foreground);
    root.style.setProperty('--primary', HIGH_CONTRAST_COLORS.primary);
    root.style.setProperty('--primary-foreground', '#000000'); // Black text on yellow for max contrast
    root.style.setProperty('--border', HIGH_CONTRAST_COLORS.border);
    root.style.setProperty('--muted', HIGH_CONTRAST_COLORS.muted);
    root.style.setProperty('--muted-foreground', HIGH_CONTRAST_COLORS.foreground);
    
    // Increase text size and contrast
    root.style.setProperty('--font-size-base', '1.05rem');
    root.style.setProperty('--letter-spacing', '0.025em');
    
    // Add a high-contrast class to the body for additional CSS targeting
    document.body.classList.add('high-contrast');
    
    // Update theme.json
    const themeData = {
      primary: HIGH_CONTRAST_COLORS.primary,
      variant: "high-contrast",
      appearance: "dark",
      radius: 0.25 // Smaller radius for clearer outlines
    };
    
    localStorage.setItem('theme', JSON.stringify(themeData));
  };
  
  // Update CSS variables when primary color changes
  const updateCssVariables = (color: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    
    // Remove high contrast class if it exists
    document.body.classList.remove('high-contrast');
    
    // Create variations of the primary color (lighter and darker shades)
    // These are approximations - a proper color library would be better for production
    const lightenColor = (color: string, percent: number): string => {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      
      return '#' + (
        0x1000000 + 
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      ).toString(16).slice(1);
    };
    
    // Set foreground text color based on primary
    root.style.setProperty('--primary-foreground', '#ffffff');
    
    // Reset font size and spacing
    root.style.setProperty('--font-size-base', '1rem');
    root.style.setProperty('--letter-spacing', 'normal');
    
    // Create a scale of shades
    root.style.setProperty('--primary-50', lightenColor(color, 90));
    root.style.setProperty('--primary-100', lightenColor(color, 80));
    root.style.setProperty('--primary-200', lightenColor(color, 60));
    root.style.setProperty('--primary-300', lightenColor(color, 40));
    root.style.setProperty('--primary-400', lightenColor(color, 20));
    root.style.setProperty('--primary-500', color);
    root.style.setProperty('--primary-600', lightenColor(color, -20));
    root.style.setProperty('--primary-700', lightenColor(color, -40));
    root.style.setProperty('--primary-800', lightenColor(color, -60));
    root.style.setProperty('--primary-900', lightenColor(color, -80));
    
    // Update theme.json
    const themeData = {
      primary: color,
      variant: "vibrant",
      appearance: "dark",
      radius: 0.5
    };
    
    // In a real app, this would be persisted to the server
    localStorage.setItem('theme', JSON.stringify(themeData));
  };
  
  const handlePrimaryColorChange = (color: string) => {
    setPrimaryColor(color);
    
    if (!highContrastMode) {
      updateCssVariables(color);
    }
  };
  
  const handleHighContrastModeChange = (enabled: boolean) => {
    setHighContrastMode(enabled);
    
    if (enabled) {
      applyHighContrastMode();
    } else {
      updateCssVariables(primaryColor);
    }
  };
  
  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        setPrimaryColor: handlePrimaryColorChange,
        highContrastMode,
        setHighContrastMode: handleHighContrastModeChange,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}