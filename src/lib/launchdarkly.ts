import { LDContext } from 'launchdarkly-react-client-sdk';
import { LDOptions } from 'launchdarkly-js-client-sdk';
import Observability from '@launchdarkly/observability';
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
      new Observability(OBSERVABILITY_PROJECT_ID),
      new SessionReplay(OBSERVABILITY_PROJECT_ID)
    ]
  };
}; 