import { LDContext } from 'launchdarkly-react-client-sdk';
import { LDOptions } from 'launchdarkly-js-client-sdk';
import Observability, { LDObserve } from '@launchdarkly/observability';
import SessionReplay from '@launchdarkly/session-replay';

// LaunchDarkly client-side ID
export const CLIENT_SIDE_ID = '67ebfc07b4176609631d6f65';

// Observability project ID - you'll need to replace this with your actual project ID
export const OBSERVABILITY_PROJECT_ID = 'ejlj47ny';

// Create default anonymous context
export const getDefaultContext = (): LDContext => {
  return {
    kind: 'user',
    anonymous: true,
  };
};

// Create user context when user is authenticated
export const createUserContext = (email: string, userId: string): LDContext => {
  return {
    kind: 'user',
    key: userId,
    email,
    anonymous: false,
  };
};

// Get LaunchDarkly client options with observability plugins
export const getLDOptions = (): LDOptions => {
  return {
    plugins: [
      new Observability(OBSERVABILITY_PROJECT_ID, {
        tracingOrigins: true, // attribute frontend requests to backend domains
        networkRecording: {
          enabled: true,
          recordHeadersAndBody: true
        }
      }),
      new SessionReplay(OBSERVABILITY_PROJECT_ID)
    ]
  };
};

/**
 * Record an error to LaunchDarkly observability
 * @param error - The error object or error message
 * @param message - Optional custom message to provide context
 * @param payload - Optional additional data to include with the error
 */
export const recordError = (
  error: Error | string,
  message?: string,
  payload?: Record<string, unknown>
): void => {
  try {
    // Convert string errors to Error objects
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Add timestamp and additional context to payload
    const enhancedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      source: 'frontend'
    };

    // Record the error using LaunchDarkly observability
    LDObserve.recordError(errorObj, message, enhancedPayload);
    
    // Also log to console for development
    console.error('[LaunchDarkly Error]', {
      error: errorObj,
      message,
      payload: enhancedPayload
    });
  } catch (recordingError) {
    // Fallback logging if error recording fails
    console.error('[LaunchDarkly Error Recording Failed]', recordingError);
    console.error('[Original Error]', error);
  }
};

/**
 * Record a custom error with specific component context
 * @param componentName - Name of the component where the error occurred
 * @param errorMessage - Description of the error
 * @param errorData - Additional error context data
 */
export const recordComponentError = (
  componentName: string,
  errorMessage: string,
  errorData?: Record<string, unknown>
): void => {
  const error = new Error(errorMessage);
  recordError(error, `Error in ${componentName}`, {
    component: componentName,
    ...errorData
  });
};

/**
 * Record an API error with request context
 * @param endpoint - The API endpoint that failed
 * @param status - HTTP status code
 * @param errorMessage - Error message from the API
 * @param requestData - Optional request data that caused the error
 */
export const recordApiError = (
  endpoint: string,
  status: number,
  errorMessage: string,
  requestData?: Record<string, unknown>
): void => {
  const error = new Error(`API Error: ${errorMessage}`);
  recordError(error, `API request failed: ${endpoint}`, {
    endpoint,
    status,
    requestData,
    errorType: 'api_error'
  });
}; 