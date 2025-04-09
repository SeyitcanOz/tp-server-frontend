/**
 * Basic information about a version for list views
 */
export interface VersionSummary {
    id: string;
    projectId: string;
    versionNumber: number;
    createdAt: string;
  }
  
  /**
   * Generic JSON object type for project data
   */
  export type JsonObject = Record<string, unknown>;
  
  /**
   * Complete information about a project version including all data
   */
  export interface ProjectVersion {
    id: string;
    projectId: string;
    versionNumber: number;
    projectData: JsonObject;
    modelInfoData?: JsonObject;
    dotModelData?: JsonObject;
    modelInputData?: JsonObject;
    resultsData?: JsonObject;
    createdAt: string;
  }
  
  /**
   * Request to create a new version of a project
   */
  export interface CreateVersionRequest {
    projectId: string;
    projectData: JsonObject;
    modelInfoData?: JsonObject;
    dotModelData?: JsonObject;
    modelInputData?: JsonObject;
    resultsData?: JsonObject;
  }