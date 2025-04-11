import api from './api';
import type { User } from '../types/auth';

/**
 * User service for managing user operations
 */
export const userService = {
  /**
   * Get the current user's profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/users/me');
    return response.data;
  },

   /**
   * Get a user by ID (admin only)
   * @param userId The user ID to fetch
   */
   async getUserById(userId: string): Promise<User> {
    try {
      const response = await api.get<User>(`/api/users/${userId}`);
      return response.data;
    } catch (error: unknown) {
      // Type guard to check if error is an Axios error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        // If there's a 403 Forbidden error, it means the user doesn't have admin privileges
        if (axiosError.response?.status === 403 || axiosError.response?.status === 401) {
          throw new Error('You do not have permission to view this user');
        }
      }
      
      // For other errors (like 404), throw a general error
      throw new Error('Failed to load user details');
    }
  },

  /**
   * Get multiple users by their IDs (for the project list page)
   * This is a workaround since we don't have a batch endpoint on the backend
   * In a real application, you'd want to add a batch endpoint
   * @param userIds Array of user IDs to fetch
   */
  async getUsersByIds(userIds: string[]): Promise<Record<string, string>> {
    const userMap: Record<string, string> = {};
    
    // Fetch users one by one (not ideal for performance)
    // In a real app, you'd implement a batch endpoint on the backend
    for (const userId of userIds) {
      try {
        const user = await this.getUserById(userId);
        userMap[userId] = user.username;
      } catch (error: unknown) {
        console.error(`Error fetching user ${userId}:`, error);
        userMap[userId] = 'Unknown User';
      }
    }
    
    return userMap;
  }
};

export default userService;