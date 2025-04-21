#!/bin/bash

# Activate shared environment (adjust if needed)
# Assuming shared venv in ./backend for simplicity in demo
echo "Activating Python environment (from ./backend/venv)..."
cd backend
source venv/bin/activate
cd .. # Go back to root

# Install/update requirements for ALL services into the activated venv
echo "Installing/updating main backend requirements..."
pip install -r backend/requirements.txt
echo "Installing/updating config API requirements..."
pip install -r config-api/requirements.txt
echo "Installing/updating test runner API requirements..."
pip install -r test-runner-api/requirements.txt

# Start the main backend (Port 8000 assumed)
echo "Starting the main backend (port 8000)..."
cd backend
python server.py &
MAIN_BACKEND_PID=$!
cd .. # Go back to root

# Start the config API backend (Port 8001)
echo "Starting the config API backend (port 8001)..."
cd config-api
# Requirements should now be installed in the shared venv
uvicorn main:app --host 0.0.0.0 --port 8001 &
CONFIG_API_PID=$!
cd .. # Go back to root

# Start the Test Runner API backend (Port 8002)
echo "Starting the Test Runner API backend (port 8002)..."
cd test-runner-api
uvicorn main:app --host 0.0.0.0 --port 8002 &
TEST_RUNNER_API_PID=$!
cd .. # Go back to root

# Start the frontend (Port 5173 assumed)
echo "Starting the frontend (port 5173)..."
npm run dev &
FRONTEND_PID=$!

# Handle termination
trap "echo 'Stopping services...'; kill $MAIN_BACKEND_PID $CONFIG_API_PID $TEST_RUNNER_API_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Keep the script running
echo "All services started. Press Ctrl+C to stop."
wait 