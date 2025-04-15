import api from './api';
import type { PagedResponse } from '$lib/types/project';
import type { 
  VersionSummary, 
  ProjectVersion, 
  CreateVersionRequest 
} from '$lib/types/version';
import { cache, withCache, getCacheKey } from '$lib/stores/cache';

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
    
    const cacheKey = getCacheKey('versions', undefined, {
      pageNumber,
      pageSize,
      userId,
      projectId,
      sortBy,
      sortDescending
    });
    
    return withCache(cacheKey, async () => {
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
    }, 60); // Cache for 1 minute
  },

  /**
   * Get a specific version of a project
   */
  async getVersion(projectId: string, versionNumber: number): Promise<ProjectVersion> {
    const cacheKey = getCacheKey('version', `${projectId}:${versionNumber}`);
    
    return withCache(cacheKey, async () => {
      const response = await api.get<ProjectVersion>(`/api/versions/${projectId}/${versionNumber}`);
      return response.data;
    }, 300); // Cache for 5 minutes
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
    
    const cacheKey = getCacheKey('versions:project', projectId, {
      pageNumber,
      pageSize,
      sortBy,
      sortDescending
    });
    
    return withCache(cacheKey, async () => {
      const response = await api.get<PagedResponse<VersionSummary>>(`/api/versions/project/${projectId}`, {
        params: {
          pageNumber,
          pageSize,
          sortBy,
          sortDescending
        }
      });
      
      return response.data;
    }, 120); // Cache for 2 minutes
  },

  /**
   * Create a new version for a project
   */
  async createVersion(version: CreateVersionRequest): Promise<ProjectVersion> {
    const response = await api.post<ProjectVersion>('/api/versions', version);
    
    // Clear related caches
    cache.clearByPrefix(`versions:project:${version.projectId}`);
    cache.clearByPrefix('versions');
    cache.remove(getCacheKey('project', version.projectId)); // Clear project cache as currentVersion changes
    
    return response.data;
  },

  /**
   * Set a version as the current version for a project
   */
  async setCurrentVersion(projectId: string, versionNumber: number): Promise<void> {
    await api.post(`/api/versions/${projectId}/${versionNumber}/setcurrent`);
    
    // Clear related caches
    cache.remove(getCacheKey('project', projectId));
    cache.clearByPrefix(`versions:project:${projectId}`);
    cache.clearByPrefix('versions');
  }
};

export default versionService;