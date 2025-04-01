import React, { useState } from "react";
import { withLDConsumer, LDFlagSet } from "launchdarkly-react-client-sdk";

// Use the LDFlagSet type provided by LaunchDarkly
interface LogoProps {
  flags?: LDFlagSet;
}

// Use the interface for props
const Logo: React.FC<LogoProps> = ({ flags = {} }) => {
  const [imgError, setImgError] = useState(false);
  // Use camelCase as LaunchDarkly converts flag names automatically
  const logoUrl = flags.configCustomerLogo as string | undefined;
  
  // If we have a logo URL, try to display it
  if (logoUrl && !imgError) {
    // Use our proxy to avoid CORS issues
    const proxyUrl = `http://localhost:8000/api/proxy-image?url=${encodeURIComponent(logoUrl)}`;
    
    return (
      <img 
        src={proxyUrl} 
        alt="Company Logo" 
        className="h-8"
        onError={() => setImgError(true)} 
      />
    );
  }
  
  // Fallback to text
  return <span className="text-xl font-bold">YourBrand</span>;
};

// Using HOC pattern
export default withLDConsumer()(Logo);