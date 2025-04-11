<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import api from '$lib/services/api';
  import userService from '$lib/services/user';
  import type { PagedResponse, ProjectSummary } from '$lib/types/project';
  
  let projects: ProjectSummary[] = [];
  let isLoading = true;
  let error: string | null = null;
  let currentPage = 1;
  let pageSize = 10;
  let totalPages = 1;
  let totalCount = 0;
  let searchQuery = '';
  let userMap: Record<string, string> = {}; // Maps user IDs to usernames
  let viewMode: 'grid' | 'list' = 'grid';
  let sortOrder: 'name' | 'updated' | 'version' = 'updated';
  
  // Function to load projects
  async function loadProjects() {
    isLoading = true;
    error = null;
    
    try {
      // Prepare query parameters
      const params: Record<string, any> = {
        pageNumber: currentPage,
        pageSize: pageSize
      };
      
      // Add search parameter if provided
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      // We need to map our sort values to what the API expects
      if (sortOrder === 'name') {
        params.sortBy = 'projectName';
        params.sortDirection = 'asc';
      } else if (sortOrder === 'updated') {
        params.sortBy = 'updatedAt';
        params.sortDirection = 'desc';
      } else if (sortOrder === 'version') {
        params.sortBy = 'currentVersion';
        params.sortDirection = 'desc';
      }
      
      // Fetch projects with parameters
      const response = await api.get<PagedResponse<ProjectSummary>>('/api/projects', {
        params: params
      });
      
      projects = response.data.items;
      totalPages = response.data.totalPages;
      totalCount = response.data.totalCount;
      
      // Collect all unique creator IDs
      const creatorIds = [...new Set(projects.map(p => p.createdBy))];
      
      // Load user details for all creators
      await loadUserDetails(creatorIds);
    } catch (err) {
      console.error('Error fetching projects:', err);
      error = 'Failed to load projects. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  // Function to load user details for project creators
  async function loadUserDetails(userIds: string[]) {
    try {
      // Filter out IDs we already have info for
      const missingIds = userIds.filter(id => !userMap[id]);
      
      if (missingIds.length === 0) return;
      
      // Check if the current user is an admin
      const isAdmin = $user?.roles.includes('Admin');
      
      if (isAdmin) {
        // If admin, load all users individually
        for (const userId of missingIds) {
          try {
            const userData = await userService.getUserById(userId);
            userMap[userId] = userData.username;
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
            
            // Special case: if the current user is the creator, we can use their username
            if (userId === $user?.id) {
              userMap[userId] = $user.username;
            } else {
              userMap[userId] = 'Unknown User';
            }
          }
        }
      } else {
        // For non-admin users, we can at least identify the current user
        for (const userId of missingIds) {
          if (userId === $user?.id) {
            userMap[userId] = $user.username;
          } else {
            // Try to fetch other users (may fail due to permissions)
            try {
              const userData = await userService.getUserById(userId);
              userMap[userId] = userData.username;
            } catch (err) {
              userMap[userId] = 'User ' + userId.substring(0, 6) + '...';
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      // If we can't load user details, use placeholder
      userIds.forEach(id => {
        if (!userMap[id]) {
          if (id === $user?.id) {
            userMap[id] = $user.username;
          } else {
            userMap[id] = 'User ' + id.substring(0, 6) + '...';
          }
        }
      });
    }
  }
  
  function handleSearch() {
    currentPage = 1; // Reset to first page when searching
    loadProjects();
  }
  
  function clearSearch() {
    searchQuery = '';
    loadProjects();
  }
  
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      loadProjects();
    }
  }
  
  function setSortOrder(order: 'name' | 'updated' | 'version') {
    if (sortOrder !== order) {
      sortOrder = order;
      loadProjects();
    }
  }
  
  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
  }
  
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  
  // Check if project is owned by current user
  function isOwnedByCurrentUser(createdBy: string): boolean {
    return createdBy === $user?.id;
  }
  
  // Generate a color based on model type for consistency
  function getModelTypeColor(modelType: string): string {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < modelType.length; i++) {
      hash = modelType.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use primary color palette with slight variations
    const colors = [
      'var(--primary-color)',       // Primary blue
      'var(--primary-dark)',        // Darker blue
      '#00a3ff',                    // Sky blue
      '#0081cb',                    // Ocean blue
      '#5e72e4'                     // Indigo
    ];
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  // Get a material icon name based on modeling type
  function getModelTypeIcon(modelType: string): string {
    const lcModelType = modelType.toLowerCase();
    
    if (lcModelType.includes('2d')) return 'view_in_ar';
    if (lcModelType.includes('3d')) return 'view_in_ar';
    if (lcModelType.includes('structural')) return 'layers';
    if (lcModelType.includes('analysis')) return 'analytics';
    if (lcModelType.includes('simulation')) return 'model_training';
    
    // Default icon
    return 'category';
  }
  
  // Check if current user is admin (for template usage)
  $: isAdmin = $user?.roles.includes('Admin');
  
  onMount(() => {
    loadProjects();
    
    // Check if the user prefers grid or list from localStorage
    const savedViewMode = localStorage.getItem('projectsViewMode');
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      viewMode = savedViewMode;
    }
  });
  
  // Save view mode preference when it changes
  $: {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('projectsViewMode', viewMode);
    }
  }
</script>

<svelte:head>
  <title>Projects - TPServer</title>
  <meta name="description" content="Manage your engineering projects on TPServer" />
  <!-- Add Material Icons for project type icons -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="page-header">
  <div class="container">
    <div class="header-content">
      <div class="header-left">
        <h1>Projects</h1>
        <p class="subtitle">
          {#if totalCount > 0}
            Showing {projects.length} of {totalCount} project{totalCount !== 1 ? 's' : ''}
          {:else}
            Manage your engineering projects
          {/if}
        </p>
      </div>
      <div class="header-actions">
        <a href="/projects/new" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Project
        </a>
      </div>
    </div>
  </div>
</div>

<div class="container projects-container">
  <div class="toolbar">
    <div class="search-box">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input 
        type="text" 
        bind:value={searchQuery} 
        placeholder="Search projects..." 
        on:keyup={(e) => e.key === 'Enter' && handleSearch()}
      />
      {#if searchQuery}
        <button class="clear-search" on:click={clearSearch}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      {/if}
    </div>
    
    <div class="toolbar-actions">
      <div class="sort-options">
        <span class="sort-label">Sort by:</span>
        <button 
          class="sort-button" 
          class:active={sortOrder === 'name'}
          on:click={() => setSortOrder('name')}
        >
          Name
        </button>
        <button 
          class="sort-button" 
          class:active={sortOrder === 'updated'}
          on:click={() => setSortOrder('updated')}
        >
          Last Updated
        </button>
        <button 
          class="sort-button" 
          class:active={sortOrder === 'version'}
          on:click={() => setSortOrder('version')}
        >
          Version
        </button>
      </div>
      
      <div class="view-toggle">
        <button 
          class="view-button" 
          class:active={viewMode === 'grid'} 
          on:click={() => setViewMode('grid')}
          aria-label="Grid view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <button 
          class="view-button" 
          class:active={viewMode === 'list'} 
          on:click={() => setViewMode('list')}
          aria-label="List view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  {#if isLoading}
    <div class="loading-container">
      <div class="loader"></div>
      <p>Loading projects...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>{error}</p>
      <button class="btn-primary" on:click={loadProjects}>Try Again</button>
    </div>
  {:else if projects.length === 0}
    <div class="empty-state">
      <div class="empty-illustration">
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      </div>
      <h2>No Projects Found</h2>
      {#if searchQuery}
        <p>No projects matched your search criteria. Try a different query or clear the search.</p>
        <button class="btn-primary" on:click={clearSearch}>Clear Search</button>
      {:else}
        <p>You don't have any projects yet. Create your first project to get started.</p>
        <a href="/projects/new" class="btn-primary">Create Project</a>
      {/if}
    </div>
  {:else}
    {#if viewMode === 'grid'}
      <div class="projects-grid">
        {#each projects as project}
          <div class="project-card" class:is-owner={isOwnedByCurrentUser(project.createdBy)}>
            <div class="project-header">
              <div class="model-type" style="--model-color: {getModelTypeColor(project.modellingType)}">
                <span class="material-icons model-icon">{getModelTypeIcon(project.modellingType)}</span>
                <span class="type-label">{project.modellingType}</span>
              </div>
              <div class="version-badge">v{project.currentVersion}</div>
            </div>
            
            <h3 class="project-name">
              <a href={`/projects/${project.id}`}>{project.projectName}</a>
            </h3>
            
            <div class="project-meta">
              <div class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span>{userMap[project.createdBy] || 'Unknown User'}</span>
              </div>
              <div class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{formatDate(project.updatedAt)}</span>
              </div>
            </div>
            
            <div class="project-actions">
              <a href={`/projects/${project.id}`} class="action-button primary">
                View Project
              </a>
              <div class="action-dropdown">
                <button class="action-button icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
                <!-- Dropdown menu would go here -->
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="projects-list">
        <div class="list-header">
          <span class="list-cell name">Project Name</span>
          <span class="list-cell type">Type</span>
          <span class="list-cell owner">Owner</span>
          <span class="list-cell version">Version</span>
          <span class="list-cell updated">Last Updated</span>
          <span class="list-cell actions">Actions</span>
        </div>
        
        {#each projects as project}
          <div class="list-row" class:is-owner={isOwnedByCurrentUser(project.createdBy)}>
            <div class="list-cell name">
              <a href={`/projects/${project.id}`}>{project.projectName}</a>
            </div>
            <div class="list-cell type">
              <div class="model-type small" style="--model-color: {getModelTypeColor(project.modellingType)}">
                <span class="material-icons model-icon small">{getModelTypeIcon(project.modellingType)}</span>
                <span class="type-label">{project.modellingType}</span>
              </div>
            </div>
            <div class="list-cell owner">
              {userMap[project.createdBy] || 'Unknown User'}
            </div>
            <div class="list-cell version">
              <div class="version-badge small">v{project.currentVersion}</div>
            </div>
            <div class="list-cell updated">
              {formatDate(project.updatedAt)}
            </div>
            <div class="list-cell actions">
              <div class="list-actions">
                <a href={`/projects/${project.id}`} class="action-button small">
                  View
                </a>
                <a href={`/projects/${project.id}/versions`} class="action-button small">
                  Versions
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button 
          class="pagination-btn" 
          disabled={currentPage === 1} 
          on:click={() => changePage(currentPage - 1)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Previous
        </button>
        
        <div class="pagination-pages">
          {#if totalPages <= 7}
            {#each Array(totalPages) as _, index}
              <button 
                class="pagination-btn page-number" 
                class:active={currentPage === index + 1}
                on:click={() => changePage(index + 1)}
              >
                {index + 1}
              </button>
            {/each}
          {:else}
            <!-- Show first page -->
            <button 
              class="pagination-btn page-number" 
              class:active={currentPage === 1}
              on:click={() => changePage(1)}
            >
              1
            </button>
            
            <!-- Show ellipsis if needed -->
            {#if currentPage > 3}
              <span class="pagination-ellipsis">...</span>
            {/if}
            
            <!-- Show pages around current page -->
            {#each Array(5) as _, index}
              {#if currentPage - 2 + index > 1 && currentPage - 2 + index < totalPages}
                <button 
                  class="pagination-btn page-number" 
                  class:active={currentPage === currentPage - 2 + index}
                  on:click={() => changePage(currentPage - 2 + index)}
                >
                  {currentPage - 2 + index}
                </button>
              {/if}
            {/each}
            
            <!-- Show ellipsis if needed -->
            {#if currentPage < totalPages - 2}
              <span class="pagination-ellipsis">...</span>
            {/if}
            
            <!-- Show last page -->
            <button 
              class="pagination-btn page-number" 
              class:active={currentPage === totalPages}
              on:click={() => changePage(totalPages)}
            >
              {totalPages}
            </button>
          {/if}
        </div>
        
        <button 
          class="pagination-btn" 
          disabled={currentPage === totalPages} 
          on:click={() => changePage(currentPage + 1)}
        >
          Next
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Page Header */
  .page-header {
    background-color: white;
    padding: 2rem 0;
    border-bottom: 1px solid #e9ecef;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  h1 {
    font-size: 2.25rem;
    color: #2b3a67;
    margin: 0;
    margin-bottom: 0.5rem;
    font-weight: 700;
  }
  
  .subtitle {
    color: #6c757d;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
  }
  
  .btn-primary {
    background-color: #3a86ff;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    border: none;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }
  
  .btn-primary:hover {
    background-color: #2667cc;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  /* Projects Container */
  .projects-container {
    padding: 2rem 0;
  }
  
  /* Toolbar */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .search-box {
    position: relative;
    width: 100%;
    max-width: 400px;
  }
  
  .search-box svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
  }
  
  .search-box input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 3rem;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 1rem;
    transition: all 0.2s ease;
  }
  
  .search-box input:focus {
    border-color: #3a86ff;
    box-shadow: 0 0 0 3px rgba(58, 134, 255, 0.1);
    outline: none;
  }
  
  .clear-search {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6c757d;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }
  
  .clear-search:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .sort-options {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .sort-label {
    color: #6c757d;
    font-size: 0.875rem;
  }
  
  .sort-button {
    background: none;
    border: none;
    color: #6c757d;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .sort-button.active {
    color: #3a86ff;
    background-color: rgba(58, 134, 255, 0.1);
  }
  
  .sort-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .view-toggle {
    display: flex;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .view-button {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6c757d;
    transition: all 0.2s ease;
  }
  
  .view-button.active {
    background-color: #3a86ff;
    color: white;
  }
  
  .view-button:hover:not(.active) {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  /* Grid View */
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .project-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border: 1px solid #e9ecef;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  .project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
  }
  
  .project-card.is-owner {
    border-left: 3px solid #3a86ff;
  }
  
  .project-header {
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #f8f9fa;
  }
  
  .model-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    background-color: var(--model-color, #3a86ff);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .model-type.small {
    padding: 0.25rem 0.5rem;
  }
  
  .model-icon {
    font-size: 1.25rem;
  }
  
  .model-icon.small {
    font-size: 1rem;
  }
  
  .version-badge {
    background-color: #f8f9fa;
    color: #6c757d;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .version-badge.small {
    padding: 0.25rem 0.5rem;
  }
  
  .project-name {
    padding: 1.25rem 1.25rem 0.5rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .project-name a {
    color: #2b3a67;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  
  .project-name a:hover {
    color: #3a86ff;
  }
  
  .project-meta {
    padding: 0 1.25rem 1.25rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6c757d;
    font-size: 0.875rem;
  }
  
  .project-actions {
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f8f9fa;
    margin-top: auto;
  }
  
  .action-button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.875rem;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
  }
  
  .action-button.small {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .action-button.primary {
    background-color: #3a86ff;
    color: white;
  }
  
  .action-button.primary:hover {
    background-color: #2667cc;
  }
  
  .action-button.icon {
    padding: 0.5rem;
    background-color: transparent;
    color: #6c757d;
  }
  
  .action-button.icon:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  /* List View */
  .projects-list {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    margin-bottom: 2rem;
    border: 1px solid #e9ecef;
  }
  
  .list-header {
    display: flex;
    background-color: #f8f9fa;
    padding: 1rem;
    font-weight: 600;
    color: #2b3a67;
    border-bottom: 1px solid #e9ecef;
  }
  
  .list-row {
    display: flex;
    padding: 1rem;
    align-items: center;
    border-bottom: 1px solid #e9ecef;
    transition: background-color 0.2s ease;
  }
  
  .list-row:last-child {
    border-bottom: none;
  }
  
  .list-row:hover {
    background-color: rgba(58, 134, 255, 0.05);
  }
  
  .list-row.is-owner {
    border-left: 3px solid #3a86ff;
  }
  
  .list-cell {
    flex: 1;
    padding: 0 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .list-cell.name {
    flex: 2;
    font-weight: 500;
  }
  
  .list-cell.name a {
    color: #2b3a67;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  
  .list-cell.name a:hover {
    color: #3a86ff;
  }
  
  .list-cell.type,
  .list-cell.version {
    flex: 0.8;
  }
  
  .list-cell.actions {
    flex: 1.2;
    display: flex;
    justify-content: flex-end;
  }
  
  .list-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  /* Loading, Error, Empty States */
  .loading-container,
  .error-message,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 2rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    text-align: center;
  }
  
  .loader {
    width: 50px;
    height: 50px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3a86ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1.5rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-message {
    color: #e5383b;
  }
  
  .error-message svg {
    margin-bottom: 1rem;
    color: #e5383b;
  }
  
  .empty-illustration {
    margin-bottom: 2rem;
  }
  
  .empty-icon {
    width: 80px;
    height: 80px;
    color: #6c757d;
    opacity: 0.5;
  }
  
  .empty-state h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #2b3a67;
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    color: #6c757d;
    max-width: 400px;
  }
  
  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
  }
  
  .pagination-pages {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    color: #6c757d;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .pagination-btn:hover:not(:disabled):not(.active) {
    background-color: #f8f9fa;
    border-color: #c1c9d0;
  }
  
  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-btn.page-number {
    min-width: 36px;
    justify-content: center;
    padding: 0.5rem;
  }
  
  .pagination-btn.active {
    background-color: #3a86ff;
    color: white;
    border-color: #3a86ff;
    font-weight: 600;
  }
  
  .pagination-ellipsis {
    color: #6c757d;
  }
  
  /* Responsive Styles */
  @media (max-width: 992px) {
    .toolbar {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .search-box {
      max-width: 100%;
    }
    
    .toolbar-actions {
      width: 100%;
      justify-content: space-between;
    }
    
    .projects-grid {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    }
  }
  
  @media (max-width: 768px) {
    .list-header {
      display: none;
    }
    
    .list-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
    }
    
    .list-cell {
      width: 100%;
      padding: 0;
    }
    
    .list-cell.actions {
      justify-content: flex-start;
    }
    
    .sort-options {
      display: none;
    }
  }
</style>