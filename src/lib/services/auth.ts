import api from './api';
import { token, user } from '../stores/auth';
import type { LoginRequest, AuthResponse, User } from '../types/auth';
import { browser } from '$app/environment';

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
    
    return response.data;
  },
  
  /**
   * Log out the current user
   */
  logout(): void {
    token.set(null);
    user.set(null);
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