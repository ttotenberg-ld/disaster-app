import { H } from 'highlight.run';

// Replace this with your actual Highlight project ID from app.highlight.io/setup
// Using a placeholder value for demonstration purposes
const PROJECT_ID = '5g5y21pe';

export const initializeHighlight = () => {
  H.init(PROJECT_ID, {
    serviceName: 'disaster-app',
    tracingOrigins: true,
    networkRecording: {
      enabled: true,
      recordHeadersAndBody: true,
      urlBlocklist: [
        // URLs containing sensitive information that shouldn't be recorded
        'api/token',
      ],
    },
  });
};

// Function to identify users after successful authentication
export const identifyUser = (email: string, userId: string) => {
  H.identify(email, {
    id: userId,
    // You can add additional user properties here if needed
  });
}; 