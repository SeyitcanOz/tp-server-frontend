import api from './api';
import type { 
  PagedResponse, 
  ProjectSummary, 
  ProjectDetail, 
  CreateProjectRequest, 
  UpdateProjectRequest 
} from '$lib/types/project';
import { cache, withCache, getCacheKey } from '$lib/stores/cache';

/**
 * Project service for managing project-related API operations
 */
export const projectService = {
  /**
   * Get a paginated list of projects with filtering and sorting
   */
  async getProjects(
    pageNumber: number = 1,
    pageSize: number = 20,
    options: {
      userId?: string;
      searchTerm?: string;
      modellingType?: string;
      sortBy?: string;
      sortDescending?: boolean;
    } = {}
  ): Promise<PagedResponse<ProjectSummary>> {
    const { userId, searchTerm, modellingType, sortBy, sortDescending } = options;
    
    const cacheKey = getCacheKey('projects', undefined, {
      pageNumber,
      pageSize,
      userId,
      searchTerm,
      modellingType,
      sortBy,
      sortDescending
    });
    
    return withCache(cacheKey, async () => {
      const response = await api.get<PagedResponse<ProjectSummary>>('/api/projects', {
        params: {
          pageNumber,
          pageSize,
          userId,
          searchTerm,
          modellingType,
          sortBy,
          sortDescending
        }
      });
      
      return response.data;
    }, 60); // Cache for 1 minute
  },

  /**
   * Get a project by ID
   */
  async getProjectById(id: string): Promise<ProjectDetail> {
    const cacheKey = getCacheKey('project', id);
    
    return withCache(cacheKey, async () => {
      const response = await api.get<ProjectDetail>(`/api/projects/${id}`);
      return response.data;
    }, 300); // Cache for 5 minutes
  },

  /**
   * Get available modelling types for filtering
   */
  async getModellingTypes(): Promise<string[]> {
    const cacheKey = getCacheKey('modellingTypes');
    
    return withCache(cacheKey, async () => {
      const response = await api.get<string[]>('/api/projects/modelling-types');
      return response.data;
    }, 3600); // Cache for 1 hour since this rarely changes
  },

  /**
   * Create a new project
   */
  async createProject(project: CreateProjectRequest): Promise<ProjectDetail> {
    const response = await api.post<ProjectDetail>('/api/projects', project);
    
    // Clear projects list cache after creating a new project
    cache.clearByPrefix('projects');
    
    return response.data;
  },

  /**
   * Update an existing project
   */
  async updateProject(id: string, project: UpdateProjectRequest): Promise<ProjectDetail> {
    const response = await api.put<ProjectDetail>(`/api/projects/${id}`, project);
    
    // Clear specific project cache and projects list cache
    cache.remove(getCacheKey('project', id));
    cache.clearByPrefix('projects');
    
    return response.data;
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/api/projects/${id}`);
    
    // Clear specific project cache and projects list cache
    cache.remove(getCacheKey('project', id));
    cache.clearByPrefix('projects');
    cache.clearByPrefix(`versions:project:${id}`); // Clear related versions cache
  }
};

export default projectService;