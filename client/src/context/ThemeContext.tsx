import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserSettings } from '@/lib/api';

type ThemeContextType = {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default color if no settings are found
const DEFAULT_PRIMARY_COLOR = '#8B5CF6'; // Purple

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  
  // For demo purposes using a fixed userId. In a real app, this would come from authentication.
  const userId = 1;
  
  const { data: settings } = useQuery({
    queryKey: ['/api/user-settings', userId],
    queryFn: () => getUserSettings(userId),
  });
  
  // Update theme when settings are loaded
  useEffect(() => {
    if (settings?.uiColor) {
      setPrimaryColor(settings.uiColor);
      updateCssVariables(settings.uiColor);
    }
  }, [settings]);
  
  // Update CSS variables when primary color changes
  const updateCssVariables = (color: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    
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
    updateCssVariables(color);
  };
  
  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        setPrimaryColor: handlePrimaryColorChange,
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