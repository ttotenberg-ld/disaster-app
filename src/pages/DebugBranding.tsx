import React, { useState } from 'react';
import { useBrandingStore } from '../store/branding';

const CONFIG_API_BASE_URL = 'http://localhost:8001/api';

export const DebugBranding = () => {
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [testStatus, setTestStatus] = useState<string>('');
  
  const {
    logoUrl,
    primaryColor,
    contrastColor,
    domain,
    applyBranding,
    loadInitialBranding
  } = useBrandingStore();

  const testApiCall = async () => {
    setTestStatus('Testing API...');
    try {
      const response = await fetch(`${CONFIG_API_BASE_URL}/search-brands?q=LaunchDarkly`);
      const data = await response.json();
      setApiTestResult(JSON.stringify(data, null, 2));
      setTestStatus('API test successful');
    } catch (error) {
      setApiTestResult(`Error: ${error}`);
      setTestStatus('API test failed');
    }
  };

  const testApplyBranding = () => {
    setTestStatus('Testing applyBranding...');
    applyBranding({
      logoUrl: 'https://img.logo.dev/launchdarkly.com?token=pk_CV1Cwkm5RDmroDFjScYQRA',
      primaryColor: '#181818',
      domain: 'launchdarkly.com'
    });
    setTestStatus('applyBranding called');
  };

  const testLoadInitialBranding = () => {
    setTestStatus('Testing loadInitialBranding...');
    loadInitialBranding();
    setTestStatus('loadInitialBranding called');
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('demoBrandLogo');
    localStorage.removeItem('demoBrandColor');
    localStorage.removeItem('demoBrandDomain');
    setTestStatus('localStorage cleared');
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Branding Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Store State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Current Store State</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Logo URL:</strong> {logoUrl || 'null'}</div>
            <div><strong>Primary Color:</strong> {primaryColor || 'null'}</div>
            <div><strong>Contrast Color:</strong> {contrastColor || 'null'}</div>
            <div><strong>Domain:</strong> {domain || 'null'}</div>
          </div>
        </div>

        {/* LocalStorage State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">LocalStorage State</h2>
          <div className="space-y-2 text-sm">
            <div><strong>demoBrandLogo:</strong> {localStorage.getItem('demoBrandLogo') || 'null'}</div>
            <div><strong>demoBrandColor:</strong> {localStorage.getItem('demoBrandColor') || 'null'}</div>
            <div><strong>demoBrandDomain:</strong> {localStorage.getItem('demoBrandDomain') || 'null'}</div>
          </div>
        </div>

        {/* CSS Variables */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">CSS Variables</h2>
          <div className="space-y-2 text-sm">
            <div><strong>--brand-primary-color:</strong> {getComputedStyle(document.documentElement).getPropertyValue('--brand-primary-color') || 'not set'}</div>
            <div><strong>--brand-contrast-color:</strong> {getComputedStyle(document.documentElement).getPropertyValue('--brand-contrast-color') || 'not set'}</div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Test Actions</h2>
          <div className="space-y-2">
            <button 
              onClick={testApiCall}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test API Call
            </button>
            <button 
              onClick={testApplyBranding}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Apply Branding
            </button>
            <button 
              onClick={testLoadInitialBranding}
              className="w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Test Load Initial Branding
            </button>
            <button 
              onClick={clearLocalStorage}
              className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear LocalStorage
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Test Status</h2>
        <div className="text-sm font-mono">{testStatus || 'No tests run yet'}</div>
      </div>

      {/* API Test Result */}
      {apiTestResult && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">API Test Result</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">{apiTestResult}</pre>
        </div>
      )}
    </div>
  );
}; 