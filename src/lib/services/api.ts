import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { token } from '../stores/auth';
import { cache } from '../stores/cache';

// Default API configuration
const API_URL = 'http://localhost:5220'; // Change this to match your TPServer API URL

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Only setup interceptors in the browser environment
if (browser) {
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
        
        // Clear user-related caches
        cache.remove('currentUser');
        cache.clearByPrefix('user');
        
        // Redirect to login page
        goto('/login');
      }
      
      return Promise.reject(error);
    }
  );
}

export default api;