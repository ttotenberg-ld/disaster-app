# Disaster App Demo - LaunchDarkly & Observability Demo

## New: Playwright Tests for Backend Highlight.io Traffic Generation

This project includes automated Playwright tests that generate realistic traffic indistinguishable from real user sessions in your Highlight.io dashboard (backend only). You can use these tests to:

1. Generate sample backend traffic in your Highlight.io dashboard that looks exactly like real user sessions
2. See how user actions are captured by backend Highlight with natural timing and behavior

### Quick start:

```bash
# Install dependencies
npm install

# Run all tests (generates backend traffic in Highlight)
npm run test

# Run tests with UI (watch the browser interactions)
npm run test:ui

# Run a specific test
npx playwright test tests/signup.spec.ts
```

### How the tests work with backend Highlight

- The frontend now uses **LaunchDarkly Observability** for client-side monitoring
- Backend tests still use **Highlight.io** for session replay and backend error tracking
- Uses the exact same Highlight SDK initialization as the backend API

The tests will appear as normal user sessions in your Highlight dashboard, complete with:
- Realistic mouse movements and interactions  
- Form submissions and navigation
- Error tracking and user identification
- Natural timing between actions

## Frontend Observability: LaunchDarkly

The frontend now uses LaunchDarkly's observability features instead of Highlight.io:

### Automatic Features
- Error monitoring
- Performance monitoring (Core Web Vitals)
- Network request tracking
- User session tracking

### Manual Tracking Available
- Custom error tracking
- Custom log events  
- Performance spans
- Custom metrics

### Configuration
Update your observability project ID in `src/lib/launchdarkly.ts` with your actual project ID from the LaunchDarkly UI.

## Backend Observability: Highlight.io

The backend continues to use Highlight.io for server-side monitoring and error tracking.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Update observability configuration:
   - LaunchDarkly: Update project ID in `src/lib/launchdarkly.ts`
   - Highlight.io: Backend already configured
4. Start development: `npm run dev`
5. Run tests: `npm run test`

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + Python
- **Frontend Observability**: LaunchDarkly
- **Backend Observability**: Highlight.io
- **Testing**: Playwright
- **Feature Flags**: LaunchDarkly

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