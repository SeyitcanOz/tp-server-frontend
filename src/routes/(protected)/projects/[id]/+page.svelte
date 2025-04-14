<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import userService from '$lib/services/user';
  import projectService from '$lib/services/project';
  import versionService from '$lib/services/version';
  import type { ProjectDetail } from '$lib/types/project';
  import type { VersionSummary } from '$lib/types/version';
  import DeleteConfirmationModal from '$lib/components/DeleteConfirmationModal.svelte';
  
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
  
  // Delete confirmation modal state
  let showDeleteModal = false;
  let isDeleting = false;
  let deleteError: string | null = null;
  
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
      // Use the projectService instead of direct API calls
      project = await projectService.getProjectById(projectId);
      
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
      // Use the versionService instead of direct API calls
      const response = await versionService.getProjectVersions(projectId);
      versions = response.items;
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
  
  // Show delete confirmation modal
  function openDeleteModal() {
    showDeleteModal = true;
    deleteError = null;
  }
  
  // Handle delete cancellation
  function cancelDelete() {
    showDeleteModal = false;
  }
  
  // Handle delete confirmation
  async function confirmDelete() {
    if (!project) return;
    
    isDeleting = true;
    deleteError = null;
    
    try {
      // Use projectService instead of direct API call
      await projectService.deleteProject(projectId);
      // Redirect to projects list
      window.location.href = '/projects';
    } catch (err) {
      console.error('Error deleting project:', err);
      // Set error message to display in modal
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        deleteError = axiosError.response?.data?.message || 'Failed to delete project. Please try again.';
      } else {
        deleteError = 'Failed to delete project. Please try again.';
      }
      isDeleting = false;
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
  
  async function makeVersionCurrent(versionNumber: number) {
    if (!confirm(`Set version ${versionNumber} as the current version?`)) {
      return;
    }
    
    try {
      // Use versionService instead of direct API call
      await versionService.setCurrentVersion(projectId, versionNumber);
      // Reload data to refresh
      await loadProject();
      await loadVersions();
    } catch (err) {
      console.error('Error setting current version:', err);
      alert('Failed to update current version. Please try again.');
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
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="page-container">
  {#if isLoadingProject}
    <div class="loading-container">
      <div class="loader"></div>
      <p>Loading project details...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <span class="material-icons error-icon">error_outline</span>
      <p>{error}</p>
      <div class="error-actions">
        <button class="btn-primary" on:click={loadProject}>Try Again</button>
        <a href="/projects" class="btn-secondary">Back to Projects</a>
      </div>
    </div>
  {:else if project}
    <header class="page-header">
      <div class="breadcrumbs">
        <a href="/projects">Projects</a> <span class="separator">/</span> {project.projectName}
      </div>
      
      <div class="header-content">
        <div class="header-left">
          <h1>{project.projectName}</h1>
        </div>
      </div>
    </header>
    
    <!-- Project Info Card -->
    <div class="info-card">
      <div class="info-header">
        <h2>Project Information</h2>
        {#if isAdminOrOwner}
          <div class="action-buttons">
            <button class="action-icon-btn create" on:click={createNewVersion}>
              <span class="material-icons">add</span>
              <span>New Version</span>
            </button>
            <button class="action-icon-btn edit" on:click={editProject}>
              <span class="material-icons">edit</span>
              <span>Edit</span>
            </button>
            {#if $user?.roles.includes('Admin')}
              <button class="action-icon-btn delete" on:click={openDeleteModal}>
                <span class="material-icons">delete</span>
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
            <span class="value">
              <div class="version-chip">v{project.currentVersion}</div>
            </span>
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
          <div class="loader small"></div>
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
              {#each filteredVersions as version (version.id)}
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
                      <a href={`/projects/${projectId}/versions/${version.versionNumber}`} class="action-btn primary">
                        View Details
                      </a>
                      
                      {#if isAdminOrOwner && version.versionNumber !== project.currentVersion}
                        <button class="action-btn" on:click={() => makeVersionCurrent(version.versionNumber)}>
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
    
    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal 
      isOpen={showDeleteModal}
      title="Delete Project"
      message="Are you sure you want to delete this project? All versions and associated data will be permanently removed."
      itemName={project.projectName}
      isDeleting={isDeleting}
      error={deleteError}
      on:confirm={confirmDelete}
      on:cancel={cancelDelete}
    />
  {/if}
</div>

<style>
  /* Base Styles */
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.8rem;
  }
  
  /* Header Styles */
  .page-header {
    margin-bottom: 1rem;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .breadcrumbs {
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 0.5rem;
  }
  
  .breadcrumbs a {
    color: #5c9fff;
    text-decoration: none;
  }
  
  .breadcrumbs a:hover {
    text-decoration: underline;
  }
  
  .separator {
    padding: 0 0.3rem;
    color: #94a3b8;
  }
  
  h1 {
    font-size: 1.5rem;
    margin: 0;
    color: #1e3a8a;
    font-weight: 500;
  }
  
  /* Loading & Error Styles */
  .loading-container, .error-container {
    padding: 3rem 1.5rem;
    text-align: center;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  
  .loader {
    border: 3px solid rgba(92, 159, 255, 0.2);
    border-left-color: #5c9fff;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    animation: spin 1s linear infinite;
  }
  
  .loader.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-icon {
    font-size: 2.5rem;
    color: #dc2626;
  }
  
  .error-container p {
    color: #dc2626;
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  .error-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .loading-inline {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    color: #64748b;
  }
  
  /* Info Card */
  .info-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border-top: 4px solid #5c9fff;
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
    font-size: 1.2rem;
    color: #1e3a8a;
    font-weight: 500;
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
    font-size: 0.75rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .value {
    font-size: 0.9rem;
    color: #1e293b;
    font-weight: 500;
  }
  
  .version-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.15rem 0.5rem;
    background-color: #5c9fff;
    color: white;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 600;
    width: fit-content;
  }
  
  /* Action Buttons */
  .action-icon-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.75rem; /* Reduced from 0.5rem 1rem */
    background-color: #f8f9fa;
    border: none;
    border-radius: 5px; /* Reduced from 6px */
    color: #334155;
    font-size: 0.8rem; /* Reduced from 0.875rem */
    font-weight: 600;
    transition: all 0.2s;
    cursor: pointer;
    gap: 0.4rem; /* Reduced from 0.5rem */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); /* Slightly reduced shadow */
  }
  
  /* Make the Material Icons a bit smaller too */
  .action-icon-btn .material-icons {
    font-size: 1.1rem; /* Add this to make icons smaller */
  }

  .action-icon-btn:hover {
    transform: translateY(-2px);
  }
  
  .action-icon-btn.create {
    background-color: #eefaf0;
    color: #16a34a;
  }
  
  .action-icon-btn.create:hover {
    background-color: #dcfce7;
  }
  
  .action-icon-btn.edit {
    background-color: #f0f4ff;
    color: #5c9fff;
  }
  
  .action-icon-btn.edit:hover {
    background-color: #e0f2fe;
  }
  
  .action-icon-btn.delete {
    background-color: #fff0f0;
    color: #dc2626;
  }
  
  .action-icon-btn.delete:hover {
    background-color: #fee2e2;
  }
  
  /* Versions Section */
  .versions-section {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .versions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 1rem;
  }
  
  .versions-header h2 {
    font-size: 1.2rem;
    color: #1e3a8a;
    margin: 0;
    font-weight: 500;
  }
  
  .empty-versions {
    text-align: center;
    padding: 3rem;
    color: #64748b;
  }
  
  .btn-create {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    background-color: #5c9fff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-top: 1rem;
  }
  
  .btn-create:hover {
    background-color: #4a89e8;
  }
    
  /* Versions Table */
  .versions-table-container {
    border: 1px solid #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .versions-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  
  .versions-table th {
    background-color: #f8fafc;
    border-bottom: 1px solid #e9ecef;
    padding: 0.75rem 0.6rem;
    text-align: center;
    font-weight: 500;
    color: #64748b;
  }
  
  .versions-table td {
    padding: 0.75rem 0.6rem;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .center-aligned {
    text-align: center;
  }
  
  .versions-table tr:last-child td {
    border-bottom: none;
  }
  
  .versions-table tr:hover td {
    background-color: #f8fafc;
  }
  
  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background-color: #f1f5f9;
    color: #64748b;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .status-badge.current {
    background-color: #dcfce7;
    color: #16a34a;
  }
  
  .version-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .action-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.6rem;
    background-color: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    color: #64748b;
    font-size: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.15s ease;
    cursor: pointer;
  }
  
  .action-btn:hover {
    background-color: #e2e8f0;
  }
  
  .action-btn.primary {
    background-color: #5c9fff;
    color: white;
    border-color: #5c9fff;
  }
  
  .action-btn.primary:hover {
    background-color: #4a89e8;
  }
  
  /* Buttons */
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }
  
  .btn-primary {
    background-color: #5c9fff;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #4a89e8;
  }
  
  .btn-secondary {
    background-color: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
  }
  
  .btn-secondary:hover {
    background-color: #e2e8f0;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .info-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .action-buttons {
      width: 100%;
      justify-content: flex-start;
    }
    
    .info-grid {
      grid-template-columns: 1fr;
    }
    
    .version-actions {
      flex-direction: column;
      align-items: stretch;
    }
    
    .action-btn {
      justify-content: center;
    }
  }
  
  @media (max-width: 576px) {
    .action-buttons {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .action-icon-btn {
      justify-content: flex-start;
    }
  }
  </style>