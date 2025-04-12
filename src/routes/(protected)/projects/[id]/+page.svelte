<!-- src/routes/(protected)/projects/[id]/+page.svelte -->
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
  
  // For versions sorting/filtering
  let sortField: 'versionNumber' | 'createdAt' = 'versionNumber';
  let sortDirection: 'asc' | 'desc' = 'desc';
  let searchQuery: string = '';
  let filteredVersions: VersionSummary[] = [];
  
  // Extract project ID from URL
  $: projectId = $page.params.id;
  
  // Check if user is admin or project owner
  $: isAdminOrOwner = $user && ($user.roles.includes('Admin') || ($user.id === project?.createdBy));
  
  // Apply filter and sorting to versions
  $: {
    if (versions.length > 0) {
      // Apply search if query exists
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredVersions = versions.filter(v => 
          v.versionNumber.toString().includes(query) || 
          v.createdAt.toLowerCase().includes(query)
        );
      } else {
        filteredVersions = [...versions];
      }
      
      // Apply sorting
      filteredVersions.sort((a, b) => {
        if (sortField === 'versionNumber') {
          return sortDirection === 'asc' 
            ? a.versionNumber - b.versionNumber
            : b.versionNumber - a.versionNumber;
        } else {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortDirection === 'asc' 
            ? dateA - dateB
            : dateB - dateA;
        }
      });
    } else {
      filteredVersions = [];
    }
  }
  
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
  
  async function editProject() {
    // Redirect to edit project page
    window.location.href = `/projects/${projectId}/edit`;
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
  
  function setSorting(field: 'versionNumber' | 'createdAt') {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and reset to descending
      sortField = field;
      sortDirection = 'desc';
    }
  }
  
  function resetSearch() {
    searchQuery = '';
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
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>{error}</p>
      <button class="btn btn-primary" on:click={loadProject}>Try Again</button>
      <a href="/projects" class="btn btn-outline">Back to Projects</a>
    </div>
  {:else if project}
    <div class="page-header">
      <div class="breadcrumbs">
        <a href="/projects">Projects</a> &gt; {project.projectName}
      </div>
      
      <div class="header-content">
        <div class="header-left">
          <h1>{project.projectName}</h1>
          <p class="subtitle">{project.modellingType}</p>
        </div>
        
        {#if isAdminOrOwner}
          <div class="header-actions">
            <button class="action-icon-btn create" on:click={createNewVersion} title="Create New Version">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Version</span>
            </button>
            <button class="action-icon-btn edit" on:click={editProject} title="Edit Project">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            {#if $user?.roles.includes('Admin')}
              <button class="action-icon-btn delete" on:click={deleteProject} title="Delete Project">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>Delete</span>
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Project Information Card -->
    <div class="info-card">
      <div class="info-header">
        <h2>Project Information</h2>
        {#if isAdminOrOwner}
          <div class="action-buttons">
            <button class="action-icon-btn create" on:click={createNewVersion} title="Create New Version">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Version</span>
            </button>
            <button class="action-icon-btn edit" on:click={editProject} title="Edit Project">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            {#if $user?.roles.includes('Admin')}
              <button class="action-icon-btn delete" on:click={deleteProject} title="Delete Project">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>Delete</span>
              </button>
            {/if}
          </div>
        {/if}
      </div>
      <div class="info-grid">
        <div class="info-section">
          <div class="info-item">
            <span class="label">Project ID</span>
            <span class="value">{project.id}</span>
          </div>
          <div class="info-item">
            <span class="label">Created By</span>
            <span class="value">{ownerUsername}</span>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-item">
            <span class="label">Created On</span>
            <span class="value">{formatDate(project.createdAt)}</span>
          </div>
          <div class="info-item">
            <span class="label">Last Updated</span>
            <span class="value">{formatDate(project.updatedAt)}</span>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-item">
            <span class="label">Current Version</span>
            <span class="value version-chip">v{project.currentVersion}</span>
          </div>
          <div class="info-item">
            <span class="label">Modelling Type</span>
            <span class="value">{project.modellingType}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Versions Section -->
    <div class="versions-section">
      <div class="versions-header">
        <h2>Project Versions</h2>
      </div>
      
      {#if isLoadingVersions}
        <div class="loading-inline">
          <div class="loading-spinner small"></div>
          <span>Loading versions...</span>
        </div>
      {:else if versions.length === 0}
        <div class="empty-versions">
          <p>No versions available for this project.</p>
          {#if isAdminOrOwner}
            <button class="btn-create" on:click={createNewVersion}>
              Create First Version
            </button>
          {/if}
        </div>
      {:else}
        <div class="versions-table-container">
          <table class="versions-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Created On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each versions as version}
                <tr>
                  <td class="center-aligned">Version #{version.versionNumber}</td>
                  <td class="center-aligned">{formatDate(version.createdAt)}</td>
                  <td class="center-aligned">
                    {#if version.versionNumber === project.currentVersion}
                      <span class="status-badge current">Current Version</span>
                    {:else}
                      <span class="status-badge">Previous Version</span>
                    {/if}
                  </td>
                  <td class="center-aligned">
                    <div class="version-actions">
                      <a href={`/projects/${projectId}/versions/${version.versionNumber}`} class="action-btn small primary">
                        View Details
                      </a>
                      
                      {#if isAdminOrOwner && version.versionNumber !== project.currentVersion}
                        <button class="action-btn small" on:click={() => makeVersionCurrent(version.versionNumber)}>
                          Set as Current
                        </button>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
/* Base Styles */
.project-container {
  padding: 2rem 0;
  max-width: 1400px;
  margin: 0 auto;
}

/* Loading States */
.loading, .error-message {
  padding: 4rem 2rem;
  text-align: center;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(58, 134, 255, 0.2);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.small {
  width: 24px;
  height: 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-secondary);
}

.error-message {
  color: var(--danger-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-message svg {
  color: var(--danger-color);
  width: 48px;
  height: 48px;
}

/* Page Header */
.breadcrumbs {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.breadcrumbs a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumbs a:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
}

h1 {
  font-size: 2.5rem;
  color: var(--secondary-color);
  margin: 0;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0;
}

/* Action Buttons */
.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn {
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  border: none;
  font-size: 0.95rem;
}

.btn svg {
  flex-shrink: 0;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #dee2e6;
  color: var(--text-color);
}

.btn-outline:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #c1c9d0;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #d02b2e;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Info Card */
.info-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-top: 4px solid var(--primary-color);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 1rem;
}

.info-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--secondary-color);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
  padding-bottom: 0.5rem;
}

.info-item:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 40px;
  height: 1px;
  background-color: #f0f0f0;
}

.label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  font-size: 1rem;
  color: var(--text-color);
  font-weight: 500;
}

.version-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
  box-shadow: 0 2px 4px rgba(58, 134, 255, 0.2);
}

/* Action Buttons */
.action-icon-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: none;
  border-radius: 6px;
  color: var(--text-color);
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.action-icon-btn:hover {
  transform: translateY(-2px);
}

.action-icon-btn svg {
  transition: transform 0.2s;
}

.action-icon-btn:hover svg {
  transform: scale(1.1);
}

.action-icon-btn.create {
  background-color: #eefaf0;
  color: #38b000;
}

.action-icon-btn.create svg {
  color: #38b000;
}

.action-icon-btn.create:hover {
  background-color: #dff5e2;
}

.action-icon-btn.edit {
  background-color: #f0f4ff;
  color: #3a86ff;
}

.action-icon-btn.edit svg {
  color: #3a86ff;
}

.action-icon-btn.edit:hover {
  background-color: #e1eaff;
}

.action-icon-btn.delete {
  background-color: #fff0f0;
  color: #e5383b;
}

.action-icon-btn.delete svg {
  color: #e5383b;
}

.action-icon-btn.delete:hover {
  background-color: #ffe1e1;
}

/* Versions Table */
.versions-table-container {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.versions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.versions-table th {
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  padding: 0.85rem 0.75rem;
  text-align: center;
  font-weight: 600;
  color: var(--secondary-color);
}

.versions-table td {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #e9ecef;
}

.center-aligned {
  text-align: center;
}

.versions-table tr:last-child td {
  border-bottom: none;
}

.versions-table tr:hover td {
  background-color: rgba(58, 134, 255, 0.04);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background-color: #f0f0f0;
  color: #6c757d;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.current {
  background-color: #e6f7ee;
  color: var(--success-color);
}

.version-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  color: var(--text-color);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.action-btn.small {
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn.primary {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.action-btn.primary:hover {
  background-color: var(--primary-dark);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: #eefaf0;
  color: #38b000;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-create:hover {
  background-color: #dff5e2;
  transform: translateY(-2px);
}

/* Versions Section */
.versions-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.versions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.versions-header h2 {
  font-size: 1.5rem;
  color: var(--secondary-color);
  margin: 0;
}

.versions-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Search Box */
.search-box {
  position: relative;
  width: 250px;
}

.search-box input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.875rem;
}

.search-box input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px rgba(58, 134, 255, 0.1);
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6c757d;
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.clear-search:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Versions Table */
.versions-table-container {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.versions-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.versions-table th {
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  padding: 0.5rem;
}

.sort-button {
  padding: 0.75rem 0.5rem;
  background: none;
  border: none;
  font-weight: 600;
  color: var(--text-color);
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sort-button:hover {
  color: var(--primary-color);
}

.sort-icon {
  display: inline-flex;
  margin-left: 0.25rem;
}

.versions-table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.versions-table tr:last-child td {
  border-bottom: none;
}

.versions-table tr:hover td {
  background-color: rgba(58, 134, 255, 0.04);
}

.version-number {
  font-weight: 500;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background-color: #f0f0f0;
  color: #6c757d;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.current {
  background-color: #e6f7ee;
  color: var(--success-color);
}

.version-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-versions {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-versions .btn {
  margin-top: 1rem;
}

/* Responsive Styles */
@media (max-width: 992px) {
  .header-content {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .versions-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .versions-toolbar {
    width: 100%;
  }
  
  .search-box {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .versions-table {
    display: block;
    overflow-x: auto;
  }
}
</style>

<script context="module">
  async function makeVersionCurrent(versionNumber: number) {
    try {
      // Implementation would go here
      console.log('Setting version', versionNumber, 'as current');
      alert('This functionality is not yet implemented');
    } catch (error) {
      console.error('Error setting current version:', error);
    }
  }
</script>