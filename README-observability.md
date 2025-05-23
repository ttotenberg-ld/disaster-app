# LaunchDarkly Observability Setup

This document explains how to configure LaunchDarkly observability in your React application.

## Prerequisites

The observability plugins have been installed:
- `@launchdarkly/observability`
- `@launchdarkly/session-replay`

## Configuration

1. **Update your observability project ID** in `src/lib/launchdarkly.ts`:
   
   Replace `'your-observability-project-id'` with your actual observability project ID from the LaunchDarkly UI.
   
   To find your observability project ID:
   - Navigate to any of the "Monitor" pages (Sessions, Errors, Logs, Traces) in the LaunchDarkly UI
   - If you haven't set up sessions yet, click "Observability Project ID" in the installation guide
   - Otherwise, click the question mark icon in the lower right and choose "Copy Observability Project ID"

2. **The configuration is already set up** in your `main.tsx` file to use the observability plugins.

## Features Enabled

With this setup, you'll automatically get:

### Automatic Features
- Error monitoring
- Performance monitoring (Core Web Vitals)
- Network request tracking
- User session tracking

### Manual Features Available

You can also manually track events in your components:

```typescript
import { LDObserve } from '@launchdarkly/observability';

// Record custom errors
LDObserve.recordError(error, 'optional message', { 
  component: 'ExampleComponent.tsx' 
});

// Record custom logs
LDObserve.recordLog('Example log message', Severity.DEBUG);

// Start spans for performance tracking
LDObserve.startSpan('fetchData', (span) => {
  // Your code here
});

// Record custom metrics
LDObserve.recordGauge({name: "elapsedTimeMs", value: elapsed});
```

## Configuration Options

You can customize the observability behavior by modifying the options in `getLDOptions()`:

```typescript
export const getLDOptions = () => {
  return {
    plugins: [
      new Observability(OBSERVABILITY_PROJECT_ID, {
        tracingOrigins: true, // Track frontend requests to backend domains
        networkRecording: {
          enabled: true,
          recordHeadersAndBody: true
        },
        privacySetting: 'strict' // Options: 'strict', 'default', 'none'
      }),
      new SessionReplay(OBSERVABILITY_PROJECT_ID)
    ]
  };
};
```

## Viewing Data

After the setup is complete, you can view observability data in the LaunchDarkly UI:
- **Sessions**: Track user sessions and interactions
- **Errors**: Monitor client-side errors and exceptions  
- **Logs**: View application logs and custom log events
- **Traces**: Analyze performance spans and timing
- **Metrics**: Review automatically generated metrics like Core Web Vitals

## Next Steps

1. Replace the placeholder observability project ID with your actual ID
2. Deploy your application
3. Navigate to the LaunchDarkly UI to start viewing observability data
4. Consider customizing the plugin options based on your needs 