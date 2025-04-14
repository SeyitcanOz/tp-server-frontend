<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import activityService from '$lib/services/activity';
  import adminService from '$lib/services/admin';
  import type { ActivityResponse } from '$lib/services/activity';
  import userService from '$lib/services/user';
  import { fade, scale } from 'svelte/transition';
  
  // Extend the ActivityResponse type to include the description field
  interface ExtendedActivityResponse extends ActivityResponse {
    description?: string;
  }
  
  // Navigation state
  let activeTab: 'activities' | 'users' = 'activities';
  
  // Ensure the user is an admin
  onMount(() => {
    if (!$user || !$user.roles.includes('Admin')) {
      goto('/forbidden');
    }
  });
  
  // Activity Log State
  let activities: ExtendedActivityResponse[] = [];
  let isLoadingActivities = true;
  let activityError: string | null = null;
  let currentPage = 1;
  let pageSize = 10;
  let totalPages = 1;
  let totalCount = 0;
  let hasNextPage = false;
  let hasPreviousPage = false;
  
  // Activity filtering
  let filterActionType = '';
  let filterEntityType = '';
  let searchQuery = '';
  
  // User map for displaying usernames
  let userMap: Record<string, string> = {};
  
  // For tracking which dropdown is open
  let openDropdown: 'action' | 'entity' | null = null;
  
  // Common action types for filter dropdown
  const commonActionTypes = ['Create', 'Update', 'Delete'];
  
  // Common entity types for filter dropdown
  const commonEntityTypes = ['Project', 'Version', 'User'];
  
  // User Management state
  let isCreatingUser = false;
  let createUserError: string | null = null;
  let createUserSuccess = false;
  
  // New user form data
  let newUsername = '';
  let newPassword = '';
  let confirmPassword = '';
  
  // Role selection (allow multiple) with proper typing
  let selectedRoles: Record<string, boolean> = {
    Admin: false,
    Engineer: true,
    Viewer: false
  };
  
  // Available roles
  const availableRoles = ['Admin', 'Engineer', 'Viewer'];
  
  // Loading activities
  async function loadActivities() {
    isLoadingActivities = true;
    activityError = null;
    
    try {
      const response = await activityService.getActivities({
        pageNumber: currentPage,
        pageSize,
        entityType: filterEntityType || undefined,
        actionType: filterActionType || undefined,
        sortBy: 'timestamp',
        sortDescending: true
      });
      
      activities = response.items;
      totalPages = response.totalPages;
      totalCount = response.totalCount;
      hasNextPage = response.hasNextPage;
      hasPreviousPage = response.hasPreviousPage;
      
      // Load user details for any unknown users
      const userIds = activities
        .map(a => a.userId)
        .filter(id => !userMap[id] && id !== $user?.id);
      
      if (userIds.length > 0) {
        try {
          await loadUserDetails(userIds);
        } catch (err) {
          console.error('Error loading additional user details:', err);
        }
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      activityError = 'Failed to load activity logs. Please try again.';
    } finally {
      isLoadingActivities = false;
    }
  }
  
  // Load user details
  async function loadUserDetails(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    
    for (const userId of uniqueIds) {
      if (userId === $user?.id) {
        userMap[userId] = $user.username;
        continue;
      }
      
      try {
        const userData = await userService.getUserById(userId);
        userMap[userId] = userData.username;
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        userMap[userId] = `User ${userId.substring(0, 6)}...`;
      }
    }
    
    // Force reactivity update
    userMap = { ...userMap };
  }
  
  // Apply activity filters
  function applyFilters() {
    currentPage = 1; // Reset to first page
    loadActivities();
  }
  
  // Reset activity filters
  function resetFilters() {
    filterEntityType = '';
    filterActionType = '';
    searchQuery = '';
    currentPage = 1;
    loadActivities();
    openDropdown = null; // Close dropdown after reset
  }
  
  // Format date for display
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
  
  // Get a color class based on action type
  function getActionTypeClass(actionType: string): string {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return 'action-create';
      case 'update':
        return 'action-update';
      case 'delete':
        return 'action-delete';
      default:
        return 'action-other';
    }
  }
  
  // Get action icon based on type
  function getActionIcon(actionType: string): string {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return 'add_circle';
      case 'update':
        return 'edit';
      case 'delete':
        return 'delete';
      default:
        return 'history';
    }
  }
  
  // Handle search
  function handleSearch() {
    // Only apply search if there's a query
    if (searchQuery.trim()) {
      currentPage = 1; // Reset to first page
      loadActivities();
    }
  }
  
  // Clear search
  function clearSearch() {
    searchQuery = '';
    currentPage = 1; // Reset to first page
    loadActivities();
  }
  
  // Set action type filter
  function setActionType(type: string) {
    if (filterActionType === type) {
      filterActionType = '';
    } else {
      filterActionType = type;
    }
    
    currentPage = 1; // Reset to first page
    loadActivities();
    openDropdown = null; // Close dropdown after selection
  }
  
  // Set entity type filter
  function setEntityType(type: string) {
    if (filterEntityType === type) {
      filterEntityType = '';
    } else {
      filterEntityType = type;
    }
    
    currentPage = 1; // Reset to first page
    loadActivities();
    openDropdown = null; // Close dropdown after selection
  }
  
  // Toggle dropdown
  function toggleDropdown(dropdown: 'action' | 'entity', event: MouseEvent) {
    // Stop event propagation to prevent immediate closing
    event.stopPropagation();
    
    if (openDropdown === dropdown) {
      openDropdown = null;
    } else {
      openDropdown = dropdown;
      
      // Position the dropdown on the next tick
      setTimeout(() => {
        const dropdownEl = document.querySelector('.custom-dropdown.is-open');
        const menuEl = dropdownEl?.querySelector('.dropdown-menu');
        const triggerEl = dropdownEl?.querySelector('.dropdown-trigger');
        
        if (dropdownEl && menuEl && triggerEl) {
          const rect = triggerEl.getBoundingClientRect();
          
          // Position the menu below the trigger button
          // Use proper type assertions to fix TypeScript errors
          (menuEl as HTMLElement).style.top = `${rect.bottom + 4}px`;
          (menuEl as HTMLElement).style.left = `${rect.left}px`;
          
          // Adjust if menu would go off-screen to the right
          const menuRight = rect.left + (menuEl as HTMLElement).offsetWidth;
          if (menuRight > window.innerWidth) {
            (menuEl as HTMLElement).style.left =
              `${window.innerWidth - (menuEl as HTMLElement).offsetWidth - 10}px`;
          }
        }
      }, 0);
    }
  }
  
  // Close all dropdowns (for outside clicks)
  function closeAllDropdowns() {
    openDropdown = null;
  }
  
  // Change page in pagination
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      loadActivities();
    }
  }
  
  // Handle tab switching
  function switchTab(tab: 'activities' | 'users') {
    activeTab = tab;
    
    // If switching to activities, load them
    if (tab === 'activities') {
      loadActivities();
    }
    
    // Reset user creation form if switching away from users
    if (tab !== 'users') {
      resetUserForm();
    }
  }
  
  // Reset user creation form
  function resetUserForm() {
    newUsername = '';
    newPassword = '';
    confirmPassword = '';
    selectedRoles = {
      Admin: false,
      Engineer: true,
      Viewer: false
    };
    createUserError = null;
    createUserSuccess = false;
  }
  
  // Toggle role selection
  function toggleRole(role: string) {
    selectedRoles[role] = !selectedRoles[role];
    
    // Ensure at least one role is selected
    const hasAnyRole = Object.values(selectedRoles).some(v => v);
    if (!hasAnyRole) {
      // If no roles selected, default to Engineer
      selectedRoles.Engineer = true;
    }
  }
  
  // Validate user form
  function validateUserForm(): { valid: boolean; error: string | null } {
    if (!newUsername.trim()) {
      return { valid: false, error: 'Username is required' };
    }
    
    if (newUsername.length < 4) {
      return { valid: false, error: 'Username must be at least 4 characters long' };
    }
    
    if (!newPassword.trim()) {
      return { valid: false, error: 'Password is required' };
    }
    
    if (newPassword.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters long' };
    }
    
    if (newPassword !== confirmPassword) {
      return { valid: false, error: 'Passwords do not match' };
    }
    
    return { valid: true, error: null };
  }
  
  // Create new user
  async function createUser() {
    // Validate form first
    const validation = validateUserForm();
    if (!validation.valid) {
      createUserError = validation.error;
      return;
    }
    
    isCreatingUser = true;
    createUserError = null;
    createUserSuccess = false;
    
    // Convert selectedRoles object to array of selected roles
    const rolesList = Object.entries(selectedRoles)
      .filter(([_, isSelected]) => isSelected)
      .map(([role, _]) => role);
    
    try {
      await adminService.registerUser(
        {
          username: newUsername,
          password: newPassword,
          confirmPassword: confirmPassword
        },
        rolesList
      );
      
      createUserSuccess = true;
      resetUserForm();
    } catch (err) {
      console.error('Error creating user:', err);
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        createUserError = axiosError.response?.data?.message || 'Failed to create user. Please try again.';
      } else {
        createUserError = 'Failed to create user. Please try again.';
      }
    } finally {
      isCreatingUser = false;
    }
  }
  
  // Load initial data
  onMount(() => {
    if (activeTab === 'activities') {
      loadActivities();
    }
    
    // Add click listener to close dropdowns when clicking outside
    document.addEventListener('click', closeAllDropdowns);
    
    // Clean up event listener on component unmount
    return () => {
      document.removeEventListener('click', closeAllDropdowns);
    };
  });
