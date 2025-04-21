import asyncio
import subprocess
import uuid
import logging
import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Any, Optional

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Test Runner API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for test statuses
# In a real app, use Redis, a database, etc.
TEST_STATUSES: Dict[str, Dict[str, Any]] = {}

# Determine project root directory (assuming this script is in test-runner-api/)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# --- Pydantic Models ---
class TestRunRequest(BaseModel):
    logo_url: str
    primaryColor: str

class TestRunResponse(BaseModel):
    test_id: str
    status: str

class TestStatusResponse(BaseModel):
    test_id: str
    status: str
    error: str | None = None
    output: str | None = None # Optionally include output

# --- Test Execution Task ---
async def run_playwright_test(test_id: str, logo_url: Optional[str], primary_color: Optional[str]):
    """Runs the Playwright test in a subprocess with branding env vars."""
    command = ["npx", "playwright", "test", "tests/e2e-flow.spec.ts"]
    logger.info(f"[{test_id}] Running command: {' '.join(command)} in {PROJECT_ROOT}")

    TEST_STATUSES[test_id]["status"] = "running"

    try:
        # Set environment variables for the test process
        env = os.environ.copy()
        env["CI"] = "true"
        if logo_url: env["BRAND_LOGO_URL"] = logo_url
        if primary_color: env["BRAND_PRIMARY_COLOR"] = primary_color

        logger.info(f"[{test_id}] Setting env vars: BRAND_LOGO_URL={'present' if logo_url else 'not set'}, BRAND_PRIMARY_COLOR={'present' if primary_color else 'not set'}")

        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=PROJECT_ROOT,
            env=env
        )

        stdout, stderr = await process.communicate()
        exit_code = process.returncode

        stdout_str = stdout.decode().strip()
        stderr_str = stderr.decode().strip()

        if exit_code == 0:
            logger.info(f"[{test_id}] Test completed successfully.")
            TEST_STATUSES[test_id]["status"] = "success"
            TEST_STATUSES[test_id]["output"] = stdout_str # Store output
        else:
            logger.error(f"[{test_id}] Test failed with exit code {exit_code}.")
            logger.error(f"[{test_id}] STDERR: {stderr_str}")
            TEST_STATUSES[test_id]["status"] = "error"
            TEST_STATUSES[test_id]["error"] = stderr_str or "Test failed with non-zero exit code."
            TEST_STATUSES[test_id]["output"] = stdout_str # Store output even on failure

    except FileNotFoundError:
        logger.exception(f"[{test_id}] Error: 'npx' command not found. Is Node.js/npm installed and in PATH?")
        TEST_STATUSES[test_id]["status"] = "error"
        TEST_STATUSES[test_id]["error"] = "Failed to start test runner (npx not found)."
    except Exception as e:
        logger.exception(f"[{test_id}] An unexpected error occurred during test execution: {e}")
        TEST_STATUSES[test_id]["status"] = "error"
        TEST_STATUSES[test_id]["error"] = f"An unexpected error occurred: {e}"

# --- API Endpoints ---
@app.post("/api/run-e2e-test", response_model=TestRunResponse)
async def trigger_e2e_test(request: TestRunRequest, background_tasks: BackgroundTasks):
    """Triggers the E2E test run, passing branding details."""
    test_id = str(uuid.uuid4())
    logger.info(f"Received request to run test with branding, assigning ID: {test_id}")
    TEST_STATUSES[test_id] = {"status": "pending"}

    # Run the task with branding details
    background_tasks.add_task(run_playwright_test, test_id, request.logo_url, request.primaryColor)

    return TestRunResponse(test_id=test_id, status="pending")

@app.get("/api/test-status/{test_id}", response_model=TestStatusResponse)
async def get_test_status(test_id: str):
    """Gets the status of a specific test run."""
    if test_id not in TEST_STATUSES:
        raise HTTPException(status_code=404, detail="Test ID not found")
    
    status_data = TEST_STATUSES[test_id]
    logger.debug(f"Polling status for {test_id}: {status_data['status']}")
    return TestStatusResponse(
        test_id=test_id,
        status=status_data.get("status", "unknown"),
        error=status_data.get("error"),
        output=status_data.get("output")
    )

# Add a root endpoint for basic health check
@app.get("/")
async def root():
    return {"message": "Test Runner API is running"}

if __name__ == "__main__":
    import uvicorn
    # Run on port 8002
    uvicorn.run(app, host="0.0.0.0", port=8002) 