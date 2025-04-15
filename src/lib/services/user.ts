import api from './api';
import type { User } from '$lib/types/auth';
import { cache, withCache, getCacheKey } from '$lib/stores/cache';

/**
 * User service for managing user operations
 */
export const userService = {
  /**
   * Get the current user's profile
   */
  async getCurrentUser(): Promise<User> {
    const cacheKey = getCacheKey('currentUser');
    
    return withCache(cacheKey, async () => {
      const response = await api.get<User>('/api/users/me');
      return response.data;
    }, 600); // Cache for 10 minutes
  },

   /**
   * Get a user by ID (admin only)
   * @param userId The user ID to fetch
   */
   async getUserById(userId: string): Promise<User> {
    const cacheKey = getCacheKey('user', userId);
    
    return withCache(cacheKey, async () => {
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
    }, 1800); // Cache for 30 minutes since user data rarely changes
  },

  /**
   * Get multiple users by their IDs (for the project list page)
   * This is a workaround since we don't have a batch endpoint on the backend
   * In a real application, you'd want to add a batch endpoint
   * @param userIds Array of user IDs to fetch
   */
  async getUsersByIds(userIds: string[]): Promise<Record<string, string>> {
    const userMap: Record<string, string> = {};
    
    // Check which user IDs are already in cache first
    const cachedUserIds: string[] = [];
    const uncachedUserIds: string[] = [];
    
    for (const userId of userIds) {
      const cacheKey = getCacheKey('user', userId);
      if (cache.has(cacheKey)) {
        cachedUserIds.push(userId);
      } else {
        uncachedUserIds.push(userId);
      }
    }
    
    // Get cached users
    for (const userId of cachedUserIds) {
      const user = cache.get<User>(getCacheKey('user', userId));
      if (user) {
        userMap[userId] = user.username;
      } else {
        uncachedUserIds.push(userId); // Failsafe: add to uncached if something went wrong
      }
    }
    
    // Fetch users one by one (not ideal for performance)
    // In a real app, you'd implement a batch endpoint on the backend
    for (const userId of uncachedUserIds) {
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