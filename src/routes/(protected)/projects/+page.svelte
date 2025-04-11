<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import api from '$lib/services/api';
  import userService from '$lib/services/user';
  import type { PagedResponse, ProjectSummary } from '$lib/types/project';
  
  // Variables for filtering
  let projects: ProjectSummary[] = [];
  let allProjects: ProjectSummary[] = []; // Store all projects for client-side filtering
  let isLoading = true;
  let error: string | null = null;
  let currentPage = 1;
  let pageSize = 20;
  let totalPages = 1;
  let totalCount = 0;
  let searchQuery = '';
  let userMap: Record<string, string> = {}; // Maps user IDs to usernames
  let viewMode: 'grid' | 'list' = 'grid';
  let sortOrder: 'name' | 'updated' | 'version' = 'updated';
  
  // Admin-specific properties
  let userFilter: string | null = null; // For admin to filter by user
  let allUsers: {id: string, username: string}[] = []; // List of users for admin to filter by
  let isLoadingUsers = false;
  
  // Client-side search function
  function filterProjects(projects: ProjectSummary[], query: string): ProjectSummary[] {
    if (!query) return projects;
    
    const lowerQuery = query.toLowerCase();
    return projects.filter(project => 
      project.projectName.toLowerCase().includes(lowerQuery) || 
      project.modellingType.toLowerCase().includes(lowerQuery)
    );
  }

  // Client-side sort function
  function sortProjects(projects: ProjectSummary[], order: 'name' | 'updated' | 'version'): ProjectSummary[] {
    return [...projects].sort((a, b) => {
      if (order === 'name') {
        return a.projectName.localeCompare(b.projectName);
      } else if (order === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else { // version
        return b.currentVersion - a.currentVersion;
      }
    });
  }

  // Apply client-side filtering and sorting
  function applyClientSideFilters() {
    // Start with all projects (or filtered by user if applicable)
    let filteredProjects = [...allProjects];
    
    // Apply search filter
    if (searchQuery) {
      filteredProjects = filterProjects(filteredProjects, searchQuery);
    }
    
    // Apply sorting
    filteredProjects = sortProjects(filteredProjects, sortOrder);
    
    // Update pagination info
    totalCount = filteredProjects.length;
    totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    
    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    projects = filteredProjects.slice(startIndex, startIndex + pageSize);
  }
  
  // Function to load all users for admin filter dropdown
  async function loadAllUsers() {
    if (!$user?.roles?.includes('Admin')) return;
    
    isLoadingUsers = true;
    try {
      // In a real app, you'd have an endpoint to get all users
      // Since we don't have one in the provided code, we'll create a workaround
      // This would be replaced with an actual API call like:
      // const response = await api.get('/api/users');
      // allUsers = response.data;
      
      // For now, let's just add the current user
      if ($user) {
        allUsers = [{
          id: $user.id,
          username: $user.username
        }];
      }
      
      // We'll add any project owners we find while loading projects
      // This is a workaround since we don't have a proper user list endpoint
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      isLoadingUsers = false;
    }
  }

  // Function to load projects with search, sort, and filter
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
      
      // Add userId parameter if admin user has selected a filter
      if ($user?.roles?.includes('Admin') && userFilter) {
        params.userId = userFilter;
      }
      
      // Map our sort values to what the API expects
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
      
      // Store all projects for client-side filtering
      // For a real app, you might need to handle larger datasets differently
      if (!searchQuery && params.pageSize >= 100) {
        allProjects = response.data.items;
      }
      
      projects = response.data.items;
      totalPages = response.data.totalPages;
      totalCount = response.data.totalCount;
      
      // Collect all unique creator IDs
      const creatorIds = [...new Set(projects.map(p => p.createdBy))];
      
      // For admin users, add any new project creators to the user filter dropdown
      if ($user?.roles?.includes('Admin')) {
        await loadUserDetails(creatorIds);
        
        // Add any new users to the allUsers array if they're not already there
        creatorIds.forEach(id => {
          if (!allUsers.some(u => u.id === id) && userMap[id]) {
            allUsers.push({
              id: id,
              username: userMap[id]
            });
          }
        });
      } else {
        // For non-admin users, just load the user details for display
        await loadUserDetails(creatorIds);
      }
      
      // If we need client-side filtering, load all projects
      if (searchQuery && allProjects.length === 0) {
        await loadAllProjectsForFiltering();
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      error = 'Failed to load projects. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  // Function to load all projects for client-side filtering
  async function loadAllProjectsForFiltering() {
    try {
      // Only load all projects if we haven't done so already
      if (allProjects.length === 0) {
        const params: Record<string, any> = {
          pageNumber: 1,
          pageSize: 100 // Get a larger number of projects
        };
        
        // Add userId parameter if admin user has selected a filter
        if ($user?.roles?.includes('Admin') && userFilter) {
          params.userId = userFilter;
        }
        
        const response = await api.get<PagedResponse<ProjectSummary>>('/api/projects', {
          params: params
        });
        
        allProjects = response.data.items;
        
        // Immediately apply client-side filtering
        applyClientSideFilters();
      }
    } catch (err) {
      console.error('Error loading all projects for filtering:', err);
      // Fall back to API filtering if this fails
    }
  }
  
  // Function to load user details for project creators
  async function loadUserDetails(userIds: string[]) {
    try {
      // Filter out IDs we already have info for
      const missingIds = userIds.filter(id => !userMap[id]);
      
      if (missingIds.length === 0) return;
      
      // Check if the current user is an admin
      const isAdmin = $user?.roles?.includes('Admin') || false;
      
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

  // Function to handle search with client-side filtering
  function handleSearch() {
    // Try API search first if available, otherwise use client-side filtering
    if (allProjects.length > 0) {
      currentPage = 1;  // Reset to first page when searching
      applyClientSideFilters();
    } else {
      currentPage = 1;  // Reset to first page when searching
      loadProjects();   // Fall back to API search
    }
  }

  // Function to clear search with client-side filtering
  function clearSearch() {
    searchQuery = '';
    currentPage = 1; // Reset to first page
    
    // If we have all projects loaded, just apply filters without API call
    if (allProjects.length > 0) {
      applyClientSideFilters();
    } else {
      loadProjects(); // Fall back to API
    }
  }

  function setUserFilter(userId: string | null) {
    userFilter = userId;
    currentPage = 1; // Reset to first page when changing filter
    
    // Reset allProjects when changing user filter to force reload
    allProjects = [];
    
    loadProjects();
  }

  // Function to change sort order with client-side filtering
  function setSortOrder(order: 'name' | 'updated' | 'version') {
    if (sortOrder !== order) {
      sortOrder = order;
      currentPage = 1; // Reset to first page when changing sort
      
      // If we have all projects loaded, just apply filters without API call
      if (allProjects.length > 0) {
        applyClientSideFilters();
      } else {
        loadProjects(); // Fall back to API
      }
    }
  }
  
  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
  }
  
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      
      // If we have all projects loaded, just apply filters without API call
      if (allProjects.length > 0) {
        applyClientSideFilters();
      } else {
        loadProjects();
      }
    }
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
  $: isAdmin = $user?.roles?.includes('Admin') || false;
  
  onMount(() => {
    // If admin, load users for filter dropdown
    if ($user?.roles?.includes('Admin')) {
      loadAllUsers();
    }
    
    // Initial load of projects
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
    <div class="toolbar-left">
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
          <button class="clear-search" on:click={clearSearch} aria-label="Clear search">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        {/if}
      </div>
      
      <!-- User filter dropdown for admin users -->
      {#if isAdmin}
        <div class="user-filter">
          <label for="user-filter">Filter by User:</label>
          <select 
            id="user-filter" 
            on:change={(e) => setUserFilter((e.target as HTMLSelectElement).value || null)}
            value={userFilter || ""}
          >
            <option value="">All Users</option>
            {#if $user}<option value={$user.id}>My Projects</option>{/if}
            {#each allUsers.filter(u => $user && u.id !== $user.id) as userOption}
              <option value={userOption.id}>{userOption.username}</option>
            {/each}
          </select>
        </div>
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
          Updated
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
                <button class="action-button icon" aria-label="More options">
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
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }
  
  .toolbar-left {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    flex: 1;
  }
  
  .search-box {
    position: relative;
    width: 300px;
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
    background-color: #f8f9fa;
  }
  
  .search-box input:focus {
    border-color: #3a86ff;
    box-shadow: 0 0 0 3px rgba(58, 134, 255, 0.1);
    outline: none;
    background-color: white;
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
  
  /* User Filter */
  .user-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }
  
  .user-filter label {
    color: #2b3a67;
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .user-filter select {
    padding: 0.75rem 1rem;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    background-color: #f8f9fa;
    font-size: 0.9rem;
    color: #2b3a67;
    cursor: pointer;
    flex-grow: 1;
    max-width: 250px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 16px;
  }
  
  .user-filter select:focus {
    border-color: #3a86ff;
    box-shadow: 0 0 0 3px rgba(58, 134, 255, 0.1);
    outline: none;
    background-color: white;
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
    background-color: #f8f9fa;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #e9ecef;
  }
  
  .sort-label {
    color: #2b3a67;
    font-size: 0.875rem;
    font-weight: 500;
    margin-left: 0.5rem;
  }
  
  .sort-button {
    background: none;
    border: none;
    color: #6c757d;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .sort-button.active {
    color: white;
    background-color: #3a86ff;
  }
  
  .sort-button:hover:not(.active) {
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
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2rem;
  }
  
  .project-card {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: flex;
    flex-direction: column;
    position: relative;
    border: none;
  }
  
  .project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  }
  
  .project-card.is-owner {
    border-left: 4px solid #3a86ff;
  }
  
  .project-header {
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #f8f9fa;
  }
  
  .model-type {
    display: inline-block;
    padding: 0.4rem 0.8rem;
    background-color: var(--model-color, #3a86ff);
    color: white;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .model-type.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
  }
  
  .version-badge {
    background-color: #f8f9fa;
    color: #2b3a67;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
  }
  
  .version-badge.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
  }
  
  .project-name {
    padding: 1.25rem 1.25rem 0.5rem;
    margin: 0;
    font-size: 1.2rem;
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
    gap: 0.75rem;
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
    padding: 0.6rem 1rem;
    border-radius: 6px;
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
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(58, 134, 255, 0.2);
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
    
    .toolbar-left {
      width: 100%;
      margin-bottom: 1rem;
    }
    
    .search-box {
      max-width: 100%;
      width: 100%;
    }
    
    .user-filter {
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
    }
    
    .user-filter select {
      width: 100%;
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
    
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .header-actions {
      width: 100%;
    }
    
    .header-actions .btn-primary {
      width: 100%;
      justify-content: center;
    }
  }
</style>