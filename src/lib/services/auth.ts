import api from './api';
import { token, user } from '../stores/auth';
import type { LoginRequest, AuthResponse, User } from '../types/auth';
import { browser } from '$app/environment';
import userService from './user';
import { cache } from '../stores/cache';

/**
 * User authentication service
 */
export const authService = {
  /**
   * Log in a user
   * @param credentials Login credentials (username and password)
   * @returns Promise with user data
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);
    
    // Store authentication data
    token.set(response.data.token);
    user.set({
      id: response.data.id,
      username: response.data.username,
      roles: response.data.roles
    });
    
    // Cache current user data
    cache.set('currentUser', {
      id: response.data.id,
      username: response.data.username,
      roles: response.data.roles
    }, 600); // Cache for 10 minutes
    
    return response.data;
  },
  
  /**
   * Refresh the current user data from the server
   */
  async refreshUserData(): Promise<User | null> {
    try {
      if (this.isAuthenticated()) {
        const userData = await userService.getCurrentUser();
        user.set(userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  },
  
  /**
   * Log out the current user
   */
  logout(): void {
    token.set(null);
    user.set(null);
    
    // Clear user-related caches
    cache.remove('currentUser');
    // Consider if you want to clear all cache on logout
    // cache.clear();
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Only access localStorage in browser environment
    if (!browser) return false;
    
    const tokenValue = localStorage.getItem('token');
    return !!tokenValue;
  },
  
  /**
   * Check if the current user has a specific role
   * @param role Role to check
   */
  hasRole(role: string): boolean {
    // Only access localStorage in browser environment
    if (!browser) return false;
    
    // Try to get from cache first
    const cachedUser = cache.get<User>('currentUser');
    if (cachedUser) {
      return cachedUser.roles && cachedUser.roles.includes(role);
    }
    
    // Fall back to localStorage
    const userData = localStorage.getItem('user');
    if (!userData) return false;
    
    try {
      const parsedUser = JSON.parse(userData) as User;
      return parsedUser.roles && parsedUser.roles.includes(role);
    } catch {
      return false;
    }
  }
};

export default authService;