# Playwright Tests for Disaster App

These tests are designed to generate realistic traffic for Highlight.io session replay and analytics that is indistinguishable from real user sessions.

## Setup

The tests are configured to:
1. Initialize the Highlight SDK using the same configuration as the main app
2. Simulate realistic human interactions with natural timing and behavior
3. Only identify users at the same points a real user would be identified
4. Gracefully shut down to ensure telemetry is sent

## Running the Tests

To run all tests:
```bash
npm test
```

To run with UI mode for debugging:
```bash
npm run test:ui
```

## Test Details

### Signup Test
- Starts on the home page
- Navigates to signup screen
- Clears existing form data
- Simulates realistic typing for email/password
- Completes signup
- Identifies user only after successful signup (like the real app)
- Waits for telemetry to be sent

### Login Test
- Starts on the home page
- Navigates to the login page
- Simulates realistic form interactions
- Identifies user only after successful login (like the real app)

### Navigation Test
- Anonymous browsing simulation (no user identification)
- Realistic scrolling behavior
- Natural timing and pauses between actions

## Viewing Results in Highlight

After running the tests, sessions will appear in your Highlight dashboard as if they were from real users:
- All network requests captured
- DOM events recorded for session replay
- Natural user interactions and timing
- No test-specific properties that would distinguish them from real users

The tests use the exact same Highlight configuration as the main app to ensure sessions are indistinguishable. 