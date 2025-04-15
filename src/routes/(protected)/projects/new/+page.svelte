<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import FileDropzone from '$lib/components/FileDropzone.svelte';
  import api from '$lib/services/api';
  import { user } from '$lib/stores/auth';
  import type { ProjectDetail } from '$lib/types/project';
  
  // Form state
  let projectName = '';
  let modellingTypes = ['RC']; // Changed to array with default RC selected
  let isSubmitting = false;
  let error: string | null = null;
  let success = false;
  
  // File state
  let projectFile: File | null = null;
  let modelInfoFile: File | null = null;
  let modelFile: File | null = null;
  let modelInputFile: File | null = null;
  let resultsFile: File | null = null;
  
  // Form validation
  function validateForm(): { valid: boolean; error: string | null } {
    // Reset error
    error = null;
    
    // Validate project name
    if (!projectName.trim()) {
      return { valid: false, error: 'Project name is required' };
    }
    
    // Check if the project name follows the required format
    if (!/^\d{2}-\d{2}-M\d{2}-\d{2}(-[A-Z])?$/.test(projectName)) {
      return {
        valid: false,
        error: 'Project name must follow format: XX-XX-MXX-XX (e.g. 02-30-M02-01) or XX-XX-MXX-XX-X (e.g. 02-30-M02-01-A)'
      };
    }
    
    // Validate required files
    if (!projectFile) {
      return { valid: false, error: 'Project.json file is required' };
    }
    
    // Validate at least one modelling type is selected
    if (modellingTypes.length === 0) {
      return { valid: false, error: 'At least one modelling type must be selected' };
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
    
    try {
      // Create a FormData object to send the files
      const formData = new FormData();
      formData.append('projectName', projectName);
      formData.append('modellingTypes', JSON.stringify(modellingTypes));
      
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
      
      const response = await api.post('/api/upload/project', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const result = response.data;
      
      success = true;
      
      // Navigate to the newly created project after a short delay
      setTimeout(() => {
        goto(`/projects/${result.id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error creating project:', err);
      
      if (err && typeof err === 'object' && 'message' in err) {
        error = (err as Error).message;
      } else {
        error = 'Failed to create project. Please check your files and try again.';
      }
      
      isSubmitting = false;
    }
  }
  
  function resetForm() {
  if (isSubmitting) return;
  
  projectName = '';
  modellingTypes = ['RC']; // Reset to default with RC selected
  projectFile = null;
  modelInfoFile = null;
  modelFile = null;
  modelInputFile = null;
  resultsFile = null;
  error = null;
  success = false;
}
  
  function handleCancel() {
    goto('/projects');
  }
</script>

<svelte:head>
  <title>Create New Project - TPServer</title>
  <meta name="description" content="Create a new engineering project on TPServer" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="page-overlay">
  <div class="page-container">
    <div class="form-card">
      <div class="form-header">
        <div class="header-icon">
          <span class="material-icons">add_circle</span>
        </div>
        <div class="header-text">
          <h1>Create New Project</h1>
          <p class="header-subtitle">Upload project files to create a new engineering project</p>
        </div>
        <button 
          class="close-btn" 
          on:click={handleCancel} 
          disabled={isSubmitting}
          aria-label="Back to projects"
        >
          <span class="material-icons">close</span>
        </button>
      </div>
  
      <div class="form-body">
        {#if error}
          <div class="alert alert-error">
            <span class="material-icons">error_outline</span>
            <span>{error}</span>
          </div>
        {/if}
        
        {#if success}
          <div class="alert alert-success">
            <span class="material-icons">check_circle</span>
            <span>Project created successfully! Redirecting...</span>
          </div>
        {/if}
        
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-section">
            <h2>Project Details</h2>
            <div class="form-row">
              <div class="form-group required-field">
                <label for="projectName">Project Name <span class="required-indicator">*</span></label>
                <div class="input-with-icon">
                  <span class="material-icons input-icon">badge</span>
                  <input 
                    type="text" 
                    id="projectName" 
                    bind:value={projectName} 
                    placeholder="Enter project name (e.g. 02-30-M02-01)"
                    disabled={isSubmitting}
                  />
                </div>
                <div class="help-text">
                  Format: XX-XX-MXX-XX (e.g. 02-30-M02-01) or XX-XX-MXX-XX-X (e.g. 02-30-M02-01-A)
                </div>
              </div>
              
              <div class="form-group type-group required-field">
                <label>Modelling Types <span class="required-indicator">*</span></label>
                <div class="toggle-container">
                  <button 
                    type="button"
                    class="toggle-button {modellingTypes.includes('RC') ? 'active' : ''}" 
                    on:click={() => modellingTypes = ['RC']}
                    disabled={isSubmitting}
                  >
                    RC
                  </button>
                  <button 
                    type="button"
                    class="toggle-button {modellingTypes.includes('Masonry') ? 'active' : ''}" 
                    on:click={() => modellingTypes = ['Masonry']}
                    disabled={isSubmitting}
                  >
                    Masonry
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Project Files -->
          <div class="form-section">
            <h2>Project Files</h2>
            
            <div class="dropzones-container">
              <FileDropzone 
                fileType="Project File"
                acceptedExtensions=".json"
                description="Main project data file (Project.json)"
                bind:selectedFile={projectFile}
                required={true}
                backgroundColor="#EBF5FF"
                color="#3b82f6"
                disabled={isSubmitting}
              />
              
              <FileDropzone 
                fileType="Model Info File"
                acceptedExtensions=".json"
                description="Additional model information (TBDYModelInfo.json)"
                bind:selectedFile={modelInfoFile}
                backgroundColor="#f1f5f9"
                color="#64748b"
                disabled={isSubmitting}
              />
              
              <FileDropzone 
                fileType="Model File"
                acceptedExtensions=".model,.json"
                description="Model file (TBDYModelInputParameters.model)"
                bind:selectedFile={modelFile}
                backgroundColor="#f1f5f9"
                color="#64748b"
                disabled={isSubmitting}
              />
              
              <FileDropzone 
                fileType="Model Input File"
                acceptedExtensions=".txt"
                description="Model input parameters (TBDYModelInputParameters.txt)"
                bind:selectedFile={modelInputFile}
                backgroundColor="#f1f5f9"
                color="#64748b"
                disabled={isSubmitting}
              />
              
              <FileDropzone 
                fileType="Results File"
                acceptedExtensions=".txt"
                description="Results data file (Sonuc_Deterministic_Pe.txt)"
                bind:selectedFile={resultsFile}
                backgroundColor="#f1f5f9"
                color="#64748b"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div class="form-actions">
            <button 
              type="button" 
              class="btn-secondary" 
              on:click={handleCancel}
              disabled={isSubmitting}
            >
              <span class="material-icons">arrow_back</span>
              <span>Back</span>
            </button>
            <div class="right-actions">
              <button 
                type="button" 
                class="btn-outline" 
                on:click={resetForm}
                disabled={isSubmitting}
              >
                <span class="material-icons">refresh</span>
                <span>Reset</span>
              </button>
              <button 
                type="submit" 
                class="btn-primary" 
                disabled={isSubmitting}
              >
                {#if isSubmitting}
                  <span class="spinner"></span>
                  <span>Creating...</span>
                {:else}
                  <span class="material-icons">add</span>
                  <span>Create</span>
                {/if}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<style>
  /* Overlay with Blur Effect */
  .page-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    padding: 1.5rem;
    overflow-y: auto;
  }
  
  /* Main Container */
  .page-container {
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  
  /* Form Card with Animation */
  .form-card {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: card-in 0.25s ease-out;
    overflow: hidden;
  }
  
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(-15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Header Styles */
  .form-header {
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
    color: white;
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
  
  h1 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 500;
  }
  
  .header-subtitle {
    font-size: 0.8rem;
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
  
  /* Form Body */
  .form-body {
    padding: 1.25rem;
    overflow-y: auto;
    flex: 1;
  }
  
  /* Alert Styles */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.25rem;
    font-size: 0.85rem;
  }
  
  .alert-error {
    background-color: #fee2e2;
    color: #b91c1c;
  }
  
  .alert-success {
    background-color: #dcfce7;
    color: #15803d;
  }
  
  .alert .material-icons {
    font-size: 1rem;
  }
  
  /* Form Sections */
  .form-section {
    margin-bottom: 1.5rem;
  }
  
  .form-section h2 {
    font-size: 0.95rem;
    color: #1e293b;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
  }
  
  .form-row {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 0.75rem;
    align-items: flex-start;
  }
  
  .form-group {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  
  .type-group {
    flex: 1;
  }
  
  label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #334155;
  }
  
  .required-indicator {
    color: #ef4444;
  }
  
  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .input-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    font-size: 0.9rem;
  }
  
  input[type="text"] {
    width: 100%;
    padding: 0 0.75rem 0 2.25rem; /* Maintain consistent horizontal padding */
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.85rem;
    background-color: #f8fafc;
    transition: all 0.2s;
    height: 38px; /* Fixed height */
    box-sizing: border-box; /* Important for consistent sizing */
    display: flex;
    align-items: center; /* Center content vertically */
  }
  
  input[type="text"]:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: white;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
  
  .help-text {
    font-size: 0.7rem;
    color: #64748b;
    margin-top: 0.2rem;
  }
  
  .required-field {
    border-left: 3px solid #3b82f6;
    padding-left: 0.5rem;
  }
  
  /* File Upload Container */
  .dropzones-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Toggle Button Styles */
  .toggle-container {
    display: flex;
    width: 100%;
    height: 38px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .toggle-button {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8fafc;
    border: none;
    font-size: 0.75rem;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    margin: 0;
    position: relative;
  }
  
  .toggle-button:first-child {
    border-right: 1px solid #cbd5e1;
  }
  
  .toggle-button.active {
    background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
    color: white;
    font-weight: bold;
  }
  
  .toggle-button:hover:not(.active):not(:disabled) {
    background-color: #e2e8f0;
  }
  
  .toggle-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  /* Form Actions */
  .form-actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }
  
  .right-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  /* Button Styles */
  .btn-primary, .btn-secondary, .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.7rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  
  .btn-primary {
    background-color: #3b82f6;
    color: white;
    border: none;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  .btn-secondary {
    background-color: #f1f5f9;
    color: #334155;
    border: 1px solid #cbd5e1;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #e2e8f0;
  }
  
  .btn-outline {
    background-color: white;
    color: #3b82f6;
    border: 1px solid #3b82f6;
  }
  
  .btn-outline:hover:not(:disabled) {
    background-color: #f0f7ff;
  }
  
  .btn-primary:disabled, .btn-secondary:disabled, .btn-outline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary .material-icons, .btn-secondary .material-icons, .btn-outline .material-icons {
    font-size: 0.9rem;
  }
  
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Responsive Styles */
  @media (max-width: 768px) {
    .page-overlay {
      align-items: flex-start;
      padding: 1rem 0.5rem;
    }
    
    .form-row {
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-actions {
      flex-direction: column-reverse;
      gap: 0.75rem;
    }
    
    .right-actions {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 0.5rem;
    }
    
    .btn-primary, .btn-secondary, .btn-outline {
      width: 100%;
      justify-content: center;
    }
    
    .btn-secondary {
      margin-top: 0.25rem;
    }
  }
</style>