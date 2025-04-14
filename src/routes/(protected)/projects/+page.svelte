<!-- src/routes/(protected)/projects/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import projectService from '$lib/services/project';
  import userService from '$lib/services/user';
  import type { PagedResponse, ProjectSummary } from '$lib/types/project';
  import { fade, fly } from 'svelte/transition';
  import DeleteConfirmationModal from '$lib/components/DeleteConfirmationModal.svelte';
  
  // Variables for filtering and state
  let projects: ProjectSummary[] = [];
  let isLoading = true;
  let loadingError: string | null = null;
  let currentPage = 1;
  let pageSize = 20;
  let totalPages = 1;
  let totalCount = 0;
  let searchQuery = '';
  let userMap: Record<string, string> = {}; // Maps user IDs to usernames
  let viewMode: 'grid' | 'list' = 'grid';
  let sortOrder: 'name' | 'updated' | 'version' = 'updated';
  let modellingTypes: string[] = [];
  let selectedModellingType = '';
  
  // For tracking which dropdown is open
  let openMenuId: string | null = null;
  
  // Admin-specific properties
  let userFilter: string | null = null; // For admin to filter by user
  let allUsers: {id: string, username: string}[] = []; // List of users for admin to filter by
  let isLoadingUsers = false;
  
  // For more visual data
  let projectsWithStats: (ProjectSummary & { 
    color: string,
    icon: string,
    ownerName: string,
    isOwner: boolean,
    dateFormatted: string,
    statusBadge: { text: string, color: string }
  })[] = [];
  
  // Delete confirmation modal state
  let showDeleteModal = false;
  let projectToDelete: string | null = null;
  let isDeleting = false;
  let deleteError: string | null = null;
  
  // Pagination info
  let hasNextPage = false;
  let hasPreviousPage = false;
  
  // Function to handle delete project
  function handleDeleteProject(projectId: string) {
    projectToDelete = projectId;
    showDeleteModal = true;
    deleteError = null;
  }
  
  // Close delete modal
  function closeDeleteModal() {
    showDeleteModal = false;
    projectToDelete = null;
  }
  
  // Confirm and execute delete
  async function confirmDelete() {
    if (!projectToDelete) return;
    
    isDeleting = true;
    try {
      await projectService.deleteProject(projectToDelete);
      // Close the modal and refresh projects
      showDeleteModal = false;
      projectToDelete = null;
      // Reload projects list
      await loadProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        deleteError = axiosError.response?.data?.message || 'Failed to delete project. Please try again.';
      } else {
        deleteError = 'Failed to delete project. Please try again.';
      }
    } finally {
      isDeleting = false;
    }
  }
  
  // Function to load projects with search, sort, and filter
  async function loadProjects() {
    isLoading = true;
    loadingError = null;
    
    try {
      // Convert our sortOrder to the API's sortBy parameter
      let sortBy: string;
      
      switch (sortOrder) {
        case 'name':
          sortBy = 'projectName';
          break;
        case 'version':
          sortBy = 'currentVersion';
          break;
        case 'updated':
        default:
          sortBy = 'updatedAt';
          break;
      }
      
      // Get projects with pagination, filtering, and sorting
      const response = await projectService.getProjects(currentPage, pageSize, {
        userId: userFilter || undefined,
        searchTerm: searchQuery || undefined,
        modellingType: selectedModellingType || undefined,
        sortBy,
        sortDescending: true
      });
      
      projects = response.items;
      totalPages = response.totalPages;
      totalCount = response.totalCount;
      hasNextPage = response.hasNextPage;
      hasPreviousPage = response.hasPreviousPage;
      
      // Collect all unique creator IDs
      const creatorIds = [...new Set(projects.map(p => p.createdBy))];
      
      // Load user details for display
      await loadUserDetails(creatorIds);
      
      // Enhance projects with visual data
      enhanceProjectsWithVisualData();
    } catch (err) {
      console.error('Error fetching projects:', err);
      loadingError = 'Failed to load projects. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  // Load modelling types for filter dropdown
  async function loadModellingTypes() {
    try {
      modellingTypes = await projectService.getModellingTypes();
    } catch (err) {
      console.error('Error loading modelling types:', err);
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

  // Function to handle search
  function handleSearch() {
    currentPage = 1;  // Reset to first page when searching
    loadProjects();
  }

  // Function to clear search
  function clearSearch() {
    searchQuery = '';
    currentPage = 1; // Reset to first page
    loadProjects();
  }

  function setUserFilter(userId: string | null) {
    userFilter = userId;
    currentPage = 1; // Reset to first page when changing filter
    loadProjects();
  }

  // Function to change sort order
  function setSortOrder(order: 'name' | 'updated' | 'version') {
    if (sortOrder !== order) {
      sortOrder = order;
      currentPage = 1; // Reset to first page when changing sort
      loadProjects();
    }
  }
  
  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
    // Save view mode preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('projectsViewMode', mode);
    }
  }
  
  function setModellingType(type: string) {
    if (selectedModellingType === type) {
      selectedModellingType = '';
    } else {
      selectedModellingType = type;
    }
    
    currentPage = 1; // Reset to first page
    loadProjects();
  }
  
  function clearFilters() {
    selectedModellingType = '';
    searchQuery = '';
    currentPage = 1;
    loadProjects();
  }
  
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      loadProjects();
    }
  }
  
  // Function to toggle dropdown menu
  function toggleMenu(projectId: string) {
    if (openMenuId === projectId) {
      openMenuId = null; // Close the menu if it's already open
    } else {
      openMenuId = projectId; // Open the clicked menu
    }
  }
  
  // Function to close all menus (for outside clicks)
  function closeAllMenus() {
    openMenuId = null;
  }
  
  // Enhance projects with visual metadata
  function enhanceProjectsWithVisualData() {
    projectsWithStats = projects.map(project => {
      // Generate consistent color based on project type
      const color = getModelTypeColor(project.modellingType);
      const icon = getModelTypeIcon(project.modellingType);
      
      // Format date for display
      const dateFormatted = formatDate(project.updatedAt);
      
      // Determine if current user is owner
      const isOwner = project.createdBy === $user?.id;
      
      // Owner name
      const ownerName = userMap[project.createdBy] || 'Unknown User';
      
      // Status badge based on version
      const statusBadge = getProjectStatusBadge(project);
      
      return {
        ...project,
        color,
        icon,
        dateFormatted,
        isOwner,
        ownerName,
        statusBadge
      };
    });
  }
  
  function getProjectStatusBadge(project: ProjectSummary): { text: string; color: string } {
    // Since we're only showing version numbers now, we'll use a single color
    return { text: `v${project.currentVersion}`, color: '#5c9fff' };
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
  
  // Check if user is admin
  $: isAdmin = $user?.roles?.includes('Admin') || false;
  
  // Generate a color based on model type for consistency
  function getModelTypeColor(modelType: string): string {
    // Using the specified color
    return '#5c9fff';
  }
  
  // Get a material icon name based on modeling type
  function getModelTypeIcon(modelType: string): string {
    const lcModelType = modelType.toLowerCase();
    
    if (lcModelType.includes('2d')) return 'view_in_ar';
    if (lcModelType.includes('3d')) return 'view_in_ar';
    if (lcModelType.includes('structural')) return 'layers';
    if (lcModelType.includes('analysis')) return 'analytics';
    if (lcModelType.includes('simulation')) return 'model_training';
    if (lcModelType.includes('test')) return 'science';
    if (lcModelType.includes('pilot')) return 'flight_takeoff';
    
    // Default icon
    return 'category';
  }
  
  onMount(() => {
    // Load modelling types for filter dropdown
    loadModellingTypes();
    
    // Initial load of projects
    loadProjects();
    
    // Check if the user prefers grid or list from localStorage
    const savedViewMode = localStorage.getItem('projectsViewMode');
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      viewMode = savedViewMode;
    }
    
    // Add click listener to close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      if (openMenuId && event.target) {
        // Type assertion to HTMLElement since EventTarget doesn't have closest method
        const target = event.target as HTMLElement;
        if (!target.closest('.action-menu')) {
          openMenuId = null;
        }
      }
    });
  });
