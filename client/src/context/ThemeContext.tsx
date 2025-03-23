import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getUserSettings, updateUserSettings } from '@/lib/api';
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
  // Function to get cached settings from localStorage
  const getCachedSettings = () => {
    try {
      const themeCache = localStorage.getItem('traxx_theme_cache');
      if (themeCache) {
        return JSON.parse(themeCache);
      }
    } catch (e) {
      console.error("Error parsing cached theme settings:", e);
    }
    return null;
  };
  
  // Function to safely update the cache
  const updateThemeCache = (updates: {uiColor?: string; highContrastMode?: boolean}) => {
    try {
      const currentCache = getCachedSettings() || {};
      const updatedCache = { ...currentCache, ...updates };
      localStorage.setItem('traxx_theme_cache', JSON.stringify(updatedCache));
      console.log("Theme cache updated:", updatedCache);
    } catch (e) {
      console.error("Error updating theme cache:", e);
    }
  };
  
  // Get initial cached settings
  const cachedSettings = getCachedSettings();
  console.log("Initial cached settings:", cachedSettings);
  
  // Initialize with cached values if available, otherwise use defaults
  const [primaryColor, setPrimaryColor] = useState(
    cachedSettings?.uiColor || DEFAULT_PRIMARY_COLOR
  );
  const [highContrastMode, setHighContrastMode] = useState(
    cachedSettings?.highContrastMode || false
  );
  
  // Get the authenticated user
  const { user } = useAuth();
  
  const { data: settings } = useQuery({
    queryKey: ['/api/user-settings', user?.id],
    queryFn: () => user ? getUserSettings(user.id) : Promise.reject('No authenticated user'),
    enabled: !!user, // Only run the query if we have a user
  });
  
  // Mutation to update user settings in the database
  const updateSettingsMutation = useMutation({
    mutationFn: (data: { uiColor?: string; highContrastMode?: boolean }) => {
      if (!user) return Promise.reject('No authenticated user');
      console.log("ThemeContext: Saving user settings to database:", data);
      return updateUserSettings(user.id, data);
    },
    onSuccess: (updatedSettings) => {
      console.log("ThemeContext: Successfully updated user settings in database:", updatedSettings);
    },
    onError: (error) => {
      console.error("ThemeContext: Failed to update user settings in database:", error);
    }
  });
  
  // Apply cached theme on initial load
  useEffect(() => {
    console.log("Applying initial theme from cache:", highContrastMode, primaryColor);
    if (highContrastMode) {
      applyHighContrastMode();
    } else {
      updateCssVariables(primaryColor);
    }
  }, []);
  
  // Update theme when settings are loaded from server
  useEffect(() => {
    if (settings) {
      console.log("Settings loaded from server:", settings);
      
      // Only update if different to avoid loops
      if (settings.uiColor !== primaryColor || settings.highContrastMode !== highContrastMode) {
        console.log("Applying theme from server settings");
        setPrimaryColor(settings.uiColor || DEFAULT_PRIMARY_COLOR);
        setHighContrastMode(settings.highContrastMode || false);
        
        // Update our cache with server settings
        updateThemeCache({
          uiColor: settings.uiColor || DEFAULT_PRIMARY_COLOR,
          highContrastMode: settings.highContrastMode || false
        });
        
        // Apply the appropriate theme
        if (settings.highContrastMode) {
          applyHighContrastMode();
        } else {
          updateCssVariables(settings.uiColor || DEFAULT_PRIMARY_COLOR);
        }
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
    
    // Set focus and accent colors
    root.style.setProperty('--ring', HIGH_CONTRAST_COLORS.primary);
    root.style.setProperty('--focus', HIGH_CONTRAST_COLORS.primary);
    root.style.setProperty('--accent', HIGH_CONTRAST_COLORS.primary);
    root.style.setProperty('--accent-foreground', '#000000');
    
    // Set additional shade variables
    root.style.setProperty('--primary-50', '#FFFFCC');  // Very light yellow
    root.style.setProperty('--primary-900', '#DDDD00');  // Dark yellow
    
    // Apply to gradients - in high contrast we prefer solid colors
    root.style.setProperty('--gradient-from', HIGH_CONTRAST_COLORS.primary);
    root.style.setProperty('--gradient-to', HIGH_CONTRAST_COLORS.primary);
    
    // Increase text size and contrast
    root.style.setProperty('--font-size-base', '1.05rem');
    root.style.setProperty('--letter-spacing', '0.025em');
    
    // Increase border widths for better visibility
    root.style.setProperty('--border-width', '2px');
    
    // Remove custom theme class if it exists
    document.body.classList.remove('custom-theme');
    
    // Add a high-contrast class to the body for additional CSS targeting
    document.body.classList.add('high-contrast');
    document.body.classList.add('custom-theme');  // Keep the custom-theme class to maintain styling
    
    // Update theme.json
    const themeData = {
      primary: HIGH_CONTRAST_COLORS.primary,
      variant: "high-contrast",
      appearance: "dark",
      radius: 0.25 // Smaller radius for clearer outlines
    };
    
    localStorage.setItem('theme', JSON.stringify(themeData));
    console.log("High contrast mode applied with primary color:", HIGH_CONTRAST_COLORS.primary);
  };
  
  // Update CSS variables when primary color changes
  const updateCssVariables = (color: string) => {
    const root = document.documentElement;
    
    // Remove high contrast class if it exists
    document.body.classList.remove('high-contrast');
    
    // Create variations of the primary color (lighter and darker shades)
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
    
    // Calculate if the color is light or dark to determine appropriate foreground color
    const isLightColor = (color: string): boolean => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 155; // Threshold for determining light vs dark
    };
    
    // Set text color based on background brightness
    const textColor = isLightColor(color) ? '#000000' : '#ffffff';
    
    // Reset font size and spacing
    root.style.setProperty('--font-size-base', '1rem');
    root.style.setProperty('--letter-spacing', 'normal');
    
    // Set main color variables
    root.style.setProperty('--primary', color);
    root.style.setProperty('--primary-foreground', textColor);
    
    // Create a scale of shades for more comprehensive theming
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
    
    // Apply color to additional UI elements
    root.style.setProperty('--ring', color); // Focus rings
    root.style.setProperty('--border-hover', lightenColor(color, 20)); // Border hover state
    
    // Update accent colors to match the primary
    root.style.setProperty('--accent', lightenColor(color, -10));
    root.style.setProperty('--accent-foreground', textColor);
    
    // Apply to gradients
    const gradientTo = lightenColor(color, 30);
    const gradientFrom = lightenColor(color, -30);
    root.style.setProperty('--gradient-from', gradientFrom);
    root.style.setProperty('--gradient-to', gradientTo);
    
    // Apply to some element states
    root.style.setProperty('--focus-visible-ring', color);
    
    // Add a custom CSS class to the body to allow targeting specific elements
    document.body.classList.add('custom-theme');
    document.body.style.setProperty('--theme-color', color);
    
    // Update theme.json
    const themeData = {
      primary: color,
      variant: "vibrant",
      appearance: "dark",
      radius: 0.5
    };
    
    localStorage.setItem('theme', JSON.stringify(themeData));
    
    console.log("Theme updated with color:", color);
  };
  
  const handlePrimaryColorChange = (color: string) => {
    // Skip if the color hasn't changed
    if (color === primaryColor) return;
    
    setPrimaryColor(color);
    
    // Update localStorage cache with the current color
    updateThemeCache({ uiColor: color });
    console.log("Color changed to:", color);
    
    // Apply visual changes
    if (!highContrastMode) {
      updateCssVariables(color);
    }
    
    // Save to database if user is logged in
    if (user) {
      updateSettingsMutation.mutate({ 
        uiColor: color,
        highContrastMode // Keep existing high contrast value
      });
    }
  };
  
  const handleHighContrastModeChange = (enabled: boolean) => {
    // Skip if the value hasn't changed
    if (enabled === highContrastMode) return;
    
    setHighContrastMode(enabled);
    
    // Update localStorage cache with the current high contrast setting
    updateThemeCache({ highContrastMode: enabled });
    console.log("High contrast mode changed to:", enabled);
    
    // Apply visual changes
    if (enabled) {
      applyHighContrastMode();
    } else {
      updateCssVariables(primaryColor);
    }
    
    // Save to database if user is logged in
    if (user) {
      updateSettingsMutation.mutate({ 
        uiColor: primaryColor, // Keep existing color
        highContrastMode: enabled 
      });
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