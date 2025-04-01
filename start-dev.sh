#!/bin/bash

# Start the backend
echo "Starting the backend..."
cd backend
source venv/bin/activate
python3 server.py &
BACKEND_PID=$!

# Start the frontend
echo "Starting the frontend..."
cd ..
npm run dev &
FRONTEND_PID=$!

# Handle termination
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Keep the script running
wait 