import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { token } from '$lib/stores/auth';
import { get } from 'svelte/store';

// Default API configuration
const API_URL = 'http://localhost:5220'; // Change this to match your TPServer API URL

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // If the token exists, add it to the headers
    const tokenValue = get(token);
    if (tokenValue) {
      config.headers.Authorization = `Bearer ${tokenValue}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle unauthorized errors (expired token or not authenticated)
    if (error.response && error.response.status === 401) {
      // Clear token from store
      token.set(null);
      
      if (browser) {
        // Redirect to login page
        goto('/login');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;