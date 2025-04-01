const API_URL = 'http://localhost:8000';

// Type definitions
export interface User {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  website?: string;
}

export interface UpdateProfileData {
  fullName?: string;
  username?: string;
  website?: string;
}

// API functions
export async function signUp(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_URL}/api/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sign up');
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<string> {
  // The API expects form data for OAuth2
  const formData = new FormData();
  formData.append('username', email); // OAuth2 uses 'username' field for the email
  formData.append('password', password);

  const response = await fetch(`${API_URL}/api/token`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to login');
  }

  const data = await response.json();
  return data.access_token;
}

export async function getProfile(token: string): Promise<User> {
  const response = await fetch(`${API_URL}/api/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to get profile');
  }

  return response.json();
}

export async function updateProfile(token: string, data: UpdateProfileData): Promise<User> {
  const response = await fetch(`${API_URL}/api/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update profile');
  }

  return response.json();
} 