<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
    import FileDropzone from './FileDropzone.svelte';
    import api from '$lib/services/api';
    import type { ProjectDetail } from '$lib/types/project';
    
    export let isOpen = false;
    export let project: ProjectDetail | null = null;
    
    // Form state
    let isSubmitting = false;
    let error: string | null = null;
    let success = false;
    
    // File state
    let projectFile: File | null = null;
    let modelInfoFile: File | null = null;
    let modelFile: File | null = null;
    let modelInputFile: File | null = null;
    let resultsFile: File | null = null;
    
    const dispatch = createEventDispatcher<{
      close: void;
    }>();
    
    function handleClose() {
      if (!isSubmitting) {
        dispatch('close');
      }
    }
    
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    }
    
    function validateForm(): { valid: boolean; error: string | null } {
      // Reset error
      error = null;
      
      // Check if project is provided
      if (!project) {
        return { valid: false, error: 'Project information is missing' };
      }
      
      // Validate required files
      if (!projectFile) {
        return { valid: false, error: 'Project.json file is required' };
      }
      
      return { valid: true, error: null };
    }
    
    async function handleSubmit() {
      const validation = validateForm();
      if (!validation.valid) {
        error = validation.error;
        return;
      }
      
      isSubmitting = true;
      error = null;
      success = false;
      
      if (!project) {
        error = 'Project information is missing';
        isSubmitting = false;
        return;
      }
      
      // Create a FormData object to send the files
      const formData = new FormData();
      
      // Append files if they exist
      if (projectFile) {
        formData.append('files', projectFile);
      }
      if (modelInfoFile) {
        formData.append('files', modelInfoFile);
      }
      if (modelFile) {
        formData.append('files', modelFile);
      }
      if (modelInputFile) {
        formData.append('files', modelInputFile);
      }
      if (resultsFile) {
        formData.append('files', resultsFile);
      }
      
      try {
        const response = await api.post(`/api/upload/version/${project.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        success = true;
        
        // Navigate to the newly created version after a short delay
        setTimeout(() => {
          goto(`/projects/${project.id}/versions/${response.data.versionNumber}`);
        }, 1500);
        
      } catch (err) {
        console.error('Error creating version:', err);
        
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: string | { message?: string } } };
          if (typeof axiosError.response?.data === 'string') {
            error = axiosError.response.data;
          } else if (typeof axiosError.response?.data === 'object') {
            error = axiosError.response.data.message || 'Failed to create version. Please check your files and try again.';
          } else {
            error = 'Failed to create version. Please check your files and try again.';
          }
        } else {
          error = 'Failed to create version. Please check your files and try again.';
        }
        
        isSubmitting = false;
      }
    }
    
    function resetForm() {
      if (isSubmitting) return;
      
      projectFile = null;
      modelInfoFile = null;
      modelFile = null;
      modelInputFile = null;
      resultsFile = null;
      error = null;
      success = false;
    }
  </script>
  
  <svelte:window on:keydown={handleKeydown} />
  
  {#if isOpen && project}
    <div class="overlay">
      <div class="form-container">
        <div class="form-card">
          <div class="form-header">
            <div class="header-icon">
              <span class="material-icons">history</span>
            </div>
            <div class="header-text">
              <h2>Create New Version</h2>
              <p class="header-subtitle">
                {project.projectName} - Current Version: v{project.currentVersion}
              </p>
            </div>
            <button 
              class="close-btn" 
              on:click={handleClose} 
              disabled={isSubmitting}
              aria-label="Close"
            >
              <span class="material-icons">close</span>
            </button>
          </div>
          
          <div class="form-body">
            {#if error}
              <div class="alert alert-error">
                <span class="material-icons error-icon">error_outline</span>
                <span>{error}</span>
              </div>
            {/if}
            
            {#if success}
              <div class="alert alert-success">
                <span class="material-icons success-icon">check_circle</span>
                <span>Version created successfully! Redirecting...</span>
              </div>
            {/if}
            
            <form on:submit|preventDefault={handleSubmit}>
              <div class="form-section">
                <h3>Project Files</h3>
                <p class="info-text">
                  Upload new files to create a new version for this project. 
                  The version number will be automatically incremented from the current version ({project.currentVersion}).
                </p>
                
                <div class="dropzones-container">
                  <FileDropzone 
                    fileType="Project File"
                    acceptedExtensions=".json"
                    description="Main project data file (Project.json)"
                    bind:selectedFile={projectFile}
                    required={true}
                    icon="description"
                    backgroundColor="#f0f7ff"
                    color="#5c9fff"
                    disabled={isSubmitting}
                  />
                  
                  <FileDropzone 
                    fileType="Model Info File"
                    acceptedExtensions=".json"
                    description="Additional model information (TBDYModelInfo.json)"
                    bind:selectedFile={modelInfoFile}
                    icon="info"
                    backgroundColor="#eefaf0"
                    color="#16a34a"
                    disabled={isSubmitting}
                  />
                  
                  <FileDropzone 
                    fileType="Model File"
                    acceptedExtensions=".model,.json"
                    description="Model file in JSON format (TBDYModelInputParameters.model)"
                    bind:selectedFile={modelFile}
                    icon="model_training"
                    backgroundColor="#fffbeb"
                    color="#d97706"
                    disabled={isSubmitting}
                  />
                  
                  <FileDropzone 
                    fileType="Model Input File"
                    acceptedExtensions=".txt"
                    description="Model input parameters file (TBDYModelInputParameters.txt)"
                    bind:selectedFile={modelInputFile}
                    icon="code"
                    backgroundColor="#f0f4ff"
                    color="#6366f1"
                    disabled={isSubmitting}
                  />
                  
                  <FileDropzone 
                    fileType="Results File"
                    acceptedExtensions=".txt"
                    description="Results data file (Sonuc_Deterministic_Pe.txt)"
                    bind:selectedFile={resultsFile}
                    icon="analytics"
                    backgroundColor="#fef2f2"
                    color="#dc2626"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div class="form-actions">
                <button 
                  type="button" 
                  class="btn-secondary" 
                  on:click={resetForm}
                  disabled={isSubmitting}
                >
                  Reset
                </button>
                <button 
                  type="button" 
                  class="btn-secondary" 
                  on:click={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  class="btn-primary" 
                  disabled={isSubmitting}
                >
                  {#if isSubmitting}
                    <span class="spinner"></span>
                    <span>Creating Version...</span>
                  {:else}
                    <span class="material-icons">add_circle</span>
                    <span>Create Version</span>
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <style>
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(15, 23, 42, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      padding: 1rem;
      overflow-y: auto;
    }
    
    .form-container {
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    
    .form-card {
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: modal-in 0.2s ease-out;
    }
    
    @keyframes modal-in {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .form-header {
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
      color: white;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .header-icon .material-icons {
      font-size: 1.2rem;
    }
    
    .header-text {
      flex: 1;
    }
    
    .header-text h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 500;
    }
    
    .header-subtitle {
      font-size: 0.85rem;
      margin: 0.25rem 0 0;
      opacity: 0.85;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.15s;
      flex-shrink: 0;
    }
    
    .close-btn:hover {
      background-color: rgba(255, 255, 255, 0.15);
    }
    
    .close-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .close-btn .material-icons {
      font-size: 1.2rem;
    }
    
    .form-body {
      padding: 1.5rem;
      overflow-y: auto;
    }
    
    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }
    
    .alert-error {
      background-color: #fee2e2;
      color: #dc2626;
    }
    
    .alert-success {
      background-color: #dcfce7;
      color: #16a34a;
    }
    
    .error-icon, .success-icon {
      font-size: 1.1rem;
    }
    
    .form-section {
      margin-bottom: 1.5rem;
    }
    
    .form-section h3 {
      font-size: 1rem;
      color: #1e293b;
      margin: 0 0 0.5rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .info-text {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }
    
    .dropzones-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }
    
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
    
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }
      
      .btn-primary, .btn-secondary {
        justify-content: center;
      }
    }
  </style>