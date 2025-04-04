import { LDFlagSet } from 'launchdarkly-react-client-sdk';

// Default branding colors
export const defaultTheme = {
  primary: 'blue',
  secondary: 'gray',
  accent: 'indigo',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'sky',
};

// Color variations available
export const colorOptions = [
  'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 
  'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 
  'cyan', 'sky', 'violet'
];

// Get primary color from LaunchDarkly flags or use default
export const getPrimaryColor = (flags?: LDFlagSet): string => {
  if (!flags) return defaultTheme.primary;
  
  // Check for custom primary color flag
  const primaryColor = flags['brand-primary-color'];
  
  if (typeof primaryColor === 'string') {
    // If hex code is provided (e.g. #3b82f6)
    if (primaryColor.startsWith('#')) {
      return primaryColor;
    }
    
    // If tailwind color name is provided (e.g. 'indigo')
    if (colorOptions.includes(primaryColor)) {
      return primaryColor;
    }
  }
  
  return defaultTheme.primary;
};

// Get a CSS variable compatible version of the color
export const getColorVariable = (color: string): string => {
  if (color.startsWith('#')) {
    return color; // Already a hex code
  }
  
  // Approximate Tailwind color values for the 500 shade (default)
  const tailwindColors: Record<string, string> = {
    blue: '#3b82f6',
    indigo: '#6366f1',
    purple: '#8b5cf6',
    pink: '#ec4899',
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    yellow: '#eab308',
    lime: '#84cc16',
    green: '#22c55e',
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    sky: '#0ea5e9',
    violet: '#8b5cf6',
    gray: '#6b7280',
  };
  
  return tailwindColors[color] || tailwindColors.blue;
};

// Get Tailwind classes for primary color
export const getPrimaryClasses = (color: string, variant = '600') => {
  if (color.startsWith('#')) {
    // For hex codes, we can't use Tailwind classes directly
    // We'll handle this with custom CSS in another way
    return 'bg-blue-600 hover:bg-blue-700 text-white';
  }
  
  return `bg-${color}-${variant} hover:bg-${color}-700 text-white`;
};

// Generate CSS variables for the theme
export const generateThemeVariables = (flags?: LDFlagSet) => {
  const primaryColor = getPrimaryColor(flags);
  
  // Colors for Tailwind variants
  const tailwindVariants: Record<string, Record<string, string>> = {
    blue: { '600': '#2563eb', '700': '#1d4ed8' },
    indigo: { '600': '#4f46e5', '700': '#4338ca' },
    purple: { '600': '#7c3aed', '700': '#6d28d9' },
    pink: { '600': '#db2777', '700': '#be185d' },
    red: { '600': '#dc2626', '700': '#b91c1c' },
    orange: { '600': '#ea580c', '700': '#c2410c' },
    amber: { '600': '#d97706', '700': '#b45309' },
    yellow: { '600': '#ca8a04', '700': '#a16207' },
    lime: { '600': '#65a30d', '700': '#4d7c0f' },
    green: { '600': '#16a34a', '700': '#15803d' },
    emerald: { '600': '#059669', '700': '#047857' },
    teal: { '600': '#0d9488', '700': '#0f766e' },
    cyan: { '600': '#0891b2', '700': '#0e7490' },
    sky: { '600': '#0284c7', '700': '#0369a1' },
    violet: { '600': '#7c3aed', '700': '#6d28d9' },
    gray: { '600': '#4b5563', '700': '#374151' },
  };
  
  // Generate a darker version for hover state if it's a hex code
  const generateDarkerColor = (hexColor: string): string => {
    // Remove the # and convert to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Darken by 15%
    const darkenFactor = 0.85;
    const newR = Math.max(0, Math.floor(r * darkenFactor));
    const newG = Math.max(0, Math.floor(g * darkenFactor));
    const newB = Math.max(0, Math.floor(b * darkenFactor));
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };
  
  // Get appropriate colors based on primaryColor
  const baseColor = getColorVariable(primaryColor);
  const hoverColor = primaryColor.startsWith('#')
    ? generateDarkerColor(baseColor)
    : tailwindVariants[primaryColor]?.['700'] || tailwindVariants.blue['700'];
  
  return {
    '--color-primary': baseColor,
    '--color-primary-hover': hoverColor,
  };
};