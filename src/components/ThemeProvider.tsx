import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { withLDConsumer, useLDClient } from 'launchdarkly-react-client-sdk';
import { LDFlagSet } from 'launchdarkly-js-client-sdk';
import { generateThemeVariables, getPrimaryColor } from '../lib/theme';

// Create theme context
interface ThemeContextType {
  primaryColor: string;
  applyThemeClass: (variant?: string) => string;
}

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: 'blue',
  applyThemeClass: () => 'bg-blue-600 hover:bg-blue-700',
});

// Hook to use theme
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  flags?: LDFlagSet;
}

const ThemeProviderComponent: React.FC<ThemeProviderProps> = ({ children, flags = {} }) => {
  const ldClient = useLDClient();
  
  // Use state to track primaryColor and themeVars so component re-renders when flags change
  const [primaryColor, setPrimaryColor] = useState(() => getPrimaryColor(flags));
  const [themeVars, setThemeVars] = useState(() => generateThemeVariables(flags));
  
  // Flag changes callback
  const updateThemeFromClient = useCallback(() => {
    if (!ldClient) return;
    
    // Collect all current flags from client
    const allFlags = ldClient.allFlags();
    console.log("ThemeProvider: Direct flag values from client", allFlags);
    
    // Update theme based on current flags
    const newPrimaryColor = getPrimaryColor(allFlags);
    setPrimaryColor(newPrimaryColor);
    setThemeVars(generateThemeVariables(allFlags));
  }, [ldClient]);
  
  // Set up flag change listener
  useEffect(() => {
    if (!ldClient) return;
    
    // Initial update
    updateThemeFromClient();
    
    // Listen for flag changes
    ldClient.on('change', updateThemeFromClient);
    
    // Clean up
    return () => {
      ldClient.off('change', updateThemeFromClient);
    };
  }, [ldClient, updateThemeFromClient]);
  
  // Fallback: Update theme when props flags change
  useEffect(() => {
    const newPrimaryColor = getPrimaryColor(flags);
    setPrimaryColor(newPrimaryColor);
    setThemeVars(generateThemeVariables(flags));
  }, [flags]);
  
  // Function to apply theme classes
  const applyThemeClass = (variant: string = '600'): string => {
    if (primaryColor.startsWith('#')) {
      // If using hex code, we need to use style directly
      return 'custom-primary-bg';
    }
    
    return `bg-${primaryColor}-${variant} hover:bg-${primaryColor}-700`;
  };
  
  return (
    <ThemeContext.Provider value={{ primaryColor, applyThemeClass }}>
      <div style={themeVars as React.CSSProperties}>
        {children}
      </div>
      {/* Add custom CSS for hex color support */}
      {primaryColor.startsWith('#') && (
        <style>
          {`
            .custom-primary-bg {
              background-color: var(--color-primary);
            }
            .custom-primary-bg:hover {
              background-color: var(--color-primary-hover);
            }
            .custom-primary-text {
              color: var(--color-primary);
            }
          `}
        </style>
      )}
    </ThemeContext.Provider>
  );
};

export const ThemeProvider = withLDConsumer()(ThemeProviderComponent); 