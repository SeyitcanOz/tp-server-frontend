<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { user } from '$lib/stores/auth';
    import userService from '$lib/services/user';
    import api from '$lib/services/api';
    import type { ProjectDetail } from '$lib/types/project';
    import type { VersionSummary } from '$lib/types/version';
    
    // Project data
    let project: ProjectDetail | null = null;
    let versions: VersionSummary[] = [];
    let isLoadingProject = true;
    let isLoadingVersions = true;
    let error: string | null = null;
    let ownerUsername: string = '';
    
    // Extract project ID from URL
    $: projectId = $page.params.id;
    
    // Check if user is admin or project owner
    $: isAdminOrOwner = $user && ($user.roles.includes('Admin') || ($user.id === project?.createdBy));
    
    async function loadProject() {
      isLoadingProject = true;
      error = null;
      
      try {
        const response = await api.get<ProjectDetail>(`/api/projects/${projectId}`);
        project = response.data;
        
        // Load project owner details
        await loadOwnerDetails(project.createdBy);
      } catch (err) {
        console.error('Error fetching project details:', err);
        error = 'Failed to load project details. Please try again.';
      } finally {
        isLoadingProject = false;
      }
    }
    
    async function loadVersions() {
      isLoadingVersions = true;
      
      try {
        const response = await api.get<{ items: VersionSummary[] }>(`/api/versions/project/${projectId}`);
        versions = response.data.items;
      } catch (err) {
        console.error('Error fetching project versions:', err);
        // Don't set error here to avoid replacing the main error message
      } finally {
        isLoadingVersions = false;
      }
    }
    
    async function loadOwnerDetails(userId: string) {
      try {
        // If the owner is the current user, we already know the username
        if (userId === $user?.id) {
          ownerUsername = $user.username;
          return;
        }
        
        // If user is admin, try to fetch the owner details
        if ($user?.roles.includes('Admin')) {
          try {
            const userData = await userService.getUserById(userId);
            ownerUsername = userData.username;
          } catch (error) {
            console.error('Error loading owner details:', error);
            ownerUsername = 'User ' + userId.substring(0, 6) + '...';
          }
        } else {
          // For non-admin users, we might not have permission to get details
          ownerUsername = 'User ' + userId.substring(0, 6) + '...';
        }
      } catch (error) {
        console.error('Error loading owner details:', error);
        ownerUsername = 'User ' + userId.substring(0, 6) + '...';
      }
    }
    
    function formatDate(dateString: string): string {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    async function createNewVersion() {
      // Redirect to create version page
      window.location.href = `/projects/${projectId}/versions/new`;
    }
    
    async function deleteProject() {
      if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        return;
      }
      
      try {
        await api.delete(`/api/projects/${projectId}`);
        window.location.href = '/projects';
      } catch (err) {
        console.error('Error deleting project:', err);
        alert('Failed to delete project. Please try again.');
      }
    }
    
    onMount(() => {
      loadProject();
      loadVersions();
    });
  </script>
  
  <svelte:head>
    <title>{project ? `${project.projectName} - TPServer` : 'Project Details - TPServer'}</title>
    <meta name="description" content="Project details and versions" />
  </svelte:head>
  
  
  <div class="container project-container">
    {#if isLoadingProject}
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Loading project details...</p>
      </div>
    {:else if error}
      <div class="error-message">
        <p>{error}</p>
        <button class="btn" on:click={loadProject}>Try Again</button>
        <a href="/projects" class="btn">Back to Projects</a>
      </div>
    {:else if project}
      <div class="page-header">
        <div class="breadcrumbs">
          <a href="/projects">Projects</a> &gt; {project.projectName}
        </div>
        
        <div class="header-content">
          <div>
            <h1>{project.projectName}</h1>
            <p class="model-type">{project.modellingType}</p>
          </div>
          
          {#if isAdminOrOwner}
            <div class="header-actions">
              <button class="btn btn-primary" on:click={createNewVersion}>
                Create New Version
              </button>
              <button class="btn btn-outline" on:click={() => window.location.href = `/projects/${projectId}/edit`}>
                Edit Project
              </button>
              {#if $user?.roles.includes('Admin')}
                <button class="btn btn-danger" on:click={deleteProject}>
                  Delete Project
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
      
      <div class="project-info-card">
        <h2>Project Information</h2>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Project ID</span>
            <span class="value">{project.id}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Created By</span>
            <span class="value">{ownerUsername}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Created On</span>
            <span class="value">{formatDate(project.createdAt)}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Last Updated</span>
            <span class="value">{formatDate(project.updatedAt)}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Current Version</span>
            <span class="value">{project.currentVersion}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Modelling Type</span>
            <span class="value">{project.modellingType}</span>
          </div>
        </div>
      </div>
      
      <div class="versions-section">
        <h2>Project Versions</h2>
        
        {#if isLoadingVersions}
          <div class="loading-inline">
            <div class="loading-spinner"></div>
            <span>Loading versions...</span>
          </div>
        {:else if versions.length === 0}
          <div class="empty-versions">
            <p>No versions available for this project.</p>
            {#if isAdminOrOwner}
              <button class="btn btn-primary" on:click={createNewVersion}>
                Create First Version
              </button>
            {/if}
          </div>
        {:else}
          <div class="versions-list">
            {#each versions as version}
              <div class="version-card">
                <div class="version-header">
                  <div class="version-number">Version #{version.versionNumber}</div>
                  <div class="version-date">{formatDate(version.createdAt)}</div>
                </div>
                
                <div class="version-actions">
                  <a href={`/projects/${projectId}/versions/${version.versionNumber}`} class="btn btn-sm btn-outline">
                    View Details
                  </a>
                  {#if version.versionNumber === project.currentVersion}
                    <div class="current-version-badge">Current Version</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <style>
    .project-container {
      padding: 2rem 0;
    }
    
    .loading, .error-message {
      padding: 4rem 2rem;
      text-align: center;
      background-color: white;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      margin-bottom: 2rem;
    }
    
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    
    .loading-inline {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: var(--text-secondary);
    }
    
    .loading-inline .loading-spinner {
      width: 24px;
      height: 24px;
    }
    
    .error-message {
      color: var(--danger-color);
    }
    
    .error-message .btn {
      margin-top: 1rem;
      margin-right: 0.5rem;
    }
    
    .breadcrumbs {
      margin-bottom: 1rem;
      color: var(--text-secondary);
    }
    
    .breadcrumbs a {
      color: var(--primary-color);
      text-decoration: none;
    }
    
    .breadcrumbs a:hover {
      text-decoration: underline;
    }
    
    .page-header {
      margin-bottom: 2rem;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    h1 {
      font-size: 2.25rem;
      color: var(--secondary-color);
      margin: 0;
      margin-bottom: 0.5rem;
    }
    
    .model-type {
      color: var(--text-secondary);
      font-size: 1.125rem;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }
    
    .project-info-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .project-info-card h2 {
      font-size: 1.5rem;
      color: var(--secondary-color);
      margin-top: 0;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }
    
    .value {
      font-size: 1rem;
      color: var(--text-color);
      font-weight: 600;
    }
    
    .versions-section {
      background-color: white;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      padding: 1.5rem;
    }
    
    .versions-section h2 {
      font-size: 1.5rem;
      color: var(--secondary-color);
      margin-top: 0;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .empty-versions {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
    
    .empty-versions .btn {
      margin-top: 1rem;
    }
    
    .versions-list {
      display: grid;
      gap: 1rem;
    }
    
    .version-card {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background-color 0.2s;
    }
    
    .version-card:hover {
      background-color: #f8f9fa;
    }
    
    .version-header {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .version-number {
      font-weight: 600;
      color: var(--primary-color);
    }
    
    .version-date {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    .version-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .current-version-badge {
      background-color: var(--success-color);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 50rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1.5rem;
      }
      
      .header-actions {
        width: 100%;
        flex-direction: column;
      }
      
      .header-actions .btn {
        width: 100%;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .version-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .version-actions {
        width: 100%;
        justify-content: space-between;
      }
    }
  </style>