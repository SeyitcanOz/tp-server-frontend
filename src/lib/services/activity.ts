import api from './api';
import type { PagedResponse } from '$lib/types/project';

// Define activity types based on the server-side models
export interface ActivityResponse {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  entityId: string;
  entityType: string;
  actionType: string;
  details: string;
}

export interface GetActivitiesRequest {
  pageNumber?: number;
  pageSize?: number;
  userId?: string;
  projectId?: string;
  entityType?: string;
  actionType?: string;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: string;
  sortDescending?: boolean;
}

/**
 * Activity service for managing activity logs
 */
export const activityService = {
  /**
   * Get all activities with filtering (Admin only)
   */
  async getActivities(options: GetActivitiesRequest = {}): Promise<PagedResponse<ActivityResponse>> {
    const {
      pageNumber = 1,
      pageSize = 20,
      userId,
      projectId,
      entityType,
      actionType,
      fromDate,
      toDate,
      sortBy,
      sortDescending = true
    } = options;
    
    const response = await api.get<PagedResponse<ActivityResponse>>('/api/activities', {
      params: {
        pageNumber,
        pageSize,
        userId,
        projectId,
        entityType,
        actionType,
        fromDate: fromDate?.toISOString(),
        toDate: toDate?.toISOString(),
        sortBy,
        sortDescending
      }
    });
    
    return response.data;
  },

  /**
   * Get activities for the current user
   */
  async getMyActivities(
    pageNumber: number = 1,
    pageSize: number = 20,
    sortBy?: string,
    sortDescending: boolean = true
  ): Promise<PagedResponse<ActivityResponse>> {
    const response = await api.get<PagedResponse<ActivityResponse>>('/api/activities/me', {
      params: {
        pageNumber,
        pageSize,
        sortBy,
        sortDescending
      }
    });
    
    return response.data;
  },

  /**
   * Get activities for a specific project
   */
  async getProjectActivities(
    projectId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    sortBy?: string,
    sortDescending: boolean = true
  ): Promise<PagedResponse<ActivityResponse>> {
    const response = await api.get<PagedResponse<ActivityResponse>>(`/api/activities/project/${projectId}`, {
      params: {
        pageNumber,
        pageSize,
        sortBy,
        sortDescending
      }
    });
    
    return response.data;
  },

  /**
   * Get activities for a specific user (Admin only)
   */
  async getUserActivities(
    userId: string,
    pageNumber: number = 1,
    pageSize: number = 20,
    sortBy?: string,
    sortDescending: boolean = true
  ): Promise<PagedResponse<ActivityResponse>> {
    const response = await api.get<PagedResponse<ActivityResponse>>(`/api/activities/user/${userId}`, {
      params: {
        pageNumber,
        pageSize,
        sortBy,
        sortDescending
      }
    });
    
    return response.data;
  }
};

export default activityService;