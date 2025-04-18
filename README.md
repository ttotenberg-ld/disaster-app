# Auth Demo Application

## New: Playwright Tests for Highlight.io Traffic Generation

This project now includes Playwright tests that generate realistic user traffic that is indistinguishable from real user sessions in your Highlight.io dashboard. You can use these tests to:

1. Generate sample traffic in your Highlight.io dashboard that looks exactly like real user sessions
2. See how user actions are captured by Highlight with natural timing and behavior
3. Test error handling and edge cases

### Running the tests

```bash
# Install dependencies if you haven't already
npm install

# Run all tests (generates traffic in Highlight)
npm test

# Run tests with UI for debugging
npm run test:ui
```

The tests include:
- Sign-up flow with realistic typing and timing
- Login flow with natural user behavior
- Navigation through various app pages with realistic scrolling and interaction

### How the tests work with Highlight

Our tests are designed to mimic real user behavior:
1. Uses the exact same Highlight SDK initialization as the main app
2. Simulates realistic user interactions with natural timing and pauses
3. Only identifies users at the same points a real user would be identified
4. Performs actions with human-like randomness in timing
5. Gracefully shuts down to ensure all telemetry is sent

Check out the `/tests` directory for more details!

A demo application with a React frontend and a FastAPI backend that showcases a complete authentication flow.

## Features

- User signup and login with JWT authentication
- User profile management
- In-memory data storage for demo purposes
- Modern, responsive UI with Tailwind CSS

## Project Structure

- `src/` - React frontend
- `backend/` - FastAPI backend

## Getting Started

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)

### Installation

1. Install frontend dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Running the Application

You can start both the frontend and backend with a single command:

```bash
./start-dev.sh
```

Or run them separately:

**Frontend:**
```bash
npm run dev
```

**Backend:**
```bash
cd backend
python server.py
```

The frontend will be available at http://localhost:5173
The backend API will be available at http://localhost:8000

## API Documentation

You can view the backend API documentation at http://localhost:8000/docs

## Customizing

- The color scheme can be customized in `src/lib/theme.ts`
- Logo and branding can be modified in the Layout component 