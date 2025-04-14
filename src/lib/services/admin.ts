import api from './api';
import type { AuthResponse, RegisterRequest } from '$lib/types/auth';

/**
 * Admin service for managing admin-only operations
 */
export const adminService = {
  /**
   * Register a new user (Admin only)
   * @param request Registration data
   * @param roles Optional list of roles to assign
   * @returns Promise with registration response
   */
  async registerUser(request: RegisterRequest, roles?: string[]): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', request, {
        params: { roles }
      });
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }
};

export default adminService;