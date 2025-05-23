import React, { useState, useEffect } from "react";
import { withLDConsumer, LDFlagSet } from "launchdarkly-react-client-sdk";

const DEFAULT_FALLBACK_LOGO_URL = 'https://img.logo.dev/launchdarkly.com?token=pk_CV1Cwkm5RDmroDFjScYQRA';

// Use the LDFlagSet type provided by LaunchDarkly
interface LogoProps {
  flags?: LDFlagSet;
  overrideSrc?: string | null; // Allow null to differentiate from undefined
  className?: string; // Add optional className prop
}

const LogoInternal: React.FC<LogoProps> = ({ flags = {}, overrideSrc, className }) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let determinedSrc: string | null = null;

    // 1. Priority: Override source from localStorage
    if (overrideSrc) {
      determinedSrc = overrideSrc;
    } else {
      // 2. Fallback: LaunchDarkly flag (use proxy)
      const logoUrlFromFlag = flags?.configCustomerLogo as string | undefined;
      if (logoUrlFromFlag) {
        determinedSrc = `http://localhost:8000/api/proxy-image?url=${encodeURIComponent(logoUrlFromFlag)}`;
      } else {
        // 3. Final Fallback: Default hardcoded logo
        determinedSrc = DEFAULT_FALLBACK_LOGO_URL;
      }
    }

    setCurrentSrc(determinedSrc);
    setImgError(false); // Reset error state when source changes

  }, [overrideSrc, flags]); // Re-run if override or flags change

  const handleError = () => {
    console.error("Failed to load logo:", currentSrc);
    setImgError(true);
    // If the primary/LD source failed, try the default fallback
    if (currentSrc !== DEFAULT_FALLBACK_LOGO_URL) {
      setCurrentSrc(DEFAULT_FALLBACK_LOGO_URL);
    }
  };

  // Render the image if we have a src and no error, or if we are trying the fallback after an error
  if (currentSrc && (!imgError || currentSrc === DEFAULT_FALLBACK_LOGO_URL)) {
    return (
      <img
        src={currentSrc}
        alt="Company Logo"
        className={className || "h-8 w-auto object-contain"} // Apply className or default
        onError={handleError}
      />
    );
  }

  // Should ideally not be reached if fallback logic is correct, but keep a minimal fallback
  return <div className="h-8 w-20 bg-gray-200 rounded" aria-label="Logo placeholder"></div>;
};

// Use the HOC
export default withLDConsumer()(LogoInternal);