</script>

<svelte:head>
  <title>Admin Panel - TPServer</title>
  <meta name="description" content="TPServer administrator control panel" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="admin-page">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>Admin Panel</h2>
    </div>
    <nav class="sidebar-nav">
      <button 
        class="sidebar-nav-item" 
        class:active={activeTab === 'activities'}
        on:click={() => switchTab('activities')}
      >
        <span class="nav-icon">
          <span class="material-icons">history</span>
        </span>
        <span class="nav-text">Activities</span>
      </button>
      
      <button 
        class="sidebar-nav-item" 
        class:active={activeTab === 'users'}
        on:click={() => switchTab('users')}
      >
        <span class="nav-icon">
          <span class="material-icons">group</span>
        </span>
        <span class="nav-text">User Management</span>
      </button>
    </nav>
  </aside>

  <main class="main-content">
    <!-- Activities Tab -->
    {#if activeTab === 'activities'}
      <div class="tab-content">
        <header class="page-header">
          <div class="header-content">
            <div>
              <h1>Activity Logs</h1>
              <p class="text-muted">
                {#if totalCount > 0}
                  Showing {activities.length} of {totalCount} activity {totalCount !== 1 ? 'records' : 'record'}
                {:else}
                  Monitor system activities and user actions
                {/if}
              </p>
            </div>
          </div>
        </header>
        
        <div class="controls-container">
          <div class="search-controls">
            <!-- Search Bar -->
            <div class="search-wrapper">
              <div class="search-icon">
                <span class="material-icons">search</span>
              </div>
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search activities..."
                on:keyup={(e) => e.key === 'Enter' && handleSearch()}
                class="search-input"
              />
              {#if searchQuery}
                <button class="clear-button" on:click={clearSearch} aria-label="Clear search">
                  <span class="material-icons">close</span>
                </button>
              {/if}
            </div>

            <div class="controls-right">
              <!-- Custom Action Type Dropdown -->
              <div class="custom-dropdown" class:is-open={openDropdown === 'action'}>
                <button
                  class="dropdown-trigger"
                  on:click={(e) => toggleDropdown('action', e)}
                  aria-label="Filter by action type"
                >
                  <span class="trigger-text">
                    {filterActionType || 'Action Type'}
                  </span>
                  <span class="trigger-arrow">
                    <span class="material-icons">
                      {openDropdown === 'action' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </span>
                </button>

                {#if openDropdown === 'action'}
                  <div
                    class="dropdown-menu"
                    transition:scale={{ duration: 100, start: 0.95, opacity: 0 }}
                  >
                    <div class="dropdown-options">
                      <button
                        class="dropdown-option {!filterActionType ? 'is-active' : ''}"
                        on:click={() => setActionType('')}
                      >
                        <span class="option-check">
                          {#if !filterActionType}
                            <span class="material-icons">check</span>
                          {/if}
                        </span>
                        <span class="option-text">All Actions</span>
                      </button>

                      {#each commonActionTypes as type}
                        <button
                          class="dropdown-option {filterActionType === type ? 'is-active' : ''}"
                          on:click={() => setActionType(type)}
                        >
                          <span class="option-check">
                            {#if filterActionType === type}
                              <span class="material-icons">check</span>
                            {/if}
                          </span>
                          <span class="option-text">{type}</span>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
              
              <!-- Custom Entity Type Dropdown -->
              <div class="custom-dropdown" class:is-open={openDropdown === 'entity'}>
                <button
                  class="dropdown-trigger"
                  on:click={(e) => toggleDropdown('entity', e)}
                  aria-label="Filter by entity type"
                >
                  <span class="trigger-text">
                    {filterEntityType || 'Entity Type'}
                  </span>
                  <span class="trigger-arrow">
                    <span class="material-icons">
                      {openDropdown === 'entity' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </span>
                </button>

                {#if openDropdown === 'entity'}
                  <div
                    class="dropdown-menu"
                    transition:scale={{ duration: 100, start: 0.95, opacity: 0 }}
                  >
                    <div class="dropdown-options">
                      <button
                        class="dropdown-option {!filterEntityType ? 'is-active' : ''}"
                        on:click={() => setEntityType('')}
                      >
                        <span class="option-check">
                          {#if !filterEntityType}
                            <span class="material-icons">check</span>
                          {/if}
                        </span>
                        <span class="option-text">All Entities</span>
                      </button>

                      {#each commonEntityTypes as type}
                        <button
                          class="dropdown-option {filterEntityType === type ? 'is-active' : ''}"
                          on:click={() => setEntityType(type)}
                        >
                          <span class="option-check">
                            {#if filterEntityType === type}
                              <span class="material-icons">check</span>
                            {/if}
                          </span>
                          <span class="option-text">{type}</span>
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
          
          <!-- Enhanced Active Filters -->
          {#if filterEntityType || filterActionType || searchQuery}
            <div class="active-filters" transition:fade={{ duration: 150 }}>
              <div class="filter-content">
                <span class="filter-label">Active filters:</span>

                <div class="filter-tags">
                  {#if filterActionType}
                    <div class="filter-tag" transition:scale={{ duration: 120, start: 0.95 }}>
                      <span class="tag-icon">
                        <span class="material-icons">rule</span>
                      </span>
                      <span class="tag-text">{filterActionType}</span>
                      <button
                        class="tag-remove"
                        on:click={() => setActionType('')}
                        aria-label="Remove action type filter"
                      >
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  {/if}

                  {#if filterEntityType}
                    <div class="filter-tag" transition:scale={{ duration: 120, start: 0.95 }}>
                      <span class="tag-icon">
                        <span class="material-icons">category</span>
                      </span>
                      <span class="tag-text">{filterEntityType}</span>
                      <button
                        class="tag-remove"
                        on:click={() => setEntityType('')}
                        aria-label="Remove entity type filter"
                      >
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  {/if}

                  {#if searchQuery}
                    <div class="filter-tag" transition:scale={{ duration: 120, start: 0.95 }}>
                      <span class="tag-icon">
                        <span class="material-icons">search</span>
                      </span>
                      <span class="tag-text">{searchQuery}</span>
                      <button class="tag-remove" on:click={clearSearch} aria-label="Remove search filter">
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  {/if}
                </div>

                <button class="clear-all-btn" on:click={resetFilters}> Clear All </button>
              </div>
            </div>
          {/if}
        </div>
        
        {#if isLoadingActivities}
          <div class="loading-container">
            <div class="loader"></div>
            <p>Loading activity logs...</p>
          </div>
        {:else if activityError}
          <div class="error-container">
            <span class="material-icons error-icon">error_outline</span>
            <p>{activityError}</p>
            <button class="btn-primary" on:click={loadActivities}>Try Again</button>
          </div>
        {:else if activities.length === 0}
          <div class="empty-state">
            <div class="empty-icon-container">
              <span class="material-icons empty-icon">history</span>
            </div>
            <h2>No Activities Found</h2>
            {#if searchQuery || filterEntityType || filterActionType}
              <p>No activities matched your search criteria. Try a different query or clear the filters.</p>
              <div class="empty-actions">
                <button class="btn-secondary" on:click={resetFilters}>Clear All Filters</button>
              </div>
            {:else}
              <p>There are no activities recorded in the system yet.</p>
            {/if}
          </div>
        {:else}
          <div class="activities-list">
            {#each activities as activity (activity.id)}
              <div 
                class="activity-card" 
                in:fade={{ duration: 150 }}
              >
                <div class="card-header">
                  <div class="user-info">
                    <div class="avatar">
                      {activity.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span class="username">{activity.username || 'Unknown User'}</span>
                  </div>
                  
                  <div class="action-badge-wrapper">
                    <div class={`action-badge ${getActionTypeClass(activity.actionType)}`}>
                      <span class="material-icons">
                        {getActionIcon(activity.actionType)}
                      </span>
                      <span>{activity.actionType || 'Action'}</span>
                    </div>
                  </div>
                </div>
                
                <div class="card-body">
                  <div class="entity-info">
                    <span class="entity-label">Entity:</span>
                    <span class="entity-type">{activity.entityType || 'Unknown'}</span>
                    <span class="entity-id" title={activity.entityId}>
                      {activity.entityId || 'No ID'}
                    </span>
                  </div>
                  
                  {#if activity.description}
                    <div class="activity-description">
                      <p>{activity.description}</p>
                    </div>
                  {/if}
                  
                  <div class="card-meta">
                    <div class="meta-item">
                      <span class="material-icons meta-icon">update</span>
                      <span>{formatDate(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          
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
      </div>
    {/if}
    
    <!-- User Management Tab - REDESIGNED -->
    {#if activeTab === 'users'}
      <div class="tab-content">
        <header class="page-header">
          <div class="header-content">
            <div>
              <h1>User Management</h1>
              <p class="text-muted">Create and manage user accounts</p>
            </div>
          </div>
        </header>
        
        <!-- User Creation Form - Redesigned with Minimalist Approach -->
        <div class="card-container">
          <div class="card">
            <div class="card-header">
              <h2>Create New User</h2>
            </div>
            <div class="card-body minimal">
              {#if createUserSuccess}
                <div class="alert alert-success">
                  <span class="material-icons">check_circle</span>
                  <span>User created successfully!</span>
                </div>
              {/if}
              
              {#if createUserError}
                <div class="alert alert-error">
                  <span class="material-icons">error_outline</span>
                  <span>{createUserError}</span>
                </div>
              {/if}
              
              <form on:submit|preventDefault={createUser} class="create-user-form">
                <!-- Simplified vertical layout for credentials -->
                <div class="form-section">
                  <div class="form-group">
                    <label for="username">Username</label>
                    <div class="input-container">
                      <span class="material-icons input-icon">person</span>
                      <input 
                        type="text" 
                        id="username"
                        bind:value={newUsername}
                        disabled={isCreatingUser}
                        placeholder="Enter username (min 4 characters)"
                      />
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="password">Password</label>
                    <div class="input-container">
                      <span class="material-icons input-icon">lock</span>
                      <input 
                        type="password" 
                        id="password"
                        bind:value={newPassword}
                        disabled={isCreatingUser}
                        placeholder="Enter password (min 6 characters)"
                      />
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <div class="input-container">
                      <span class="material-icons input-icon">lock_clock</span>
                      <input 
                        type="password" 
                        id="confirmPassword"
                        bind:value={confirmPassword}
                        disabled={isCreatingUser}
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                </div>
                
                <!-- Role Selection - More compact layout -->
                <div class="form-group role-group">
                  <label id="role-group-label">User Roles <span class="role-required">(select at least one)</span></label>
                  
                  <div class="role-buttons" aria-labelledby="role-group-label">
                    {#each availableRoles as role}
                      <button 
                        type="button"
                        class="role-toggle-btn" 
                        class:selected={selectedRoles[role]} 
                        on:click={() => toggleRole(role)}
                        disabled={isCreatingUser}
                      >
                        <span class="checkbox">
                          {#if selectedRoles[role]}
                            <span class="material-icons check-icon">check</span>
                          {/if}
                        </span>
                        <span>{role}</span>
                      </button>
                    {/each}
                  </div>
                  
                  <div class="role-help-text">
                    <span class="material-icons info-icon">info</span>
                    <span>Admin (full access), Engineer (create/edit projects), Viewer (read-only)</span>
                  </div>
                </div>
                
                <!-- Action Buttons - More compact -->
                <div class="form-actions">
                  <button type="button" class="btn-reset" on:click={resetUserForm} disabled={isCreatingUser}>
                    Reset
                  </button>
                  <button type="submit" class="btn-create" disabled={isCreatingUser}>
                    {#if isCreatingUser}
                      <div class="button-spinner"></div>
                      <span>Creating...</span>
                    {:else}
                      <span class="material-icons">person_add</span>
                      <span>Create User</span>
                    {/if}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  /* ===== Page Layout ===== */
  .admin-page {
    display: flex;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.8rem;
  }
  
  /* ===== Sidebar Navigation ===== */
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
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 4px;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #334155;
    font-size: 0.85rem;
    font-weight: 500;
    font-family: inherit;
    text-align: left;
  }
  
  .sidebar-nav-item:hover {
    background-color: #f1f5f9;
  }
  
  .sidebar-nav-item.active {
    background-color: #5c9fff;
    color: white;
  }
  
  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .nav-icon .material-icons {
    font-size: 1.1rem;
  }
  
  .nav-text {
    flex: 1;
  }
  
  /* ===== Main Content ===== */
  .main-content {
    flex: 1;
    min-width: 0;
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
  
  /* ===== Card Container ===== */
  .card-container {
    margin-bottom: 1.5rem;
  }
  
  .card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .card-header {
    padding: 1rem 1.25rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .card-header h2 {
    margin: 0;
    font-size: 1rem;
    color: #1e3a8a;
    font-weight: 500;
  }
  
  .card-body {
    padding: 1.25rem;
  }
  
  /* ===== Form Elements - Original ===== */
  .card-body.compact {
    padding: 1rem;
  }
  
  /* NEW STYLES FOR MINIMALIST USER FORM */
  .card-body.minimal {
    padding: 1rem 1.25rem;
  }
  
  .create-user-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .form-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  
  label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #334155;
  }
  
  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .input-icon {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    font-size: 1rem;
  }
  
  input {
    width: 100%;
    padding: 0.45rem 0.75rem 0.45rem 2.25rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 0.8rem;
    background-color: #f8fafc;
    transition: all 0.2s ease;
    color: #334155;
  }
  
  input:focus {
    outline: none;
    border-color: #5c9fff;
    background-color: white;
    box-shadow: 0 0 0 2px rgba(92, 159, 255, 0.1);
  }
  
  /* Role Selection Styling - Minimalist */
  .role-group {
    margin-top: 0.25rem;
  }
  
  .role-required {
    font-size: 0.65rem;
    color: #94a3b8;
    font-weight: normal;
  }
  
  .role-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  
  .role-toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.65rem;
    border-radius: 4px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  
  .role-toggle-btn:hover:not(:disabled) {
    background-color: #f1f5f9;
  }
  
  .role-toggle-btn.selected {
    background-color: #ebf5ff;
    border-color: #5c9fff;
    color: #1d4ed8;
  }
  
  .role-toggle-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .checkbox {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid #cbd5e1;
    background-color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }
  
  .role-toggle-btn.selected .checkbox {
    background-color: #5c9fff;
    border-color: #5c9fff;
  }
  
  .check-icon {
    color: white;
    font-size: 0.7rem;
  }
  
  .role-help-text {
    font-size: 0.65rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.35rem;
  }
  
  .info-icon {
    font-size: 0.8rem;
    color: #5c9fff;
  }
  
  /* Smaller, more compact form actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding-top: 0.8rem;
    border-top: 1px solid #f1f5f9;
  }
  
  .btn-reset, .btn-create {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  
  .btn-create {
    background-color: #5c9fff;
    color: white;
    border: none;
  }
  
  .btn-create:hover:not(:disabled) {
    background-color: #4a89e8;
  }
  
  .btn-reset {
    background-color: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }
  
  .btn-reset:hover:not(:disabled) {
    background-color: #f1f5f9;
    color: #475569;
  }
  
  .btn-create:disabled, .btn-reset:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .button-spinner {
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-left-color: white;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    animation: spin 1s linear infinite;
  }
  
  /* ===== Alert Messages - Smaller for minimalist design ===== */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.8rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.75rem;
  }
  
  .alert-error {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  .alert-success {
    background-color: #dcfce7;
    color: #16a34a;
  }
  
  .alert .material-icons {
    font-size: 0.9rem;
  }
  
  /* ===== Search and Filter Controls (for Activities tab) ===== */
  .controls-container {
    margin-bottom: 1rem;
    background-color: white;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }
  
  .search-controls {
    display: flex;
    padding: 0.6rem;
    gap: 0.6rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  
  /* Enhanced Search Bar Styling */
  .search-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 180px;
    max-width: 450px;
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }
  
  .search-icon .material-icons {
    font-size: 0.9rem;
  }
  
  .search-input {
    width: 100%;
    padding: 0.5rem 0.6rem 0.5rem 2rem;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    font-size: 0.8rem;
    background-color: #f8fafc;
    transition: all 0.2s ease;
    color: #334155;
    height: 34px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .search-input:focus {
    outline: none;
    border-color: #5c9fff;
    background-color: white;
    box-shadow: 0 0 0 2px rgba(92, 159, 255, 0.15);
  }
  
  .clear-button {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    transition: all 0.15s ease;
  }
  
  .clear-button:hover {
    background-color: #f1f5f9;
    color: #475569;
  }
  
  .clear-button .material-icons {
    font-size: 0.8rem;
  }
  
  .controls-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  /* Custom Dropdown Styling */
  .custom-dropdown {
    position: relative;
    user-select: none;
    z-index: 10; /* Basic z-index for the container */
  }
  
  .dropdown-trigger {
    height: 34px;
    padding: 0 0.6rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.8rem;
    white-space: nowrap;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    font-weight: 400;
    font-family: inherit;
  }
  
  .dropdown-trigger:hover {
    background-color: #f1f5f9;
  }
  
  .custom-dropdown.is-open {
    z-index: 1002; /* Higher z-index when open to ensure it appears above other elements */
  }
  
  .custom-dropdown.is-open .dropdown-trigger {
    background-color: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  .trigger-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
  }
  
  .trigger-icon .material-icons {
    font-size: 0.9rem;
  }
  
  .trigger-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .trigger-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
  }
  
  .trigger-arrow .material-icons {
    font-size: 0.9rem;
    transition: transform 0.2s ease;
  }
  
  .dropdown-menu {
    position: fixed; /* Use fixed positioning instead of absolute */
    /* Remove top/left positioning - will be set dynamically */
    min-width: 150px;
    max-width: 220px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1002; /* Ensure it's above other elements */
    overflow: visible; /* Changed from hidden to visible */
    border: 1px solid #e2e8f0;
  }
  
  .dropdown-options {
    max-height: 200px;
    overflow-y: auto;
    padding: 0.3rem 0;
  }
  
  .dropdown-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.4rem 0.6rem;
    gap: 0.4rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    color: #334155;
    text-align: left;
    transition: background-color 0.15s ease;
    font-family: inherit;
  }
  
  .dropdown-option:hover {
    background-color: #f1f5f9;
  }
  
  .dropdown-option.is-active {
    background-color: #f0f7ff;
    color: #1d4ed8;
  }
  
  .option-check {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .option-check .material-icons {
    font-size: 14px;
    color: #1d4ed8;
  }
  
  .option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .option-icon .material-icons {
    font-size: 14px;
    color: #64748b;
  }
  
  .option-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* Enhanced Active Filters */
  .active-filters {
    padding: 0.6rem;
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
  }
  
  .filter-content {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
  }
  
  .filter-label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 500;
  }
  
  .filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    flex: 1;
  }
  
  .filter-tag {
    display: flex;
    align-items: center;
    background-color: #e0f2fe;
    color: #0369a1;
    padding: 0.25rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    gap: 0.4rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    animation: slideIn 0.2s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .tag-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .tag-icon .material-icons {
    font-size: 0.75rem;
  }
  
  .tag-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .tag-remove {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0369a1;
    cursor: pointer;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    padding: 0;
    transition: background-color 0.15s ease;
  }
  
  .tag-remove:hover {
    background-color: rgba(2, 132, 199, 0.15);
  }
  
  .tag-remove .material-icons {
    font-size: 0.7rem;
  }
  
  .clear-all-btn {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background-color: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }
  
  .clear-all-btn:hover {
    background-color: #e2e8f0;
    color: #475569;
  }
  
  /* ===== Loading, Error, Empty States ===== */
  .loading-container,
  .error-container,
  .empty-state {
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
    to {
      transform: rotate(360deg);
    }
  }
  
  .error-icon,
  .empty-icon {
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
  
  /* ===== Activity Cards ===== */
  .activities-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .activity-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: all 0.2s ease;
    border: 1px solid #e2e8f0;
  }
  
  .activity-card:hover {
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  }
  
  .card-header {
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: #5c9fff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
  }
  
  .username {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e3a8a;
  }
  
  .action-badge-wrapper {
    display: flex;
    align-items: center;
  }
  
  .action-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .action-badge .material-icons {
    font-size: 0.9rem;
  }
  
  .action-create {
    background-color: #dcfce7;
    color: #16a34a;
  }
  
  .action-update {
    background-color: #fef3c7;
    color: #d97706;
  }
  
  .action-delete {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  .action-other {
    background-color: #f1f5f9;
    color: #64748b;
  }
  
  .card-body {
    padding: 0.75rem 1rem;
  }
  
  .entity-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }
  
  .entity-label {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 500;
  }
  
  .entity-type {
    display: inline-flex;
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    font-size: 0.7rem;
    background-color: #5c9fff;
    color: white;
    white-space: nowrap;
    font-weight: 500;
  }
  
  .entity-id {
    font-family: monospace;
    font-size: 0.75rem;
    color: #1e3a8a;
    background-color: #f1f5f9;
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
  }
  
  .activity-description {
    margin: 0.5rem 0;
    font-size: 0.85rem;
    color: #334155;
    line-height: 1.4;
  }
  
  .activity-description p {
    margin: 0;
  }
  
  .card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: #64748b;
    font-size: 0.75rem;
  }
  
  .meta-icon {
    font-size: 0.9rem;
    color: #94a3b8;
  }
  
  /* ===== Pagination ===== */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
    margin-top: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    padding: 0.75rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .pagination-button {
    width: 30px;
    height: 30px;
    border-radius: 4px;
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
    font-size: 1rem;
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
    gap: 0.25rem;
  }
  
  .page-number {
    min-width: 30px;
    height: 30px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }
  
  .page-number.active {
    background-color: #5c9fff;
    color: white;
    border-color: #5c9fff;
  }
  
  .page-number:hover:not(.active) {
    background-color: #e2e8f0;
  }
  
  .page-ellipsis {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    color: #64748b;
    font-size: 0.85rem;
  }
  
  .pagination-info {
    margin-left: 0.5rem;
    color: #64748b;
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }
  
  /* Tooltip styles */
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
  
  .pagination .tooltip:hover::after {
    top: auto;
    bottom: 35px;
  }
  
  .pagination .tooltip:hover::before {
    top: auto;
    bottom: 25px;
    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
  }
  
  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
  
  /* Original Button Styles - Kept for Activities Tab */
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
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
  
  .btn-primary:hover:not(:disabled) {
    background-color: #4a89e8;
  }
  
  .btn-secondary {
    background-color: #f1f5f9;
    color: #334155;
    border: 1px solid #e2e8f0;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #e2e8f0;
  }
  
  .btn-primary:disabled, .btn-secondary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* ===== Responsive Styles ===== */
  @media (max-width: 992px) {
    .admin-page {
      flex-direction: column;
    }
    
    .sidebar {
      width: 100%;
      position: static;
      margin-bottom: 1.5rem;
    }
    
    .sidebar-nav {
      flex-direction: row;
      flex-wrap: wrap;
    }
    
    .sidebar-nav-item {
      flex-grow: 1;
      justify-content: center;
    }
  }
  
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
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
      margin-top: 0.5rem;
    }
    
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .action-badge-wrapper {
      align-self: flex-start;
    }
    
    .pagination-info {
      width: 100%;
      text-align: center;
      margin: 0.5rem 0 0;
    }
    
    .form-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }
    
    .form-actions button {
      width: 100%;
    }
  }
  
  @media (max-width: 576px) {
    .custom-dropdown, .dropdown-trigger {
      width: 100%;
    }
    
    .controls-right {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .pagination {
      padding: 0.75rem 0.5rem;
    }
    
    .page-numbers {
      order: -1;
      width: 100%;
      justify-content: center;
      margin-bottom: 0.4rem;
    }
  }
</style>