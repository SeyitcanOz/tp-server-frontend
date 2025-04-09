import { writable } from 'svelte/store';
import type { User } from '$lib/types/auth';
import { browser } from '$app/environment';

// Create writables for the token and user
const createTokenStore = () => {
  // Initialize with the token from localStorage if available (client-side only)
  const initialToken = browser ? localStorage.getItem('token') : null;
  const { subscribe, set } = writable<string | null>(initialToken);

  return {
    subscribe,
    set: (value: string | null) => {
      // Update localStorage when the token changes (client-side only)
      if (browser) {
        if (value) {
          localStorage.setItem('token', value);
        } else {
          localStorage.removeItem('token');
        }
      }
      set(value);
    }
  };
};

const createUserStore = () => {
  // Initialize with the user from localStorage if available (client-side only)
  let initialUser: User | null = null;
  
  if (browser) {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        initialUser = JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing stored user data:', e);
      }
    }
  }
  
  const { subscribe, set } = writable<User | null>(initialUser);

  return {
    subscribe,
    set: (value: User | null) => {
      // Update localStorage when the user changes (client-side only)
      if (browser) {
        if (value) {
          localStorage.setItem('user', JSON.stringify(value));
        } else {
          localStorage.removeItem('user');
        }
      }
      set(value);
    }
  };
};

// Export the stores
export const token = createTokenStore();
export const user = createUserStore();