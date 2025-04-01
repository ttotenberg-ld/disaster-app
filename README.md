# Auth Demo Application

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