<!-- src/routes/(protected)/projects/[id]/edit/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { user } from '$lib/stores/auth';
    import api from '$lib/services/api';
    import { goto } from '$app/navigation';
    import type { ProjectDetail } from '$lib/types/project';
    
    // Project data
    let project: ProjectDetail | null = null;
    let isLoading = true;
    let isSaving = false;
    let error: string | null = null;
    let saveSuccess = false;
    
    // Form fields
    let projectName = '';
    let modellingType = '';
    
    // Form validation
    let errors: Record<string, string> = {};
    
    // Extract project ID from URL
    $: projectId = $page.params.id;
    
    // Check if user is admin or project owner
    $: isAdminOrOwner = $user && ($user.roles.includes('Admin') || ($user.id === project?.createdBy));
    
    async function loadProject() {
      isLoading = true;
      error = null;
      
      try {
        const response = await api.get<ProjectDetail>(`/api/projects/${projectId}`);
        project = response.data;
        
        // Initialize form fields
        projectName = project.projectName;
        modellingType = project.modellingType;
      } catch (err) {
        console.error('Error fetching project details:', err);
        error = 'Failed to load project details. Please try again.';
      } finally {
        isLoading = false;
      }
    }
    
    function validateForm(): boolean {
      errors = {};
      let isValid = true;
      
      if (!projectName.trim()) {
        errors.projectName = 'Project name is required';
        isValid = false;
      } else if (!/^\d{2}-\d{2}-M\d{2}-\d{2}(-[A-Z])?$/.test(projectName)) {
        errors.projectName = 'Project name must follow format: XX-XX-MXX-XX (e.g. 02-30-M02-01) or XX-XX-MXX-XX-X (e.g. 02-30-M02-01-A)';
        isValid = false;
      }
      
      if (!modellingType.trim()) {
        errors.modellingType = 'Modelling type is required';
        isValid = false;
      }
      
      return isValid;
    }
    
    async function handleSubmit() {
      if (!validateForm()) return;
      
      isSaving = true;
      error = null;
      saveSuccess = false;
      
      try {
        await api.put(`/api/projects/${projectId}`, {
          projectName,
          modellingType
        });
        
        saveSuccess = true;
        
        // Redirect back to project page after short delay to show success message
        setTimeout(() => {
          goto(`/projects/${projectId}`);
        }, 1500);
      } catch (err) {
        console.error('Error updating project:', err);
        
        // Handle specific error types
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { message?: string } } };
          if (axiosError.response?.data?.message) {
            error = axiosError.response.data.message;
          } else {
            error = 'Failed to update project. Please try again.';
          }
        } else {
          error = 'Failed to update project. Please try again.';
        }
      } finally {
        isSaving = false;
      }
    }
    
    function handleCancel() {
      goto(`/projects/${projectId}`);
    }
    
    onMount(() => {
      // Check if user has permission to edit
      if (!$user) {
        goto('/login');
        return;
      }
      
      loadProject();
    });
  </script>
  
  <svelte:head>
    <title>Edit Project - TPServer</title>
    <meta name="description" content="Edit project details" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  </svelte:head>
  
  <div class="overlay">
    <div class="page-container">
      {#if isLoading}
        <div class="loading-container">
          <div class="loader"></div>
          <p>Loading project details...</p>
        </div>
      {:else if error && !project}
        <div class="error-container">
          <span class="material-icons error-icon">error_outline</span>
          <p>{error}</p>
          <div class="error-actions">
            <button class="btn-primary" on:click={loadProject}>Try Again</button>
            <a href="/projects" class="btn-secondary">Back to Projects</a>
          </div>
        </div>
      {:else if project && !isAdminOrOwner}
        <div class="error-container">
          <span class="material-icons error-icon">lock</span>
          <p>You don't have permission to edit this project.</p>
          <div class="error-actions">
            <a href={`/projects/${projectId}`} class="btn-secondary">Back to Project</a>
          </div>
        </div>
      {:else if project}
        <div class="form-card">
          <div class="form-header">
            <div class="header-content">
              <div class="header-icon">
                <span class="material-icons">edit</span>
              </div>
              <div class="header-text">
                <h1>Edit Project</h1>
                <p class="header-project-name">{project.projectName}</p>
              </div>
            </div>
          </div>
          
          <form on:submit|preventDefault={handleSubmit}>
            {#if error}
              <div class="alert alert-error">
                <span class="material-icons">error_outline</span>
                <span>{error}</span>
              </div>
            {/if}
            
            {#if saveSuccess}
              <div class="alert alert-success">
                <span class="material-icons">check_circle</span>
                <span>Project updated successfully! Redirecting...</span>
              </div>
            {/if}
            
            <div class="form-group">
              <label for="projectName">Project Name</label>
              <div class="input-container">
                <span class="material-icons input-icon">badge</span>
                <input 
                  type="text" 
                  id="projectName" 
                  bind:value={projectName} 
                  class:error={!!errors.projectName}
                  disabled={isSaving}
                />
              </div>
              {#if errors.projectName}
                <div class="error-message">{errors.projectName}</div>
              {/if}
              <div class="help-text">
                Format: XX-XX-MXX-XX (e.g. 02-30-M02-01) for single blocks or
                XX-XX-MXX-XX-X (e.g. 02-30-M02-01-A) for multiple blocks
              </div>
            </div>
            
            <div class="form-group">
              <label for="modellingType">Modelling Type</label>
              <input 
                type="text" 
                id="modellingType" 
                bind:value={modellingType} 
                class:error={!!errors.modellingType}
                disabled={isSaving}
              />
              {#if errors.modellingType}
                <div class="error-message">{errors.modellingType}</div>
              {/if}
            </div>
            
            <div class="form-footer">
              <button type="button" class="btn-secondary" on:click={handleCancel} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" class="btn-primary" disabled={isSaving}>
                {#if isSaving}
                  <div class="button-spinner"></div>
                  <span>Saving...</span>
                {:else}
                  <span class="material-icons">save</span>
                  <span>Save Changes</span>
                {/if}
              </button>
            </div>
          </form>
        </div>
      {/if}
    </div>
  </div>
  
  <style>
    /* Overlay with full-screen blur */
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(241, 245, 249, 0.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      overflow-y: auto;
      padding: 2rem 1rem;
    }
    
    /* Base Styles */
    .page-container {
      width: 100%;
      max-width: 500px;
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
    
    .loader, .button-spinner {
      border: 3px solid rgba(92, 159, 255, 0.2);
      border-left-color: #5c9fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    .loader {
      width: 32px;
      height: 32px;
    }
    
    .button-spinner {
      width: 14px;
      height: 14px;
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
    
    /* Form Card */
    .form-card {
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    
    /* Improved Form Header */
    .form-header {
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
      color: white;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .header-icon .material-icons {
      font-size: 1.5rem;
    }
    
    .header-text {
      flex: 1;
    }
    
    .header-text h1 {
      font-size: 1.5rem;
      margin: 0;
      font-weight: 500;
      line-height: 1.2;
    }
    
    .header-project-name {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      opacity: 0.9;
    }
    
    form {
      padding: 1.5rem;
    }
    
    /* Form Elements */
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
      padding: 0.6rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 0.85rem;
      background-color: #f8fafc;
      transition: all 0.2s;
    }
    
    .input-container input {
      padding-left: 2.5rem;
    }
    
    input:focus {
      outline: none;
      border-color: #5c9fff;
      background-color: white;
      box-shadow: 0 0 0 2px rgba(92, 159, 255, 0.1);
    }
    
    input.error {
      border-color: #dc2626;
      background-color: #fef2f2;
    }
    
    input.error:focus {
      box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
    }
    
    .error-message {
      color: #dc2626;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
    
    .help-text {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
    }
    
    /* Form Footer */
    .form-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    
    /* Buttons - Smaller Size */
    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.8rem;
      border-radius: 4px;
      font-size: 0.8rem;
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
    
    
    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
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
      font-size: 1.1rem;
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .overlay {
        align-items: flex-start;
        padding: 1rem 0.5rem;
      }
      
      .form-footer {
        flex-direction: column-reverse;
        gap: 0.5rem;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
        justify-content: center;
        padding: 0.5rem 1rem;
      }
    }
  </style>