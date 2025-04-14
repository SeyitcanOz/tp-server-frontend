import api from './api';
import type { PagedResponse } from '$lib/types/project';
import type { 
  VersionSummary, 
  ProjectVersion, 
  CreateVersionRequest 
} from '$lib/types/version';

/**
 * Version service for managing version-related API operations
 */
export const versionService = {
  /**
   * Get all versions with filtering and sorting
   */
  async getVersions(
    pageNumber: number = 1,
    pageSize: number = 10,
    options: {
      userId?: string;
      projectId?: string;
      sortBy?: string;
      sortDescending?: boolean;
    } = {}
  ): Promise<PagedResponse<VersionSummary>> {
    const { userId, projectId, sortBy, sortDescending } = options;
    
    const response = await api.get<PagedResponse<VersionSummary>>('/api/versions', {
      params: {
        pageNumber,
        pageSize,
        userId,
        projectId,
        sortBy,
        sortDescending
      }
    });
    
    return response.data;
  },

  /**
   * Get a specific version of a project
   */
  async getVersion(projectId: string, versionNumber: number): Promise<ProjectVersion> {
    const response = await api.get<ProjectVersion>(`/api/versions/${projectId}/${versionNumber}`);
    return response.data;
  },

  /**
   * Get all versions for a specific project with pagination and sorting
   */
  async getProjectVersions(
    projectId: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    options: {
      sortBy?: string;
      sortDescending?: boolean;
    } = {}
  ): Promise<PagedResponse<VersionSummary>> {
    const { sortBy, sortDescending } = options;
    
    const response = await api.get<PagedResponse<VersionSummary>>(`/api/versions/project/${projectId}`, {
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
   * Create a new version for a project
   */
  async createVersion(version: CreateVersionRequest): Promise<ProjectVersion> {
    const response = await api.post<ProjectVersion>('/api/versions', version);
    return response.data;
  },

  /**
   * Set a version as the current version for a project
   */
  async setCurrentVersion(projectId: string, versionNumber: number): Promise<void> {
    await api.post(`/api/versions/${projectId}/${versionNumber}/setcurrent`);
  }
};

export default versionService;