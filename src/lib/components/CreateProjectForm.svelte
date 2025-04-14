<!-- src/lib/components/CreateProjectForm.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { goto } from '$app/navigation';
    import FileDropzone from './FileDropzone.svelte';
    import api from '$lib/services/api';
    
    export let isOpen = false;
    
    // Form state
    let projectName = '';
    let modellingType = 'RC'; // Default to RC
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
    
    // Prevent scrolling of the background when scrolling inside the modal
    function handleWheel(event: WheelEvent) {
      // Only if we're at the top or bottom of the scrollable area
      const target = event.currentTarget as HTMLElement;
      const isAtTop = target.scrollTop === 0;
      const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
      
      if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
        event.preventDefault();
      }
      
      // Stop propagation to prevent background scrolling
      event.stopPropagation();
    }
    
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
      
      // Create a FormData object to send the files
      const formData = new FormData();
      formData.append('projectName', projectName);
      formData.append('modellingType', modellingType);
      
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
        const response = await api.post('/api/upload/project', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        success = true;
        // Navigate to the newly created project after a short delay
        setTimeout(() => {
          goto(`/projects/${response.data.id}`);
        }, 1500);
        
      } catch (err) {
        console.error('Error creating project:', err);
        
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: string | { message?: string } } };
          if (typeof axiosError.response?.data === 'string') {
            error = axiosError.response.data;
          } else if (typeof axiosError.response?.data === 'object') {
            error = axiosError.response.data.message || 'Failed to create project. Please check your files and try again.';
          } else {
            error = 'Failed to create project. Please check your files and try again.';
          }
        } else {
          error = 'Failed to create project. Please check your files and try again.';
        }
        
        isSubmitting = false;
      }
    }
    
    function resetForm() {
      if (isSubmitting) return;
      
      projectName = '';
      modellingType = 'RC';
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
  
{#if isOpen}
  <div class="overlay">
    <div class="form-container">
      <div class="form-card">
        <div class="form-header">
          <div class="header-title">
            <span class="material-icons">add_circle</span>
            <h2>Create New Project</h2>
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
        
        <div class="form-body" on:wheel={handleWheel}>
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
              <h3>Project Details</h3>
              <div class="form-row">
                <div class="form-group required-field">
                  <label for="projectName">Project Name <span class="required-indicator">*</span></label>
                  <div class="input-with-icon">
                    <span class="material-icons input-icon">badge</span>
                    <input 
                      type="text" 
                      id="projectName" 
                      bind:value={projectName} 
                      placeholder="Enter project name"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div class="help-text">
                    Required format: XX-XX-MXX-XX (e.g. 02-30-M02-01)<br>
                    or XX-XX-MXX-XX-X (e.g. 02-30-M02-01-A)
                  </div>
                </div>
                
                <div class="form-group type-group">
                  <label>Modelling Type</label>
                  <div class="radio-group">
                    <label class="radio-label">
                      <input 
                        type="radio" 
                        name="modellingType" 
                        value="RC" 
                        bind:group={modellingType} 
                        disabled={isSubmitting}
                      />
                      <span class="radio-text">RC</span>
                    </label>
                    <label class="radio-label">
                      <input 
                        type="radio" 
                        name="modellingType" 
                        value="Masonry" 
                        bind:group={modellingType}
                        disabled={isSubmitting}
                      />
                      <span class="radio-text">Masonry</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-section files-section">
              <h3>Project Files</h3>
              <div class="dropzones-container">
                <FileDropzone 
                  fileType="Project File"
                  acceptedExtensions=".json"
                  description="Main project data file (Project.json)"
                  bind:selectedFile={projectFile}
                  required={true}
                  icon="data_object"
                  backgroundColor="#EBF5FF"
                  color="#3b82f6"
                  disabled={isSubmitting}
                />
                
                <FileDropzone 
                  fileType="Model Info File"
                  acceptedExtensions=".json"
                  description="Additional model information (TBDYModelInfo.json)"
                  bind:selectedFile={modelInfoFile}
                  icon="data_object"
                  backgroundColor="#f1f5f9"
                  color="#64748b"
                  disabled={isSubmitting}
                />
                
                <FileDropzone 
                  fileType="Model File"
                  acceptedExtensions=".model,.json"
                  description="Model file (TBDYModelInputParameters.model)"
                  bind:selectedFile={modelFile}
                  icon="model_training"
                  backgroundColor="#f1f5f9"
                  color="#64748b"
                  disabled={isSubmitting}
                />
                
                <FileDropzone 
                  fileType="Model Input File"
                  acceptedExtensions=".txt"
                  description="Model input parameters (TBDYModelInputParameters.txt)"
                  bind:selectedFile={modelInputFile}
                  icon="description"
                  backgroundColor="#f1f5f9"
                  color="#64748b"
                  disabled={isSubmitting}
                />
                
                <FileDropzone 
                  fileType="Results File"
                  acceptedExtensions=".txt"
                  description="Results data file (Sonuc_Deterministic_Pe.txt)"
                  bind:selectedFile={resultsFile}
                  icon="description"
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
                  <span>Creating...</span>
                {:else}
                  <span class="material-icons">add</span>
                  <span>Create</span>
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
    background-color: rgba(15, 23, 42, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    padding: 1.5rem;
  }
  
  .form-container {
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
  }
  
  .form-card {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: modal-in 0.25s ease-out;
    border-top: 3px solid #3b82f6;
  }
  
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translateY(-15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .form-header {
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
    color: white;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .header-title .material-icons {
    font-size: 1.25rem;
  }
  
  .header-title h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  
  .close-btn:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
  
  .close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .close-btn .material-icons {
    font-size: 1rem;
  }
  
  .form-body {
    padding: 1.25rem;
    overflow-y: auto;
  }
  
  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
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
  
  .form-section {
    margin-bottom: 1.5rem;
  }
  
  .form-section h3 {
    font-size: 0.95rem;
    color: #1e293b;
    margin: 0 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
  }
  
  .files-section {
    margin-bottom: 0;
  }
  
  .form-row {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1rem;
    align-items: stretch;
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
    font-size: 0.85rem;
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
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  
  input[type="text"] {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.85rem;
    background-color: #f8fafc;
    transition: all 0.2s;
  }
  
  input[type="text"]:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .help-text {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 0.25rem;
    line-height: 1.2;
  }
  
  .required-field {
    border-left: 3px solid #3b82f6;
    padding-left: 0.5rem;
  }
  
  .radio-group {
    display: flex;
    gap: 1rem;
    margin-top: 0.4rem;
    background-color: #f8fafc;
    border-radius: 6px;
    padding: 0.25rem;
    border: 1px solid #e2e8f0;
  }
  
  .radio-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-weight: normal;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.15s ease;
  }
  
  .radio-label:has(input:checked) {
    background-color: #e0eaff;
  }
  
  .radio-label input[type="radio"] {
    width: 15px;
    height: 15px;
    margin-right: 0.4rem;
    cursor: pointer;
    accent-color: #3b82f6;
  }
  
  .radio-text {
    font-size: 0.8rem;
    color: #334155;
  }
  
  .dropzones-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e2e8f0;
  }
  
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.35rem 0.7rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 4rem;
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
  
  .btn-primary:disabled, .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  
  /* Responsive styles */
  @media (max-width: 640px) {
    .form-row {
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-actions {
      flex-direction: column-reverse;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .btn-primary, .btn-secondary {
      width: 100%;
      padding: 0.75rem;
    }
  }
</style>