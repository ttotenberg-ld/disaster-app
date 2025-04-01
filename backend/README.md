# Auth Demo Backend

A FastAPI backend for the Auth Demo application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python server.py
```

The API will be available at `http://localhost:8000`.

## API Endpoints

- `POST /api/signup` - Register a new user
- `POST /api/token` - Login and get access token
- `GET /api/me` - Get current user profile
- `PATCH /api/me` - Update current user profile

## Swagger Documentation

View the API documentation at `http://localhost:8000/docs` 