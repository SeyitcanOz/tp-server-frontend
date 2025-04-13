<script lang="ts">
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    
    // Define API endpoint types
    type StatusCode = {
      code: number;
      description: string;
    };
    
    type ApiEndpoint = {
      method: string;
      path: string;
      description: string;
      authorization?: string;
      pathParams?: Record<string, string>;
      queryParams?: Record<string, string>;
      requestBody?: Record<string, string>;
      responseBody?: Record<string, string>;
      responseType?: string;
      notes?: string;
      statusCodes: StatusCode[];
    };
    
    type ApiCategory = {
      name: string;
      endpoints: ApiEndpoint[];
    };
    
    // Define API endpoint categories
    const apiCategories: ApiCategory[] = [
      {
        name: 'Authentication',
        endpoints: [
          {
            method: 'POST',
            path: '/api/auth/login',
            description: 'Authenticates a user and returns a JWT token',
            requestBody: {
              username: 'string (required)',
              password: 'string (required)'
            },
            responseBody: {
              id: 'string',
              username: 'string',
              roles: 'string[]',
              token: 'string',
              expiration: 'date-time string'
            },
            statusCodes: [
              { code: 200, description: 'Successfully authenticated' },
              { code: 401, description: 'Invalid username or password' }
            ]
          },
          {
            method: 'POST',
            path: '/api/auth/register',
            description: 'Registers a new user (Admin only)',
            authorization: 'Admin role required',
            requestBody: {
              username: 'string (required)',
              password: 'string (required)',
              confirmPassword: 'string (required)'
            },
            queryParams: {
              roles: 'Optional list of roles to assign to the user (defaults to Engineer if not specified)'
            },
            responseBody: {
              id: 'string',
              username: 'string',
              roles: 'string[]',
              token: 'string',
              expiration: 'date-time string'
            },
            statusCodes: [
              { code: 201, description: 'User successfully registered' },
              { code: 400, description: 'Validation error (e.g., passwords do not match, username taken)' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not an admin)' }
            ]
          }
        ]
      },
      {
        name: 'User Management',
        endpoints: [
          {
            method: 'GET',
            path: '/api/users/me',
            description: 'Gets the current user\'s profile information',
            authorization: 'Authentication required',
            responseBody: {
              id: 'string',
              username: 'string',
              roles: 'string[]'
            },
            statusCodes: [
              { code: 200, description: 'Successfully retrieved user profile' },
              { code: 401, description: 'Unauthorized' }
            ]
          },
          {
            method: 'GET',
            path: '/api/users/{id}',
            description: 'Gets a user by ID (Admin only)',
            authorization: 'Admin role required',
            pathParams: {
              id: 'string (required) - User ID'
            },
            responseBody: {
              id: 'string',
              username: 'string',
              roles: 'string[]'
            },
            statusCodes: [
              { code: 200, description: 'Successfully retrieved user profile' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not an admin)' },
              { code: 404, description: 'User not found' }
            ]
          }
        ]
      },
      {
        name: 'Projects',
        endpoints: [
          {
            method: 'GET',
            path: '/api/projects',
            description: 'Get a paginated list of projects',
            authorization: 'Authentication required',
            queryParams: {
              pageNumber: 'integer (default: 1) - Page number for pagination',
              pageSize: 'integer (default: 20) - Number of items per page',
              userId: 'string (optional) - Filter projects by user ID (admin only)'
            },
            responseBody: {
              items: 'ProjectSummaryResponse[]',
              pageNumber: 'integer',
              pageSize: 'integer',
              totalCount: 'integer',
              totalPages: 'integer',
              hasNextPage: 'boolean',
              hasPreviousPage: 'boolean'
            },
            notes: 'Non-admin users will only see their own projects regardless of the userId parameter',
            statusCodes: [
              { code: 200, description: 'Successfully retrieved projects' },
              { code: 401, description: 'Unauthorized' }
            ]
          },
          {
            method: 'GET',
            path: '/api/projects/{id}',
            description: 'Get a project by ID',
            authorization: 'Authentication required',
            pathParams: {
              id: 'string (required) - Project ID'
            },
            responseBody: {
              id: 'string',
              projectName: 'string',
              modellingType: 'string',
              createdBy: 'string',
              createdAt: 'date-time string',
              updatedAt: 'date-time string',
              currentVersion: 'integer'
            },
            notes: 'Users can only view projects they created unless they are admins',
            statusCodes: [
              { code: 200, description: 'Successfully retrieved project' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' },
              { code: 404, description: 'Project not found' }
            ]
          },
          {
            method: 'POST',
            path: '/api/projects',
            description: 'Create a new project',
            authorization: 'Admin or Engineer role required',
            requestBody: {
              projectName: 'string (required) - Format: XX-XX-MXX-XX or XX-XX-MXX-XX-X',
              modellingType: 'string (required)',
              projectData: 'object (required) - JSON data for the project',
              modelInfoData: 'object (optional) - Additional model information',
              dotModelData: 'object (optional) - Dot model data',
              modelInputData: 'object (optional) - Model input data',
              resultsData: 'object (optional) - Results data'
            },
            responseBody: {
              id: 'string',
              projectName: 'string',
              modellingType: 'string',
              createdBy: 'string',
              createdAt: 'date-time string',
              updatedAt: 'date-time string',
              currentVersion: 'integer'
            },
            statusCodes: [
              { code: 201, description: 'Successfully created project' },
              { code: 400, description: 'Validation error' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not an admin or engineer)' }
            ]
          },
          {
            method: 'PUT',
            path: '/api/projects/{id}',
            description: 'Update an existing project',
            authorization: 'Project owner or Admin required',
            pathParams: {
              id: 'string (required) - Project ID'
            },
            requestBody: {
              projectName: 'string (required) - Format: XX-XX-MXX-XX or XX-XX-MXX-XX-X',
              modellingType: 'string (required)'
            },
            responseBody: {
              id: 'string',
              projectName: 'string',
              modellingType: 'string',
              createdBy: 'string',
              createdAt: 'date-time string',
              updatedAt: 'date-time string',
              currentVersion: 'integer'
            },
            statusCodes: [
              { code: 200, description: 'Successfully updated project' },
              { code: 400, description: 'Validation error' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not owner or admin)' },
              { code: 404, description: 'Project not found' }
            ]
          },
          {
            method: 'DELETE',
            path: '/api/projects/{id}',
            description: 'Delete a project',
            authorization: 'Admin role required',
            pathParams: {
              id: 'string (required) - Project ID'
            },
            statusCodes: [
              { code: 204, description: 'Successfully deleted project' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not an admin)' },
              { code: 404, description: 'Project not found' }
            ]
          }
        ]
      },
      {
        name: 'Versions',
        endpoints: [
          {
            method: 'GET',
            path: '/api/versions/project/{projectId}',
            description: 'Get all versions for a project',
            authorization: 'Authentication required',
            pathParams: {
              projectId: 'string (required) - Project ID'
            },
            queryParams: {
              pageNumber: 'integer (default: 1) - Page number for pagination',
              pageSize: 'integer (default: 10) - Number of items per page'
            },
            responseBody: {
              items: 'VersionSummaryResponse[]',
              pageNumber: 'integer',
              pageSize: 'integer',
              totalCount: 'integer',
              totalPages: 'integer',
              hasNextPage: 'boolean',
              hasPreviousPage: 'boolean'
            },
            notes: 'Users can only view versions for projects they created unless they are admins',
            statusCodes: [
              { code: 200, description: 'Successfully retrieved project versions' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' },
              { code: 404, description: 'Project not found' }
            ]
          },
          {
            method: 'GET',
            path: '/api/versions/{projectId}/{versionNumber}',
            description: 'Get a specific version of a project',
            authorization: 'Authentication required',
            pathParams: {
              projectId: 'string (required) - Project ID',
              versionNumber: 'integer (required) - Version number'
            },
            responseBody: {
              id: 'string',
              projectId: 'string',
              versionNumber: 'integer',
              projectData: 'object',
              modelInfoData: 'object | null',
              dotModelData: 'object | null',
              modelInputData: 'object | null',
              resultsData: 'object | null',
              createdAt: 'date-time string'
            },
            notes: 'Users can only view versions for projects they created unless they are admins',
            statusCodes: [
              { code: 200, description: 'Successfully retrieved version' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' },
              { code: 404, description: 'Project or version not found' }
            ]
          },
          {
            method: 'POST',
            path: '/api/versions',
            description: 'Create a new version for a project',
            authorization: 'Project owner or Admin required',
            requestBody: {
              projectId: 'string (required)',
              projectData: 'object (required) - JSON data for the project',
              modelInfoData: 'object (optional) - Additional model information',
              dotModelData: 'object (optional) - Dot model data',
              modelInputData: 'object (optional) - Model input data',
              resultsData: 'object (optional) - Results data'
            },
            responseBody: {
              id: 'string',
              projectId: 'string',
              versionNumber: 'integer',
              projectData: 'object',
              modelInfoData: 'object | null',
              dotModelData: 'object | null',
              modelInputData: 'object | null',
              resultsData: 'object | null',
              createdAt: 'date-time string'
            },
            statusCodes: [
              { code: 201, description: 'Successfully created version' },
              { code: 400, description: 'Validation error' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not owner or admin)' },
              { code: 404, description: 'Project not found' }
            ]
          },
          {
            method: 'GET',
            path: '/api/versions',
            description: 'Get all versions across all projects with filtering options',
            authorization: 'Authentication required',
            queryParams: {
              userId: 'string (optional) - Filter by user ID (admin only)',
              pageNumber: 'integer (default: 1) - Page number for pagination',
              pageSize: 'integer (default: 10) - Number of items per page'
            },
            responseBody: {
              items: 'VersionSummaryResponse[]',
              pageNumber: 'integer',
              pageSize: 'integer',
              totalCount: 'integer',
              totalPages: 'integer',
              hasNextPage: 'boolean',
              hasPreviousPage: 'boolean'
            },
            notes: 'Non-admin users will only see versions for their own projects regardless of the userId parameter',
            statusCodes: [
              { code: 200, description: 'Successfully retrieved versions' },
              { code: 401, description: 'Unauthorized' }
            ]
          },
          {
            method: 'POST',
            path: '/api/versions/{projectId}/{versionNumber}/setcurrent',
            description: 'Mark a version as the current version for a project',
            authorization: 'Project owner or Admin required',
            pathParams: {
              projectId: 'string (required) - Project ID',
              versionNumber: 'integer (required) - Version number'
            },
            statusCodes: [
              { code: 200, description: 'Successfully set current version' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden (not owner or admin)' },
              { code: 404, description: 'Project or version not found' }
            ]
          }
        ]
      },
      {
        name: 'Downloads',
        endpoints: [
          {
            method: 'GET',
            path: '/api/download/project/{projectId}/zip',
            description: 'Downloads a project as a zip folder containing all necessary files',
            authorization: 'Authentication required',
            pathParams: {
              projectId: 'string (required) - Project ID'
            },
            queryParams: {
              versionNumber: 'integer (optional) - Defaults to latest version'
            },
            responseType: 'application/zip (file download)',
            notes: 'Users can only download projects they created unless they are admins',
            statusCodes: [
              { code: 200, description: 'Successfully downloaded zip file' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' },
              { code: 404, description: 'Project or version not found' }
            ]
          },
          {
            method: 'GET',
            path: '/api/download/project/{projectId}/dotmodel',
            description: 'Downloads the DotModel file for a project',
            authorization: 'Authentication required',
            pathParams: {
              projectId: 'string (required) - Project ID'
            },
            queryParams: {
              versionNumber: 'integer (optional) - Defaults to latest version'
            },
            responseType: 'application/octet-stream (file download)',
            notes: 'Users can only download models they created unless they are admins',
            statusCodes: [
              { code: 200, description: 'Successfully downloaded model file' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' },
              { code: 404, description: 'Project, version, or model data not found' }
            ]
          },
          {
            method: 'GET',
            path: '/api/download/project/{projectId}/results-csv',
            description: 'Downloads results data as CSV for a specific project',
            authorization: 'Authentication required',
            pathParams: {
              projectId: 'string (required) - Project ID'
            },
            queryParams: {
              versionNumber: 'integer (optional) - Defaults to latest version'
            },
            responseType: 'text/csv (file download)',
            notes: 'Users can only download results they created unless they are admins',
            statusCodes: [
              { code: 200, description: 'Successfully downloaded CSV file' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' },
              { code: 404, description: 'Project, version, or results data not found' }
            ]
          },
          {
            method: 'GET',
            path: '/api/download/all-projects/results-csv',
            description: 'Downloads results data as CSV for all projects (latest versions only)',
            authorization: 'Authentication required',
            responseType: 'text/csv (file download)',
            notes: 'Non-admin users will only see results for their own projects',
            statusCodes: [
              { code: 200, description: 'Successfully downloaded CSV file' },
              { code: 401, description: 'Unauthorized' },
              { code: 403, description: 'Forbidden' }
            ]
          }
        ]
      }
    ];
    
    // Keep track of which category is expanded
    let expandedCategory = 'Authentication';
    
    // Toggle category expansion
    function toggleCategory(category: string) {
      expandedCategory = expandedCategory === category ? '' : category;
    }
    
    // Format HTTP method with color
    function getMethodClass(method: string): string {
      switch (method) {
        case 'GET':
          return 'method-get';
        case 'POST':
          return 'method-post';
        case 'PUT':
          return 'method-put';
        case 'DELETE':
          return 'method-delete';
        default:
          return '';
      }
    }
    
    // Check if user is authenticated on mount
    onMount(() => {
      if (!$user) {
        goto('/login');
      }
    });
    
    // Handle keyboard events for accessibility
    function handleKeydown(event: KeyboardEvent, category: string) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleCategory(category);
      }
    }
  </script>
  
  <svelte:head>
    <title>API Documentation - TPServer</title>
    <meta name="description" content="TPServer API documentation and reference" />
  </svelte:head>
  
  <div class="page-container">
    <header class="page-header">
      <div class="header-content">
        <h1>API Documentation</h1>
        <p class="description">Reference guide for the TPServer REST API endpoints.</p>
      </div>
    </header>
    
    <div class="content-container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Endpoints</h2>
        </div>
        <nav class="sidebar-nav">
          {#each apiCategories as category}
            <button 
              class="sidebar-category" 
              class:active={expandedCategory === category.name}
              on:click={() => toggleCategory(category.name)}
              on:keydown={(e) => handleKeydown(e, category.name)}
              aria-expanded={expandedCategory === category.name}
              aria-controls={category.name.toLowerCase().replace(/\s+/g, '-')}
            >
              <span class="category-name">{category.name}</span>
              <span class="endpoint-count">{category.endpoints.length}</span>
            </button>
          {/each}
        </nav>
      </aside>
      
      <main class="main-content">
        {#each apiCategories as category}
          <section 
            class="api-category" 
            id={category.name.toLowerCase().replace(/\s+/g, '-')}
            class:visible={expandedCategory === category.name}
          >
            <div class="category-header">
              <h2>{category.name}</h2>
              <div class="endpoint-count-badge">{category.endpoints.length} Endpoints</div>
            </div>
            
            {#each category.endpoints as endpoint}
              <div class="endpoint-card">
                <div class="endpoint-header">
                  <div class="endpoint-method-path">
                    <span class={`endpoint-method ${getMethodClass(endpoint.method)}`}>{endpoint.method}</span>
                    <code class="endpoint-path">{endpoint.path}</code>
                  </div>
                  {#if endpoint.authorization}
                    <div class="endpoint-auth">
                      <span class="material-icons">lock</span>
                      <span>{endpoint.authorization}</span>
                    </div>
                  {/if}
                </div>
                
                <div class="endpoint-description">
                  <p>{endpoint.description}</p>
                  {#if endpoint.notes}
                    <div class="endpoint-notes">
                      <span class="material-icons">info</span>
                      <p>{endpoint.notes}</p>
                    </div>
                  {/if}
                </div>
                
                <div class="endpoint-details">
                  {#if endpoint.pathParams}
                    <div class="params-section">
                      <h4>Path Parameters</h4>
                      <table class="params-table">
                        <tbody>
                          {#each Object.entries(endpoint.pathParams) as [name, description]}
                            <tr>
                              <td class="param-name">{name}</td>
                              <td class="param-description">{description}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {/if}
                  
                  {#if endpoint.queryParams}
                    <div class="params-section">
                      <h4>Query Parameters</h4>
                      <table class="params-table">
                        <tbody>
                          {#each Object.entries(endpoint.queryParams) as [name, description]}
                            <tr>
                              <td class="param-name">{name}</td>
                              <td class="param-description">{description}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {/if}
                  
                  {#if endpoint.requestBody}
                    <div class="params-section">
                      <h4>Request Body</h4>
                      <table class="params-table">
                        <tbody>
                          {#each Object.entries(endpoint.requestBody) as [name, description]}
                            <tr>
                              <td class="param-name">{name}</td>
                              <td class="param-description">{description}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {/if}
                  
                  {#if endpoint.responseBody}
                    <div class="params-section">
                      <h4>Response Body</h4>
                      <table class="params-table">
                        <tbody>
                          {#each Object.entries(endpoint.responseBody) as [name, description]}
                            <tr>
                              <td class="param-name">{name}</td>
                              <td class="param-description">{description}</td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  {/if}
                  
                  {#if endpoint.responseType}
                    <div class="params-section">
                      <h4>Response Type</h4>
                      <p class="response-type">{endpoint.responseType}</p>
                    </div>
                  {/if}
                  
                  <div class="params-section">
                    <h4>Status Codes</h4>
                    <table class="status-codes-table">
                      <tbody>
                        {#each endpoint.statusCodes as statusCode}
                          <tr>
                            <td class="status-code">
                              <span class={`status-badge status-${Math.floor(statusCode.code / 100)}xx`}>
                                {statusCode.code}
                              </span>
                            </td>
                            <td class="status-description">{statusCode.description}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            {/each}
          </section>
        {/each}
      </main>
    </div>
  </div>
  
  <style>
    /* Main Layout */
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.8rem;
    }
    
    .page-header {
      margin-bottom: 1.5rem;
    }
    
    .header-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    h1 {
      font-size: 1.5rem;
      margin: 0;
      color: #1e3a8a;
      font-weight: 500;
    }
    
    .description {
      margin: 0;
      color: #64748b;
      font-size: 0.9rem;
    }
    
    .content-container {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    /* Sidebar */
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      height: fit-content;
      position: sticky;
      top: 80px;
    }
    
    .sidebar-header {
      padding: 1rem;
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .sidebar-header h2 {
      margin: 0;
      font-size: 1rem;
      color: #1e3a8a;
      font-weight: 500;
    }
    
    .sidebar-nav {
      padding: 0.5rem;
    }
    
    .sidebar-category {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 0.25rem;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      font-family: inherit;
      font-size: inherit;
    }
    
    .sidebar-category:hover {
      background-color: #f1f5f9;
    }
    
    .sidebar-category.active {
      background-color: #5c9fff;
      color: white;
    }
    
    .category-name {
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .endpoint-count {
      font-size: 0.75rem;
      background-color: rgba(0, 0, 0, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 10px;
    }
    
    /* Main Content */
    .main-content {
      flex: 1;
      min-width: 0;
    }
    
    .api-category {
      display: none;
      margin-bottom: 2rem;
    }
    
    .api-category.visible {
      display: block;
    }
    
    .category-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .category-header h2 {
      margin: 0;
      font-size: 1.2rem;
      color: #1e3a8a;
      font-weight: 500;
    }
    
    .endpoint-count-badge {
      font-size: 0.75rem;
      background-color: #f1f5f9;
      color: #64748b;
      padding: 0.25rem 0.5rem;
      border-radius: 10px;
    }
    
    /* Endpoint Cards */
    .endpoint-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 1rem;
      overflow: hidden;
    }
    
    .endpoint-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .endpoint-method-path {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .endpoint-method {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .method-get {
      background-color: #dbeafe;
      color: #1e40af;
    }
    
    .method-post {
      background-color: #dcfce7;
      color: #16a34a;
    }
    
    .method-put {
      background-color: #fef3c7;
      color: #d97706;
    }
    
    .method-delete {
      background-color: #fee2e2;
      color: #dc2626;
    }
    
    .endpoint-path {
      font-size: 0.85rem;
      color: #1e293b;
      font-family: 'Courier New', monospace;
    }
    
    .endpoint-auth {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      color: #64748b;
    }
    
    .endpoint-auth .material-icons {
      font-size: 0.85rem;
    }
    
    .endpoint-description {
      padding: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .endpoint-description p {
      margin: 0;
      font-size: 0.9rem;
      color: #334155;
    }
    
    .endpoint-notes {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.5rem;
      background-color: #f8fafc;
      border-radius: 4px;
    }
    
    .endpoint-notes .material-icons {
      font-size: 1rem;
      color: #5c9fff;
    }
    
    .endpoint-notes p {
      margin: 0;
      font-size: 0.8rem;
      color: #64748b;
    }
    
    .endpoint-details {
      padding: 1rem;
    }
    
    .params-section {
      margin-bottom: 1.25rem;
    }
    
    .params-section h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: #1e3a8a;
      font-weight: 500;
    }
    
    .params-table, .status-codes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    
    .params-table td, .status-codes-table td {
      padding: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .params-table tr:last-child td, .status-codes-table tr:last-child td {
      border-bottom: none;
    }
    
    .param-name {
      font-weight: 500;
      color: #334155;
      min-width: 120px;
      white-space: nowrap;
      padding-right: 1rem;
    }
    
    .param-description {
      color: #64748b;
    }
    
    .response-type {
      font-size: 0.85rem;
      color: #64748b;
      font-family: 'Courier New', monospace;
      margin: 0.25rem 0;
    }
    
    .status-code {
      width: 80px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-weight: 600;
      text-align: center;
      min-width: 40px;
    }
    
    .status-2xx {
      background-color: #dcfce7;
      color: #16a34a;
    }
    
    .status-4xx {
      background-color: #fee2e2;
      color: #dc2626;
    }
    
    .status-5xx {
      background-color: #f1f5f9;
      color: #64748b;
    }
    
    .status-description {
      color: #64748b;
    }
    
    /* Responsive Styles */
    @media (max-width: 992px) {
      .content-container {
        flex-direction: column;
      }
      
      .sidebar {
        width: 100%;
        position: static;
      }
      
      .sidebar-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .sidebar-category {
        width: auto;
        margin-bottom: 0;
      }
    }
    
    @media (max-width: 768px) {
      .endpoint-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .endpoint-auth {
        margin-left: 0.5rem;
      }
      
      .params-table, .status-codes-table {
        display: block;
        overflow-x: auto;
      }
    }
  </style>