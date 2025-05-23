import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { useNavigate } from 'react-router-dom'; // useNavigate might not be needed now
import { debounce } from 'lodash';
// import { getContrastColor } from '../lib/colorUtils'; // No longer needed here
import { useBrandingStore } from '../store/branding'; // Import branding store

const CONFIG_API_BASE_URL = 'http://localhost:8001/api';
const TEST_RUNNER_API_BASE_URL = 'http://localhost:8002/api'; // New API base URL

// Define interface for the search result item (including primaryColor)
interface BrandSearchResult {
    name: string;
    domain: string;
    logo_url: string;
    primaryColor?: string | null;
}

interface TestStatus {
    status: 'idle' | 'pending' | 'running' | 'success' | 'error';
    message: string | null;
    output?: string | null; // Optional field for test output
}

function ConfigurationPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<BrandSearchResult[]>([]); // Use interface
    // Remove state related to selected brand details
    // const [selectedBrand, setSelectedBrand] = useState(null);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    // const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null); // State for confirmation

    // State for test running
    const [testStatus, setTestStatus] = useState<TestStatus>({ status: 'idle', message: null });
    const [testRunId, setTestRunId] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for interval ID

    // Get branding state and actions from the store
    const {
        logoUrl: appliedLogoUrl,
        primaryColor: appliedPrimaryColor,
        contrastColor: appliedContrastColor,
        domain: appliedDomain,
        applyBranding // Action to update branding
    } = useBrandingStore();

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            if (query.length < 2) {
                setSearchResults([]);
                setIsLoadingSearch(false);
                return;
            }
            setIsLoadingSearch(true);
            setError(null);
            
            console.log(`[ConfigurationPage] Searching for: ${query}`);
            
            try {
                const url = `${CONFIG_API_BASE_URL}/search-brands?q=${encodeURIComponent(query)}`;
                console.log(`[ConfigurationPage] Making request to: ${url}`);
                
                const response = await fetch(url);
                console.log(`[ConfigurationPage] Response status: ${response.status}`);
                
                if (!response.ok) {
                    const errorData = await response.text();
                    console.error(`[ConfigurationPage] API error:`, errorData);
                    throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
                }
                
                const data: BrandSearchResult[] = await response.json();
                console.log(`[ConfigurationPage] Search results:`, data);
                setSearchResults(data);
            } catch (err) {
                console.error("[ConfigurationPage] Search failed:", err);
                const message = err instanceof Error ? err.message : 'Failed to fetch search results.';
                setError(message);
                setSearchResults([]);
            }
            setIsLoadingSearch(false);
        }, 500),
        []
    );

    useEffect(() => {
        debouncedSearch(searchTerm);
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchTerm, debouncedSearch]);

    // Remove handleSelectBrand function as it's no longer needed
    // const handleSelectBrand = async (brand) => { ... };

    // Confirm branding calls the store action
    const handleConfirmBranding = (brand: BrandSearchResult) => {
        if (brand && brand.logo_url && brand.primaryColor) {
            // Call store action to update state and save to localStorage
            applyBranding({
                logoUrl: brand.logo_url,
                primaryColor: brand.primaryColor,
                domain: brand.domain
            });

            const message = `Branding updated for ${brand.name}!`;
            setConfirmationMessage(message);
            console.log('Branding configured via store:', message);
            setTimeout(() => setConfirmationMessage(null), 5000);

            // Clear search instead of setting it to brand name to avoid triggering new search
            setSearchTerm('');
            setSearchResults([]);
        } else {
            const errorMsg = 'Error: Could not apply branding - logo or color missing.';
            setConfirmationMessage(errorMsg);
            setTimeout(() => setConfirmationMessage(null), 5000);
        }
    };

    // Function to poll for test status
    const pollTestStatus = useCallback(async (id: string) => {
        console.log(`Polling status for test ID: ${id}`);
        try {
            const response = await fetch(`${TEST_RUNNER_API_BASE_URL}/test-status/${id}`);
            if (!response.ok) {
                // Handle non-200 responses, e.g., 404 if ID expires or is wrong
                throw new Error(`Failed to fetch status: ${response.status}`);
            }
            const data = await response.json();

            if (data.status === 'success' || data.status === 'error') {
                setTestStatus({
                     status: data.status,
                     message: data.error || (data.status === 'success' ? 'E2E test completed successfully!' : 'Test finished.'),
                     output: data.output
                });
                setTestRunId(null); // Stop polling
            } else if (data.status === 'running' || data.status === 'pending') {
                 setTestStatus({ status: data.status, message: 'Test is running...' });
                 // Continue polling (implicitly via interval)
            } else {
                 // Handle unexpected status
                 throw new Error(`Unexpected test status: ${data.status}`);
            }
        } catch (error) {
            console.error('Error polling test status:', error);
            setTestStatus({ status: 'error', message: error instanceof Error ? error.message : 'Failed to get test status.' });
            setTestRunId(null); // Stop polling on error
        }
    }, []);

    // Effect to manage polling interval
    useEffect(() => {
        if (testRunId) {
            // Clear any existing interval first
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            // Start new interval
            pollingIntervalRef.current = setInterval(() => {
                pollTestStatus(testRunId);
            }, 3000); // Poll every 3 seconds
        } else {
            // Clear interval if testRunId is null (test finished or initial state)
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }

        // Cleanup function to clear interval on component unmount
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [testRunId, pollTestStatus]);

    // Trigger test run, reads applied branding details FROM THE STORE
    const handleRunTest = async () => {
        // Read directly from store state variables
        if (!appliedLogoUrl || !appliedPrimaryColor) {
             setTestStatus({ status: 'error', message: 'Cannot run test: No branding applied yet.' });
             return;
        }
        
        setTestStatus({ status: 'pending', message: 'Initiating test run...' });
        setTestRunId(null);
        try {
            const response = await fetch(`${TEST_RUNNER_API_BASE_URL}/run-e2e-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logo_url: appliedLogoUrl, // Use store value
                    primaryColor: appliedPrimaryColor // Use store value
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error starting test.'}));
                throw new Error(errorData.detail || `Failed to start test: ${response.status}`);
            }
            const data = await response.json();
            setTestRunId(data.test_id); // Start polling
            setTestStatus({ status: 'pending', message: 'Test run requested, waiting for start...' });
        } catch (error) {
            console.error('Error starting test run:', error);
            setTestStatus({ status: 'error', message: error instanceof Error ? error.message : 'Failed to trigger test run.' });
            setTestRunId(null);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Configure Demo Branding</h1>

            {/* Currently Applied Branding Section (reads from store) */} 
            {appliedLogoUrl ? (
                 <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h2 className="text-lg font-semibold mb-3 text-gray-800">Currently Applied Branding</h2>
                    <div className="flex items-center mb-3">
                         <img 
                             src={appliedLogoUrl} // Use store value
                             alt="Current Logo" 
                             className="w-16 h-16 mr-4 object-contain border border-gray-100 p-1 bg-white" 
                         />
                        <div>
                            <p className="font-medium text-gray-900">{appliedDomain || 'Unknown'}</p>
                            <div className="flex items-center mt-1">
                                <p className="text-sm mr-2 text-gray-600">Primary:</p>
                                <div
                                    style={{ backgroundColor: appliedPrimaryColor || 'transparent' }}
                                    className="w-5 h-5 rounded border border-gray-400 mr-1"
                                ></div>
                                <span className="text-sm font-mono text-gray-700">{appliedPrimaryColor || 'N/A'}</span>
                            </div>
                            <div className="flex items-center mt-1">
                                <p className="text-sm mr-2 text-gray-600">Contrast:</p>
                                 <div
                                    style={{ backgroundColor: appliedContrastColor || 'transparent' }}
                                    className="w-5 h-5 rounded border border-gray-400 mr-1"
                                ></div>
                                <span className="text-sm font-mono text-gray-700">{appliedContrastColor || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
             ) : (
                 <p className="text-gray-500 mb-8">No branding currently applied.</p>
             )}

             {/* Search Section */} 
            <div className="mb-4 relative">
                <label htmlFor="search-brand" className="block text-sm font-medium text-gray-700 mb-1">Search & Select New Branding</label>
                <input
                    type="text"
                    id="search-brand"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter company name (e.g., LaunchDarkly)"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                 {isLoadingSearch && <div className="absolute right-2 top-9 text-gray-500 text-sm">Loading...</div>}
                {searchResults.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map((brand) => (
                            <li
                                key={brand.domain}
                                onClick={() => handleConfirmBranding(brand)}
                                className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                            >
                                {brand.logo_url && (
                                    <img 
                                        src={brand.logo_url} 
                                        alt={`${brand.name} logo`} 
                                        className="w-6 h-6 mr-2 object-contain flex-shrink-0"
                                        onError={(e) => {
                                            console.warn('Failed to load logo:', brand.logo_url);
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                )}
                                <span className="flex-grow mr-2">{brand.name} ({brand.domain})</span>
                                {brand.primaryColor && (
                                    <div
                                        style={{ backgroundColor: brand.primaryColor }}
                                        className="w-4 h-4 rounded border border-gray-400 flex-shrink-0"
                                        title={`Primary Color: ${brand.primaryColor}`}
                                    ></div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

             {/* Error/Confirmation Message Area */} 
            {error && <p className="text-red-500 mt-2">Error: {error}</p>}
            {confirmationMessage && (
                 <div className={`mt-2 p-2 rounded text-sm ${confirmationMessage.startsWith('Error:') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {confirmationMessage}
                </div>
            )}

            {/* Test Runner Section */} 
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Run E2E Test</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Run the automated end-to-end test using the currently applied branding.
                    The test will run headlessly in the background.
                </p>
                <button
                    onClick={handleRunTest}
                    disabled={testStatus.status === 'pending' || testStatus.status === 'running'}
                    style={{
                       backgroundColor: 'var(--brand-primary-color)', // Use brand color
                       color: 'var(--brand-contrast-color)' // Use contrast color
                    }}
                    className={`px-5 py-2 rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {testStatus.status === 'pending' || testStatus.status === 'running' ? 'Test Running...' : 'Run E2E Test'}
                </button>

                {/* Test Status Display */} 
                <div className="mt-4 p-3 border rounded-md bg-gray-50 min-h-[60px]">
                    <p className="text-sm font-medium text-gray-700">Test Status:</p>
                    <p className={`text-sm font-semibold ${ 
                        testStatus.status === 'success' ? 'text-green-600' :
                        testStatus.status === 'error' ? 'text-red-600' :
                        'text-gray-600' 
                    }`}> 
                        {testStatus.status.charAt(0).toUpperCase() + testStatus.status.slice(1)}
                    </p>
                    {testStatus.message && (
                        <p className="mt-1 text-xs text-gray-500">{testStatus.message}</p>
                    )}
                    {/* Optionally display output on success/error */}
                    {/* {testStatus.output && <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">{testStatus.output}</pre>} */} 
                </div>
            </div>

        </div>
    );
}

export default ConfigurationPage; 