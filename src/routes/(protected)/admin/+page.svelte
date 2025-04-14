<script lang="ts">
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/auth';
    import { goto } from '$app/navigation';
    import adminService from '$lib/services/admin';
    import activityService from '$lib/services/activity';
    import type { RegisterRequest } from '$lib/types/auth';
    import type { ActivityResponse } from '$lib/services/activity';
    import userService from '$lib/services/user';
    import { fly, fade } from 'svelte/transition';
    
    // Ensure the user is an admin
    onMount(() => {
      if (!$user || !$user.roles.includes('Admin')) {
        goto('/forbidden');
      }
    });
  
    // User Registration State
    let newUser: RegisterRequest = {
      username: '',
      password: '',
      confirmPassword: ''
    };
    let selectedRoles: string[] = ['Engineer']; // Default role
    let isRegistering = false;
    let registrationSuccess = false;
    let registrationError: string | null = null;
    
    // Form validation
    let formErrors: Record<string, string> = {};
    
    // Available roles
    const availableRoles = [
      { id: 'Admin', name: 'Administrator' },
      { id: 'Engineer', name: 'Engineer' },
      { id: 'Viewer', name: 'Viewer' }
    ];
    
    // Activity Log State
    let activities: ActivityResponse[] = [];
    let isLoadingActivities = true;
    let activityError: string | null = null;
    let currentPage = 1;
    let pageSize = 20;
    let totalPages = 1;
    let totalCount = 0;
    
    // Activity filtering
    let filterUsername = '';
    let filterEntityType = '';
    let filterActionType = '';
    let filterProjectId = '';
    let filterFromDate: string | null = null;
    let filterToDate: string | null = null;
    let filterUserId: string | null = null;
    
    // User map for displaying usernames
    let userMap: Record<string, string> = {};
    
    // Loading activities
    async function loadActivities() {
      isLoadingActivities = true;
      activityError = null;
      
      try {
        const response = await activityService.getActivities({
          pageNumber: currentPage,
          pageSize,
          userId: filterUserId || undefined,
          projectId: filterProjectId || undefined,
          entityType: filterEntityType || undefined,
          actionType: filterActionType || undefined,
          fromDate: filterFromDate ? new Date(filterFromDate) : undefined,
          toDate: filterToDate ? new Date(filterToDate) : undefined,
          sortBy: 'timestamp',
          sortDescending: true
        });
        
        activities = response.items;
        totalPages = response.totalPages;
        totalCount = response.totalCount;
        
        // Load user details for any unknown users
        const userIds = activities
          .map(a => a.userId)
          .filter(id => !userMap[id] && id !== $user?.id);
        
        if (userIds.length > 0) {
          try {
            await loadUserDetails(userIds);
          } catch (err) {
            console.error('Error loading additional user details:', err);
            // Continue even if we can't load some user details
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
      // Filter out duplicate IDs
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
    
    // Register a new user
    async function registerUser() {
      // Reset state
      formErrors = {};
      registrationError = null;
      registrationSuccess = false;
      
      // Validate form
      let isValid = true;
      
      if (!newUser.username.trim()) {
        formErrors.username = 'Username is required';
        isValid = false;
      }
      
      if (!newUser.password) {
        formErrors.password = 'Password is required';
        isValid = false;
      } else if (newUser.password.length < 6) {
        formErrors.password = 'Password must be at least 6 characters long';
        isValid = false;
      }
      
      if (newUser.password !== newUser.confirmPassword) {
        formErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
      
      if (!isValid) return;
      
      isRegistering = true;
      
      try {
        await adminService.registerUser(newUser, selectedRoles);
        registrationSuccess = true;
        
        // Reset form
        newUser = {
          username: '',
          password: '',
          confirmPassword: ''
        };
        selectedRoles = ['Engineer']; // Reset to default role
        
        // Reload activities after successful registration
        await loadActivities();
      } catch (err) {
        console.error('Error registering user:', err);
        
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          registrationError = axiosError.response?.data?.message || 'Failed to register user. Please try again.';
        } else {
          registrationError = 'Failed to register user. Please try again.';
        }
      } finally {
        isRegistering = false;
      }
    }
    
    // Handle role checkbox changes
    function handleRoleChange(roleId: string, isChecked: boolean) {
      if (isChecked) {
        // Add role if it doesn't exist
        if (!selectedRoles.includes(roleId)) {
          selectedRoles = [...selectedRoles, roleId];
        }
      } else {
        // Remove role
        selectedRoles = selectedRoles.filter(r => r !== roleId);
      }
    }
    
    // Apply activity filters
    function applyFilters() {
      currentPage = 1; // Reset to first page
      loadActivities();
    }
    
    // Reset activity filters
    function resetFilters() {
      filterUsername = '';
      filterEntityType = '';
      filterActionType = '';
      filterProjectId = '';
      filterFromDate = null;
      filterToDate = null;
      filterUserId = null;
      currentPage = 1;
      loadActivities();
    }
    
    // Format date for display
    function formatDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    // Get a color class based on action type
    function getActionTypeClass(actionType: string): string {
      switch (actionType.toLowerCase()) {
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
    
    // Change page in pagination
    function changePage(newPage: number) {
      if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadActivities();
      }
    }
    
    // Watch for username filter changes to find matching user IDs
    $: {
      if (filterUsername) {
        // Find user ID by username
        const matchingUserId = Object.entries(userMap)
          .find(([id, username]) => 
            username.toLowerCase().includes(filterUsername.toLowerCase())
          )?.[0];
        
        filterUserId = matchingUserId || null;
      } else {
        filterUserId = null;
      }
    }
    
    // Load initial data
    onMount(() => {
      loadActivities();
    });
  </script>
  
  <svelte:head>
    <title>Admin Panel - TPServer</title>
    <meta name="description" content="TPServer administrator control panel" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  </svelte:head>
  
  <div class="page-container">
    <header class="page-header">
      <div class="header-content">
        <h1>Admin Panel</h1>
        <p class="subtitle">Manage users and monitor system activity</p>
      </div>
    </header>
    
    <div class="admin-grid">
      <!-- User Registration Card -->
      <div class="card user-registration-card">
        <div class="card-header">
          <h2>Create New User</h2>
        </div>
        
        <form on:submit|preventDefault={registerUser} class="registration-form">
          {#if registrationSuccess}
            <div class="alert alert-success" in:fly={{ y: -20, duration: 200 }}>
              <span class="material-icons">check_circle</span>
              <span>User registered successfully!</span>
            </div>
          {/if}
          
          {#if registrationError}
            <div class="alert alert-error" in:fly={{ y: -20, duration: 200 }}>
              <span class="material-icons">error_outline</span>
              <span>{registrationError}</span>
            </div>
          {/if}
          
          <div class="form-group">
            <label for="username">Username</label>
            <div class="input-container">
              <span class="material-icons input-icon">person</span>
              <input 
                type="text" 
                id="username" 
                bind:value={newUser.username} 
                placeholder="Enter username"
                class:error={!!formErrors.username}
                disabled={isRegistering}
              />
            </div>
            {#if formErrors.username}
              <div class="error-message">{formErrors.username}</div>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-container">
              <span class="material-icons input-icon">lock</span>
              <input 
                type="password" 
                id="password" 
                bind:value={newUser.password}
                placeholder="Enter password"
                class:error={!!formErrors.password}
                disabled={isRegistering}
              />
            </div>
            {#if formErrors.password}
              <div class="error-message">{formErrors.password}</div>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <div class="input-container">
              <span class="material-icons input-icon">lock_outline</span>
              <input 
                type="password" 
                id="confirmPassword" 
                bind:value={newUser.confirmPassword}
                placeholder="Confirm password"
                class:error={!!formErrors.confirmPassword}
                disabled={isRegistering}
              />
            </div>
            {#if formErrors.confirmPassword}
              <div class="error-message">{formErrors.confirmPassword}</div>
            {/if}
          </div>
          
          <div class="form-group">
            <label>User Roles</label>
            <div class="roles-container">
              {#each availableRoles as role}
                <label class="role-checkbox">
                  <input 
                    type="checkbox" 
                    checked={selectedRoles.includes(role.id)}
                    on:change={(e) => handleRoleChange(role.id, e.currentTarget.checked)}
                    disabled={isRegistering}
                  />
                  <span class="checkbox-label">{role.name}</span>
                </label>
              {/each}
            </div>
            {#if selectedRoles.length === 0}
              <div class="error-message">Select at least one role</div>
            {/if}
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary" disabled={isRegistering || selectedRoles.length === 0}>
              {#if isRegistering}
                <div class="button-spinner"></div>
                <span>Creating user...</span>
              {:else}
                <span class="material-icons">person_add</span>
                <span>Create User</span>
              {/if}
            </button>
          </div>
        </form>
      </div>
      
      <!-- Activity Log Card -->
      <div class="card activity-log-card">
        <div class="card-header">
          <h2>Activity Logs</h2>
          <span class="record-count">
            {totalCount} {totalCount === 1 ? 'record' : 'records'}
          </span>
        </div>
        
        <!-- Activity Filters -->
        <div class="filter-section">
          <div class="filter-header">
            <h3>Filters</h3>
            <button class="reset-filters-btn" on:click={resetFilters}>
              <span class="material-icons">refresh</span>
              Reset Filters
            </button>
          </div>
          
          <div class="filter-form">
            <div class="filter-row">
              <div class="filter-field">
                <label for="filterUsername">Username</label>
                <input 
                  type="text" 
                  id="filterUsername" 
                  bind:value={filterUsername}
                  placeholder="Filter by username"
                />
              </div>
              
              <div class="filter-field">
                <label for="filterEntityType">Entity Type</label>
                <input 
                  type="text" 
                  id="filterEntityType" 
                  bind:value={filterEntityType}
                  placeholder="Project, Version, etc."
                />
              </div>
              
              <div class="filter-field">
                <label for="filterActionType">Action Type</label>
                <input 
                  type="text" 
                  id="filterActionType" 
                  bind:value={filterActionType}
                  placeholder="Create, Update, Delete"
                />
              </div>
            </div>
            
            <div class="filter-row">
              <div class="filter-field">
                <label for="filterProjectId">Project ID</label>
                <input 
                  type="text" 
                  id="filterProjectId" 
                  bind:value={filterProjectId}
                  placeholder="Filter by project ID"
                />
              </div>
              
              <div class="filter-field">
                <label for="filterFromDate">From Date</label>
                <input 
                  type="datetime-local" 
                  id="filterFromDate" 
                  bind:value={filterFromDate}
                />
              </div>
              
              <div class="filter-field">
                <label for="filterToDate">To Date</label>
                <input 
                  type="datetime-local" 
                  id="filterToDate" 
                  bind:value={filterToDate}
                />
              </div>
            </div>
            
            <div class="filter-actions">
              <button class="apply-filters-btn" on:click={applyFilters}>
                <span class="material-icons">filter_list</span>
                Apply Filters
              </button>
            </div>
          </div>
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
          <div class="empty-activities">
            <span class="material-icons empty-icon">history</span>
            <p>No activities found matching your criteria</p>
            <button class="btn-secondary" on:click={resetFilters}>Clear Filters</button>
          </div>
        {:else}
          <div class="activity-list">
            {#each activities as activity (activity.id)}
              <div class="activity-item" in:fade={{ duration: 150 }}>
                <div class="activity-time">
                  <span class="timestamp">{formatDate(activity.timestamp)}</span>
                </div>
                
                <div class="activity-icon-container">
                  <div class={`activity-icon ${getActionTypeClass(activity.actionType)}`}>
                    <span class="material-icons">
                      {#if activity.actionType.toLowerCase() === 'create'}
                        add_circle
                      {:else if activity.actionType.toLowerCase() === 'update'}
                        edit
                      {:else if activity.actionType.toLowerCase() === 'delete'}
                        delete
                      {:else}
                        history
                      {/if}
                    </span>
                  </div>
                </div>
                
                <div class="activity-content">
                  <div class="activity-summary">
                    <span class="activity-username">{activity.username}</span>
                    <span class="action-type">{activity.actionType}</span>
                    <span class="entity-separator">a</span>
                    <span class="entity-type">{activity.entityType}</span>
                    <span class="entity-id">{activity.entityId}</span>
                  </div>
                  
                  {#if activity.details}
                    <div class="activity-details">
                      {activity.details}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          
          <!-- Pagination -->
          {#if totalPages > 1}
            <div class="pagination">
              <button 
                class="pagination-button"
                on:click={() => changePage(1)}
                disabled={currentPage === 1}
              >
                <span class="material-icons">first_page</span>
              </button>
              
              <button 
                class="pagination-button"
                on:click={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span class="material-icons">chevron_left</span>
              </button>
              
              <div class="page-info">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
              
              <button 
                class="pagination-button"
                on:click={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span class="material-icons">chevron_right</span>
              </button>
              
              <button 
                class="pagination-button"
                on:click={() => changePage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span class="material-icons">last_page</span>
              </button>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
  
  <style>
    /* Page Layout */
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }
    
    .page-header {
      margin-bottom: 1.5rem;
    }
    
    h1 {
      font-size: 1.5rem;
      margin: 0;
      color: #1e3a8a;
      font-weight: 500;
    }
    
    .subtitle {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
    }
    
    .admin-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.5rem;
    }
    
    /* Common Card Styles */
    .card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
    }
    
    .card-header {
      padding: 1rem 1.25rem;
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .card-header h2 {
      margin: 0;
      font-size: 1.1rem;
      color: #1e3a8a;
      font-weight: 500;
    }
    
    .record-count {
      font-size: 0.75rem;
      color: #64748b;
      background-color: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
    }
    
    /* Loading, Error, Empty States */
    .loading-container, .error-container, .empty-activities {
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      text-align: center;
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
      font-size: 2rem;
      color: #94a3b8;
    }
    
    .error-container p {
      color: #dc2626;
      font-weight: 500;
    }
    
    .empty-activities p {
      color: #64748b;
    }
    
    /* User Registration Styles */
    .registration-form {
      padding: 1.25rem;
    }
    
    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
    }
    
    .alert-success {
      background-color: #dcfce7;
      color: #16a34a;
    }
    
    .alert-error {
      background-color: #fee2e2;
      color: #dc2626;
    }
    
    .alert .material-icons {
      font-size: 1.1rem;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.4rem;
      font-size: 0.85rem;
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
      font-size: 1.1rem;
    }
    
    input {
      width: 100%;
      padding: 0.6rem 0.75rem 0.6rem 2.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 0.85rem;
      background-color: #f8fafc;
      transition: all 0.2s;
    }
    
    input:focus {
      outline: none;
      border-color: #5c9fff;
      background-color: white;
      box-shadow: 0 0 0 2px rgba(92, 159, 255, 0.1);
    }
    
    input.error {
      border-color: #dc2626;
      background-color: #fee2e2;
    }
    
    .error-message {
      color: #dc2626;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
    
    .roles-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    
    .role-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: normal;
      margin-bottom: 0;
    }
    
    .checkbox-label {
      font-size: 0.85rem;
      color: #334155;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }
    
    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
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
    
    .button-spinner {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-left-color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }
    
    /* Activity Log Styles */
    .filter-section {
      padding: 1.25rem;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .filter-header h3 {
      margin: 0;
      font-size: 0.95rem;
      color: #334155;
      font-weight: 500;
    }
    
    .reset-filters-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #5c9fff;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: all 0.15s ease;
    }
    
    .reset-filters-btn:hover {
      background-color: rgba(92, 159, 255, 0.1);
    }
    
    .reset-filters-btn .material-icons {
      font-size: 0.9rem;
    }
    
    .filter-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .filter-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    
    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .filter-field input {
      padding: 0.5rem 0.75rem;
    }
    
    .filter-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }
    
    .apply-filters-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.4rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      background-color: #5c9fff;
      color: white;
      border: none;
      transition: all 0.15s ease;
    }
    
    .apply-filters-btn:hover {
      background-color: #4a89e8;
    }
    
    .apply-filters-btn .material-icons {
      font-size: 0.9rem;
    }
    
    /* Activity List */
    .activity-list {
      padding: 1rem 0;
      overflow-y: auto;
      max-height: 600px;
    }
    
    .activity-item {
      display: flex;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      gap: 0.75rem;
    }
    
    .activity-item:last-child {
      border-bottom: none;
    }
    
    .activity-time {
      min-width: 110px;
      flex-shrink: 0;
    }
    
    .timestamp {
      font-size: 0.75rem;
      color: #64748b;
      white-space: nowrap;
    }
    
    .activity-icon-container {
      display: flex;
      align-items: flex-start;
      padding-top: 0.25rem;
    }
    
    .activity-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .activity-icon .material-icons {
      font-size: 0.9rem;
    }
    
    .activity-icon.action-create {
      background-color: #dcfce7;
      color: #16a34a;
    }
    
    .activity-icon.action-update {
      background-color: #fef3c7;
      color: #d97706;
    }
    
    .activity-icon.action-delete {
      background-color: #fee2e2;
      color: #dc2626;
    }
    
    .activity-icon.action-other {
      background-color: #f1f5f9;
      color: #64748b;
    }
    
    .activity-content {
      flex: 1;
      min-width: 0;
    }
    
    .activity-summary {
      font-size: 0.85rem;
      color: #334155;
      margin-bottom: 0.25rem;
    }
    
    .activity-username {
      font-weight: 600;
      color: #1e3a8a;
    }
    
    .action-type {
      font-weight: 500;
      text-transform: lowercase;
    }
    
    .entity-separator {
      margin: 0 0.2rem;
      color: #94a3b8;
    }
    
    .entity-type {
      font-weight: 500;
    }
    
    .entity-id {
      margin-left: 0.25rem;
      font-family: monospace;
      color: #64748b;
      font-size: 0.8rem;
    }
    
    .activity-details {
      font-size: 0.8rem;
      color: #64748b;
      white-space: pre-wrap;
      overflow-wrap: break-word;
    }
    
    /* Pagination */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      border-top: 1px solid #f1f5f9;
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
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .pagination-button:hover:not(:disabled) {
      background-color: #e2e8f0;
    }
    
    .pagination-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .pagination-button .material-icons {
      font-size: 1.1rem;
    }
    
    .page-info {
      margin: 0 0.5rem;
      font-size: 0.85rem;
      color: #64748b;
    }
    
    /* Responsive Layout */
    @media (max-width: 992px) {
      .admin-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .user-registration-card {
        order: 1;
      }
      
      .activity-log-card {
        order: 2;
      }
    }
    
    @media (max-width: 768px) {
      .filter-row {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      
      .activity-item {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .activity-time {
        width: 100%;
      }
      
      .activity-icon-container {
        display: none;
      }
    }
  </style>