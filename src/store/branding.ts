import { create } from 'zustand';
import { getContrastColor } from '../lib/colorUtils';

// Defaults used if localStorage is empty or on error
const DEFAULT_BRAND_COLOR = '#000000';
// const DEFAULT_CONTRAST_COLOR = '#FFFFFF'; // Removed unused
const DEFAULT_FALLBACK_LOGO_URL = 'https://img.logo.dev/launchdarkly.com?token=pk_CV1Cwkm5RDmroDFjScYQRA';
const DEFAULT_DOMAIN = 'launchdarkly.com';

interface BrandingState {
  logoUrl: string | null;
  primaryColor: string | null;
  contrastColor: string | null;
  domain: string | null;
  applyBranding: (details: { logoUrl: string; primaryColor: string; domain: string }) => void;
  loadInitialBranding: () => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  // Initial state
  logoUrl: null,
  primaryColor: null,
  contrastColor: null,
  domain: null,

  // Action to apply new branding
  applyBranding: (details) => {
    try {
      const contrast = getContrastColor(details.primaryColor);
      
      // Save to localStorage for persistence
      localStorage.setItem('demoBrandLogo', details.logoUrl);
      localStorage.setItem('demoBrandColor', details.primaryColor);
      localStorage.setItem('demoBrandDomain', details.domain);
      console.log('Saved branding to localStorage', details);

      // Update store state
      set({
        logoUrl: details.logoUrl,
        primaryColor: details.primaryColor,
        contrastColor: contrast,
        domain: details.domain,
      });
    } catch (error) {
        console.error("Error applying branding:", error);
        // Optionally revert to defaults or handle error state
    }
  },

  // Action to load initial state from localStorage
  loadInitialBranding: () => {
      try {
        const storedLogo = localStorage.getItem('demoBrandLogo');
        const storedColor = localStorage.getItem('demoBrandColor');
        const storedDomain = localStorage.getItem('demoBrandDomain');

        if (storedLogo && storedColor && storedDomain) {
            const contrast = getContrastColor(storedColor);
            set({
                logoUrl: storedLogo,
                primaryColor: storedColor,
                contrastColor: contrast,
                domain: storedDomain,
            });
            console.log('Initialized branding store from localStorage');
        } else {
             // If not fully set in localStorage, initialize with defaults
             console.log('No complete branding in localStorage, initializing store with defaults.');
             const defaultContrast = getContrastColor(DEFAULT_BRAND_COLOR);
              set({
                logoUrl: DEFAULT_FALLBACK_LOGO_URL,
                primaryColor: DEFAULT_BRAND_COLOR,
                contrastColor: defaultContrast,
                domain: DEFAULT_DOMAIN,
            });
        }
      } catch (error) {
          console.error("Error loading initial branding:", error);
           // Fallback to defaults on error
           const defaultContrast = getContrastColor(DEFAULT_BRAND_COLOR);
            set({
                logoUrl: DEFAULT_FALLBACK_LOGO_URL,
                primaryColor: DEFAULT_BRAND_COLOR,
                contrastColor: defaultContrast,
                domain: DEFAULT_DOMAIN,
            });
      }
  },
})); 