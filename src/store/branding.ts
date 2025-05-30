import { create } from 'zustand';
import { getContrastColor } from '../lib/colorUtils';

// Defaults
const DEFAULT_BRAND_COLOR = '#000000';
const DEFAULT_FALLBACK_LOGO_URL = 'https://img.logo.dev/launchdarkly.com?token=pk_CV1Cwkm5RDmroDFjScYQRA';
const DEFAULT_DOMAIN = 'launchdarkly.com';
// Calculate default contrast based on default color
const DEFAULT_CONTRAST_COLOR = getContrastColor(DEFAULT_BRAND_COLOR);

interface BrandingState {
  logoUrl: string; // No longer null initially
  primaryColor: string; // No longer null initially
  contrastColor: string; // No longer null initially
  domain: string; // No longer null initially
  // isInitialized: boolean; // Removed
  applyBranding: (details: { logoUrl: string; primaryColor: string; domain: string }) => void;
  setContrastColor: (contrastColor: string) => void;
  loadInitialBranding: () => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  // Initial state set to defaults
  logoUrl: DEFAULT_FALLBACK_LOGO_URL,
  primaryColor: DEFAULT_BRAND_COLOR,
  contrastColor: DEFAULT_CONTRAST_COLOR,
  domain: DEFAULT_DOMAIN,
  // isInitialized: false, // Removed

  // Action to apply new branding
  applyBranding: (details) => {
    try {
      const contrast = getContrastColor(details.primaryColor);
      localStorage.setItem('demoBrandLogo', details.logoUrl);
      localStorage.setItem('demoBrandColor', details.primaryColor);
      localStorage.setItem('demoBrandDomain', details.domain);
      set({
        logoUrl: details.logoUrl,
        primaryColor: details.primaryColor,
        contrastColor: contrast,
        domain: details.domain,
        // isInitialized: true // Removed
      });
    } catch (error) {
      console.error("Error applying branding:", error);
    }
  },

  // Action to manually set contrast color
  setContrastColor: (contrastColor) => {
    try {
      localStorage.setItem('demoBrandContrastColor', contrastColor);
      set((state) => ({
        ...state,
        contrastColor: contrastColor,
      }));
    } catch (error) {
      console.error("Error setting contrast color:", error);
    }
  },

  // Action to load initial state from localStorage (overwrites defaults if found)
  loadInitialBranding: () => {
      try {
        const storedLogo = localStorage.getItem('demoBrandLogo');
        const storedColor = localStorage.getItem('demoBrandColor');
        const storedDomain = localStorage.getItem('demoBrandDomain');
        const storedContrastColor = localStorage.getItem('demoBrandContrastColor');

        if (storedLogo && storedColor && storedDomain) {
            // Use stored contrast color if available, otherwise calculate from primary
            const contrast = storedContrastColor || getContrastColor(storedColor);
            set({
                logoUrl: storedLogo,
                primaryColor: storedColor,
                contrastColor: contrast,
                domain: storedDomain,
                // isInitialized: true // Removed
            });
            console.log('Initialized branding store from localStorage');
        } else {
             // If not found, the initial default state is already set
             console.log('No complete branding in localStorage, using initial defaults.');
             // No need to set defaults again here
        }
      } catch (error) {
          console.error("Error loading initial branding:", error);
           // If error, the initial default state remains
      }
  },
}));

// Define a type for the window object including our custom function
interface WindowWithBrandingStore extends Window {
  useBrandingStore?: typeof useBrandingStore;
}

// Expose the whole store hook to the window object FOR TESTING ONLY
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Cast to our extended window type
  (window as WindowWithBrandingStore).useBrandingStore = useBrandingStore;
  console.log('Attached useBrandingStore to window for testing.');
} 