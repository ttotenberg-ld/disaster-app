import { LDContext } from 'launchdarkly-react-client-sdk';

// LaunchDarkly client-side ID
export const CLIENT_SIDE_ID = '67ebfc07b4176609631d6f65';

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