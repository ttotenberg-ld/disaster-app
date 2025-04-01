import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { withLDProvider } from 'launchdarkly-react-client-sdk';
import App from './App.tsx';
import './index.css';
import { CLIENT_SIDE_ID, getDefaultContext } from './lib/launchdarkly';

// Wrap the App component with LaunchDarkly
const LDApp = withLDProvider({
  clientSideID: CLIENT_SIDE_ID,
  context: getDefaultContext(),
})(App);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LDApp />
  </StrictMode>
);