</script>

<svelte:head>
  <title>Projects - TPServer</title>
  <meta name="description" content="Manage your engineering projects on TPServer" />
  <!-- Add Material Icons for project type icons -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="page-container">
  <header class="page-header">
    <div class="header-content">
      <div>
        <h1>Projects</h1>
        <p class="text-muted">
          {#if totalCount > 0}
            Showing {projects.length} of {totalCount} project{totalCount !== 1 ? 's' : ''}
          {:else}
            Manage your engineering projects
          {/if}
        </p>
      </div>
      <div class="header-actions">
        <a href="/projects/new" class="btn-primary">
          <span class="material-icons">add</span>
          Create Project
        </a>
      </div>
    </div>
  </header>

  <div class="controls-container">
    <div class="search-controls">
      <div class="search-wrapper">
        <input 
          type="text" 
          bind:value={searchQuery} 
          placeholder="Search projects..." 
          on:keyup={(e) => e.key === 'Enter' && handleSearch()}
          class="search-input" 
        />
        <button class="search-button" on:click={handleSearch}>
          <span class="material-icons">search</span>
        </button>
        {#if searchQuery}
          <button class="clear-button" on:click={clearSearch}>
            <span class="material-icons">close</span>
          </button>
        {/if}
      </div>
      
      <div class="controls-right">
        <!-- Modelling Type Filter Dropdown -->
        {#if modellingTypes.length > 0}
          <div class="model-type-filter">
            <select 
              bind:value={selectedModellingType}
              on:change={() => loadProjects()}
              class="model-select"
            >
              <option value="">All Types</option>
              {#each modellingTypes as type}
                <option value={type}>{type}</option>
              {/each}
            </select>
          </div>
        {/if}
        
        <!-- User filter dropdown for admin users -->
        {#if isAdmin}
          <div class="user-filter">
            <select 
              on:change={(e) => setUserFilter((e.target as HTMLSelectElement).value || null)}
              value={userFilter || ""}
              class="user-select"
            >
              <option value="">All Users</option>
              {#if $user}<option value={$user.id}>My Projects</option>{/if}
              {#each allUsers.filter(u => $user && u.id !== $user.id) as userOption}
                <option value={userOption.id}>{userOption.username}</option>
              {/each}
            </select>
          </div>
        {/if}
        
        <!-- Sort options -->
        <div class="sort-options">
          <select 
            bind:value={sortOrder}
            on:change={() => loadProjects()}
            class="sort-select"
          >
            <option value="updated">Last Updated</option>
            <option value="name">Name</option>
            <option value="version">Version</option>
          </select>
        </div>
        
        <!-- View mode toggle -->
        <div class="view-toggle">
          <button 
            class="icon-button tooltip" 
            class:active={viewMode === 'grid'} 
            on:click={() => setViewMode('grid')}
            data-tooltip="Grid view"
          >
            <span class="material-icons">grid_view</span>
          </button>
          <button 
            class="icon-button tooltip" 
            class:active={viewMode === 'list'} 
            on:click={() => setViewMode('list')}
            data-tooltip="List view"
          >
            <span class="material-icons">view_list</span>
          </button>
        </div>
      </div>
    </div>
    
    {#if selectedModellingType || searchQuery}
      <div class="active-filters">
        <div class="filter-content">
          <span class="filter-label">Active filters:</span>
          
          {#if selectedModellingType}
            <div class="filter-tag">
              <span>Type: {selectedModellingType}</span>
              <button class="tag-remove" on:click={() => setModellingType('')}>
                <span class="material-icons">close</span>
              </button>
            </div>
          {/if}
          
          {#if searchQuery}
            <div class="filter-tag">
              <span>Search: {searchQuery}</span>
              <button class="tag-remove" on:click={clearSearch}>
                <span class="material-icons">close</span>
              </button>
            </div>
          {/if}
          
          <button class="clear-all-btn" on:click={clearFilters}>
            Clear All
          </button>
        </div>
      </div>
    {/if}
  </div>

  {#if isLoading}
    <div class="loading-container">
      <div class="loader"></div>
      <p>Loading projects...</p>
    </div>
  {:else if loadingError}
    <div class="error-container">
      <span class="material-icons error-icon">error_outline</span>
      <p>{loadingError}</p>
      <button class="btn-primary" on:click={loadProjects}>Try Again</button>
    </div>
  {:else if projectsWithStats.length === 0}
    <div class="empty-state">
      <div class="empty-icon-container">
        <span class="material-icons empty-icon">article</span>
      </div>
      <h2>No Projects Found</h2>
      {#if searchQuery || selectedModellingType}
        <p>No projects matched your search criteria. Try a different query or clear the filters.</p>
        <div class="empty-actions">
          {#if searchQuery}
            <button class="btn-secondary" on:click={clearSearch}>Clear Search</button>
          {/if}
          {#if selectedModellingType}
            <button class="btn-secondary" on:click={() => setModellingType('')}>Clear Type Filter</button>
          {/if}
          <button class="btn-secondary" on:click={clearFilters}>Clear All Filters</button>
        </div>
      {:else}
        <p>You don't have any projects yet. Create your first project to get started.</p>
        <a href="/projects/new" class="btn-primary">Create First Project</a>
      {/if}
    </div>
  {:else}
    <!-- Grid View -->
    {#if viewMode === 'grid'}
      <div class="projects-grid">
        {#each projectsWithStats as project (project.id)}
          <div class="project-card" class:owner-card={project.isOwner} transition:fade={{ duration: 150 }}>
            <div class="card-header">
              <!-- Moved project name to header -->
              <h3 class="project-name">
                <a href={`/projects/${project.id}`}>{project.projectName}</a>
              </h3>
              <div class="version-tag">v{project.currentVersion}</div>
            </div>
            
            <div class="card-body">
              <div class="project-type">{project.modellingType}</div>
              
              <div class="project-meta">
                <div class="meta-item">
                  <span class="material-icons meta-icon">person</span>
                  <span>{project.ownerName}</span>
                </div>
                <div class="meta-item">
                  <span class="material-icons meta-icon">update</span>
                  <span>{project.dateFormatted}</span>
                </div>
              </div>
            </div>
            
            <div class="card-actions">
              <a href={`/projects/${project.id}`} class="view-link">View</a>
              <div class="action-menu">
                <button class="menu-trigger" on:click={() => toggleMenu(project.id)}>
                  <span class="material-icons">more_horiz</span>
                </button>
                {#if openMenuId === project.id}
                  <div class="menu-dropdown">
                    {#if project.isOwner || isAdmin}
                      <a href={`/projects/${project.id}/edit`} class="menu-item">
                        <span class="material-icons">edit</span>
                        <span>Edit</span>
                      </a>
                    {/if}
                    {#if isAdmin}
                      <button class="menu-item danger" on:click={() => handleDeleteProject(project.id)}>
                        <span class="material-icons">delete</span>
                        <span>Delete</span>
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="projects-list">
        <div class="list-header">
          <div class="list-cell project-info">Project</div>
          <div class="list-cell modeling-type">Type</div>
          <div class="list-cell owner">Owner</div>
          <div class="list-cell updated">Updated</div>
          <div class="list-cell actions">Actions</div>
        </div>
        
        {#each projectsWithStats as project (project.id)}
          <div class="list-row" class:owner-row={project.isOwner} transition:fade={{ duration: 150 }}>
            <div class="list-cell project-info">
              <div class="project-info-content">
                <div class="project-details">
                  <a href={`/projects/${project.id}`} class="project-link">{project.projectName}</a>
                  <span class="version-indicator">v{project.currentVersion}</span>
                </div>
              </div>
            </div>
            
            <div class="list-cell modeling-type">
              <span class="model-type-pill">
                {project.modellingType}
              </span>
            </div>
            
            <div class="list-cell owner">
              <div class="owner-info">
                <div class="owner-avatar">
                  {project.ownerName.charAt(0).toUpperCase()}
                </div>
                <span class="owner-name">{project.ownerName}</span>
              </div>
            </div>
            
            <div class="list-cell updated">
              <span class="date-info">
                {project.dateFormatted}
              </span>
            </div>
            
            <div class="list-cell actions">
              <div class="action-buttons">
                <a href={`/projects/${project.id}`} class="action-button list-tooltip" data-tooltip="View Project">
                  <span class="material-icons">visibility</span>
                </a>
                
                {#if project.isOwner || isAdmin}
                  <a href={`/projects/${project.id}/edit`} class="action-button list-tooltip" data-tooltip="Edit Project">
                    <span class="material-icons">edit</span>
                  </a>
                {/if}
                {#if isAdmin}
                  <button class="action-button list-tooltip" style="border: none;" data-tooltip="Delete Project" on:click={() => handleDeleteProject(project.id)}>
                    <span class="material-icons">delete</span>
                  </button>
                {/if}
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
          class="pagination-button tooltip"
          on:click={() => changePage(1)}
          disabled={currentPage === 1}
          data-tooltip="First Page"
        >
          <span class="material-icons">first_page</span>
        </button>
        
        <button 
          class="pagination-button tooltip"
          on:click={() => changePage(currentPage - 1)}
          disabled={currentPage === 1 || !hasPreviousPage}
          data-tooltip="Previous Page"
        >
          <span class="material-icons">chevron_left</span>
        </button>
        
        <div class="page-numbers">
          {#if totalPages <= 7}
            {#each Array(totalPages) as _, i}
              <button 
                class="page-number" 
                class:active={currentPage === i + 1}
                on:click={() => changePage(i + 1)}
              >
                {i + 1}
              </button>
            {/each}
          {:else}
            <!-- First page always shown -->
            <button 
              class="page-number" 
              class:active={currentPage === 1}
              on:click={() => changePage(1)}
            >
              1
            </button>
            
            <!-- Show ellipsis if we're not at the beginning -->
            {#if currentPage > 3}
              <span class="page-ellipsis">...</span>
            {/if}
            
            <!-- Pages around current page -->
            {#each Array(Math.min(5, totalPages)).fill(0) as _, i}
              {#if currentPage - 2 + i > 1 && currentPage - 2 + i < totalPages}
                <button 
                  class="page-number" 
                  class:active={currentPage === currentPage - 2 + i}
                  on:click={() => changePage(currentPage - 2 + i)}
                >
                  {currentPage - 2 + i}
                </button>
              {/if}
            {/each}
            
            <!-- Show ellipsis if we're not at the end -->
            {#if currentPage < totalPages - 2}
              <span class="page-ellipsis">...</span>
            {/if}
            
            <!-- Last page always shown -->
            <button 
              class="page-number" 
              class:active={currentPage === totalPages}
              on:click={() => changePage(totalPages)}
            >
              {totalPages}
            </button>
          {/if}
        </div>
        
        <button 
          class="pagination-button tooltip"
          on:click={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages || !hasNextPage}
          data-tooltip="Next Page"
        >
          <span class="material-icons">chevron_right</span>
        </button>
        
        <button 
          class="pagination-button tooltip"
          on:click={() => changePage(totalPages)}
          disabled={currentPage === totalPages}
          data-tooltip="Last Page"
        >
          <span class="material-icons">last_page</span>
        </button>
        
        <div class="pagination-info">
          <span>Page {currentPage} of {totalPages}</span>
        </div>
      </div>
    {/if}
  {/if}
  
  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <DeleteConfirmationModal 
      isOpen={showDeleteModal}
      title="Delete Project"
      message="Are you sure you want to delete this project? All versions and associated data will be permanently removed."
      itemName={projectToDelete ? projectsWithStats.find(p => p.id === projectToDelete)?.projectName : ''}
      isDeleting={isDeleting}
      error={deleteError}
      on:confirm={confirmDelete}
      on:cancel={closeDeleteModal}
    />
  {/if}
</div>

<style>
  /* ===== Main Layout ===== */
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.8rem;
  }
  
  /* ===== Page Header ===== */
  .page-header {
    margin-bottom: 1rem;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  h1 {
    font-size: 1.5rem;
    margin: 0;
    color: #1e3a8a;
    font-weight: 500;
  }
  
  .text-muted {
    color: #64748b;
    margin: 0.2rem 0 0;
    font-size: 0.75rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.4rem;
  }
  
  .btn-primary {
    background-color: #5c9fff;
    color: white;
    padding: 0.35rem 0.7rem;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 400;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    font-size: 0.8rem;
  }
  
  .btn-primary:hover {
    background-color: #1d4ed8;
  }
  
  .btn-secondary {
    background-color: #f1f5f9;
    color: #334155;
    padding: 0.35rem 0.7rem;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 400;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.8rem;
  }
  
  .btn-secondary:hover {
    background-color: #e2e8f0;
  }
  
  /* ===== Search and Filter Controls ===== */
  .controls-container {
    margin-bottom: 1rem;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }
  
  .search-controls {
    display: flex;
    padding: 0.5rem;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  .search-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 200px;
    max-width: 500px;
  }
  
  .search-input {
    width: 100%;
    padding: 0.4rem 0.6rem;
    border-radius: 4px 0 0 4px;
    border: 1px solid #e2e8f0;
    border-right: none;
    font-size: 0.8rem;
    background-color: #f8fafc;
    height: 32px;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #e2e8f0;
    background-color: white;
  }
  
  .search-button {
    height: 32px;
    padding: 0 0.6rem;
    border: 1px solid #e2e8f0;
    border-left: none;
    border-radius: 0 4px 4px 0;
    background-color: #f8fafc;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .search-button:hover {
    background-color: #e2e8f0;
  }
  
  .search-button .material-icons {
    font-size: 1rem;
  }
  
  .clear-button {
    position: absolute;
    right: 2.5rem;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .clear-button:hover {
    color: #64748b;
  }
  
  .clear-button .material-icons {
    font-size: 0.9rem;
  }
  
  .controls-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .model-type-filter, .sort-options, .user-filter {
    height: 32px;
  }
  
  .model-select, .sort-select, .user-select {
    height: 100%;
    padding: 0 0.6rem;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    background-color: #f8fafc;
    font-size: 0.8rem;
    color: #64748b;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 0.8rem;
    padding-right: 1.5rem;
    min-width: 100px;
  }
  
  .model-select:focus, .sort-select:focus, .user-select:focus {
    outline: none;
    border-color: #5c9fff;
  }
  
  .icon-button {
    height: 32px;
    width: 32px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }
  
  .icon-button .material-icons {
    font-size: 1rem;
  }
  
  .icon-button:hover {
    background-color: #e2e8f0;
  }
  
  .icon-button.active {
    background-color: #5c9fff;
    border-color: #5c9fff;
    color: white;
  }
  
  /* Active filters section */
  .active-filters {
    padding: 0.5rem;
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
  }
  
  .filter-content {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  
  .filter-label {
    font-size: 0.75rem;
    color: #64748b;
    margin-right: 0.5rem;
  }
  
  .filter-tag {
    display: flex;
    align-items: center;
    background-color: #e0f2fe;
    color: #0ea5e9;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    gap: 0.25rem;
  }
  
  .tag-remove {
    background: none;
    border: none;
    color: #0ea5e9;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  
  .tag-remove .material-icons {
    font-size: 0.9rem;
  }
  
  .clear-all-btn {
    background: none;
    border: none;
    color: #64748b;
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    margin-left: auto;
  }
  
  .clear-all-btn:hover {
    text-decoration: underline;
    color: #475569;
  }
  
  .view-toggle {
    display: flex;
    height: 32px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  
  .view-toggle .icon-button {
    border: none;
    border-radius: 0;
    width: 32px;
    height: 30px;
  }
  
  .view-toggle .icon-button.active {
    background-color: #5c9fff;
    color: white;
  }
  
  /* ===== Loading, Error, Empty States ===== */
  .loading-container, .error-container, .empty-state {
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
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-icon, .empty-icon {
    font-size: 2.5rem;
    color: #6c757d;
    opacity: 0.5;
  }
  
  .error-container p {
    color: #dc2626;
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  .empty-icon-container {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .empty-state h2 {
    margin: 0;
    color: #1e3a8a;
    font-size: 1.3rem;
  }
  
  .empty-state p {
    color: #6c757d;
    max-width: 500px;
    margin: 0 auto;
    font-size: 0.9rem;
  }
  
  .empty-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  /* ===== Grid View ===== */
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.8rem;
    margin-bottom: 1.2rem;
  }
  
  .project-card {
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    transition: all 0.15s ease;
    border: 1px solid #e2e8f0;
    position: relative;
  }
  
  .project-card:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .owner-card {
    border-left: 2px solid #5c9fff;
  }
  
  .card-header {
    padding: 0.6rem;
    background-color: #f8fafc;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-header .project-name {
    margin: 0;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    padding-right: 0.5rem;
  }
  
  .version-tag {
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 500;
    background-color: white;
    color: #5c9fff;
  }
  
  .card-body {
    padding: 0.6rem;
  }
  
  .project-name {
    margin: 0 0 0.3rem;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .project-name a {
    color: #1e3a8a;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  
  .project-name a:hover {
    color: #5c9fff;
  }
  
  .project-type {
    color: #64748b;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .project-meta {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: #64748b;
    font-size: 0.7rem;
  }
  
  .meta-icon {
    font-size: 0.8rem;
    color: #94a3b8;
  }
  
  .card-actions {
    padding: 0.5rem 0.6rem;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .view-link {
    color: #5c9fff;
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }
  
  .view-link:hover {
    text-decoration: underline;
  }
  
  .action-menu {
    position: relative;
  }
  
  .menu-trigger {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
  }
  
  .menu-trigger:hover {
    background-color: #f1f5f9;
  }
  
  .menu-trigger .material-icons {
    font-size: 0.9rem;
  }
  
  .menu-dropdown {
    position: absolute;
    right: 0;
    bottom: 28px; /* Position above the trigger button */
    background-color: white;
    border-radius: 3px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    width: 160px;
    z-index: 1000;
    overflow: visible;
    border: 1px solid #e2e8f0;
  }
  
  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.7rem;
    color: #1e3a8a;
    text-decoration: none;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-size: 0.75rem;
    font-family: inherit;
  }
  
  .menu-item .material-icons {
    font-size: 0.8rem;
  }
  
  .menu-item:hover {
    background-color: #f1f5f9;
  }
  
  .menu-item.danger {
    color: #dc2626;
  }
  
  .menu-item.danger:hover {
    background-color: rgba(220, 38, 38, 0.1);
  }
  
  /* ===== List View ===== */
  .projects-list {
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    margin-bottom: 1.2rem;
    border: 1px solid #e2e8f0;
  }
  
  .list-header {
    display: flex;
    background-color: #f8fafc;
    padding: 0.5rem 0.6rem;
    font-weight: 500;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.5px;
  }
  
  .list-row {
    display: flex;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid #f1f5f9;
    transition: all 0.15s ease;
  }
  
  .list-row:hover {
    background-color: #f9fafb;
  }
  
  .owner-row {
    border-left: 2px solid #5c9fff;
  }
  
  .list-cell {
    padding: 0 0.3rem;
    display: flex;
    align-items: center;
    overflow: hidden;
  }
  
  .list-cell.project-info {
    flex: 3;
    min-width: 200px;
    overflow: hidden;
  }
  
  .list-cell.modeling-type {
    flex: 2;
    min-width: 120px;
  }
  
  .list-cell.owner {
    flex: 2;
    min-width: 120px;
  }
  
  .list-cell.updated {
    flex: 1;
    min-width: 100px;
  }
  
  .list-cell.actions {
    flex: 1;
    min-width: 80px;
    justify-content: flex-end;
  }
  
  .project-info-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
  }
  
  .project-details {
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .project-link {
    font-weight: 500;
    color: #1e3a8a;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s ease;
    font-size: 0.8rem;
  }
  
  .project-link:hover {
    color: #5c9fff;
  }
  
  .version-indicator {
    font-size: 0.65rem;
    color: #64748b;
  }
  
  .model-type-pill {
    display: inline-flex;
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    font-size: 0.7rem;
    background-color: #5c9fff;
    color: white;
    white-space: nowrap;
  }
  
  .owner-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .owner-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background-color: #5c9fff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    font-size: 0.7rem;
  }
  
  .owner-name {
    font-size: 0.75rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .date-info {
    font-size: 0.7rem;
    color: #64748b;
  }
  
  .action-buttons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    position: relative;
  }
  
  /* Base action button style update */
  .action-button {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: all 0.15s ease;
    background-color: #f1f5f9;
  }

  /* Make the icons smaller too */
  .action-button .material-icons {
    font-size: 0.75rem;
  }

  /* View button - Blue */
  .action-button[data-tooltip="View Project"] .material-icons {
    color: rgba(92, 159, 255, 0.9);
  }

  .action-button[data-tooltip="View Project"]:hover {
    background-color: rgba(92, 159, 255, 0.1);
  }

  /* Edit button - Green */
  .action-button[data-tooltip="Edit Project"] .material-icons {
    color: rgba(76, 175, 80, 0.9);
  }

  .action-button[data-tooltip="Edit Project"]:hover {
    background-color: rgba(76, 175, 80, 0.1);
  }

  /* Delete button - Red */
  .action-button[data-tooltip="Delete Project"] .material-icons {
    color: rgba(244, 67, 54, 0.9);
  }

  .action-button[data-tooltip="Delete Project"]:hover {
    background-color: rgba(244, 67, 54, 0.1);
  }

  /* Simple hover effect for all buttons */
  .action-button:hover {
    transform: translateY(-1px);
  }
  
  /* Custom tooltip styles */
  .tooltip {
    position: relative;
  }
  
  .tooltip:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.25rem 0.5rem;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 3px;
    font-size: 0.7rem;
    white-space: nowrap;
    z-index: 1010;
    pointer-events: none;
    opacity: 0;
    animation: fadeIn 0.2s ease-in-out forwards;
  }
  
  .tooltip:hover::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    z-index: 1010;
    opacity: 0;
    animation: fadeIn 0.2s ease-in-out forwards;
  }
  
  /* Special treatment for pagination tooltips */
  .pagination .tooltip:hover::after {
    top: auto;
    bottom: 35px;
  }
  
  .pagination .tooltip:hover::before {
    top: auto;
    bottom: 25px;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
  }
  
  /* Special treatment for list view action buttons */
  .list-tooltip:hover::after {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }
  
  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
  
  /* ===== Pagination ===== */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  .pagination-button {
    width: 26px;
    height: 26px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .pagination-button .material-icons {
    font-size: 0.9rem;
  }
  
  .pagination-button:hover:not(:disabled) {
    background-color: #e2e8f0;
  }
  
  .pagination-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .page-numbers {
    display: flex;
    gap: 0.15rem;
  }
  
  .page-number {
    width: 26px;
    height: 26px;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.75rem;
  }
  
  .page-number.active {
    background-color: #5c9fff;
    color: white;
    border-color: #5c9fff;
  }
  
  .page-number:hover:not(.active) {
    background-color: #f1f5f9;
  }
  
  .page-ellipsis {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: #64748b;
    font-size: 0.75rem;
  }
  
  .pagination-info {
    margin-left: 0.5rem;
    color: #64748b;
    font-size: 0.7rem;
  }
  
  /* ===== Responsive Styles ===== */
  @media (max-width: 1200px) {
    .projects-grid {
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }
  }
  
  @media (max-width: 992px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    
    .header-actions {
      width: 100%;
    }
    
    .search-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .search-wrapper {
      width: 100%;
      max-width: none;
    }
    
    .controls-right {
      width: 100%;
      justify-content: space-between;
    }
    
    .model-type-filter, .sort-options, .user-filter {
      flex: 1;
    }
    
    .project-card {
      margin-bottom: 0.5rem;
    }
  }
  
  @media (max-width: 768px) {
    .projects-grid {
      grid-template-columns: 1fr;
    }
    
    .list-header {
      display: none;
    }
    
    .list-row {
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
    }
    
    .list-cell {
      width: 100%;
      padding: 0;
    }
    
    .list-cell.project-info {
      margin-bottom: 0.4rem;
    }
    
    .list-cell.actions {
      justify-content: flex-start;
      margin-top: 0.4rem;
    }
    
    .owner-row {
      border-left: none;
      border-top: 3px solid #5c9fff;
    }
    
    .model-type-pill {
      align-self: flex-start;
    }
    
    .pagination {
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .pagination-info {
      width: 100%;
      text-align: center;
      margin: 0.4rem 0 0;
    }
    
    .page-numbers {
      order: -1;
      width: 100%;
      justify-content: center;
      margin-bottom: 0.4rem;
    }
  }
  
  @media (max-width: 576px) {
    .menu-dropdown {
      bottom: auto;
      right: 0;
      top: 28px;
    }
    
    .action-buttons {
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 0.5rem;
    }
    
    .controls-right {
      flex-direction: column;
      align-items: stretch;
    }
    
    .model-type-filter, .sort-options, .user-filter, .view-toggle {
      width: 100%;
    }
    
    .view-toggle {
      justify-content: space-between;
    }
    
    .view-toggle .icon-button {
      flex: 1;
    }
    
    .active-filters .filter-content {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .clear-all-btn {
      margin-left: 0;
      align-self: flex-end;
    }
  }
</style>