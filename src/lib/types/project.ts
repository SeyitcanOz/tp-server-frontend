/**
 * Basic information about a project for list views
 */
export interface ProjectSummary {
    id: string;
    projectName: string;
    modellingType: string;
    createdBy: string;
    updatedAt: string;
    currentVersion: number;
  }
  
  /**
   * Detailed project information including metadata
   */
  export interface ProjectDetail {
    id: string;
    projectName: string;
    modellingType: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    currentVersion: number;
  }
  
  /**
   * Request to create a new project with initial data
   */
  export interface CreateProjectRequest {
    projectName: string;
    modellingType: string;
    projectData: unknown;
    modelInfoData?: unknown;
    dotModelData?: unknown;
    modelInputData?: unknown;
    resultsData?: unknown;
  }
  
  /**
   * Request to update project metadata
   */
  export interface UpdateProjectRequest {
    projectName: string;
    modellingType: string;
  }
  
  /**
   * Paginated response for lists of items
   */
  export interface PagedResponse<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }