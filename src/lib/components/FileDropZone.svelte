<!-- src/lib/components/FileDropzone.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let fileType: string;
    export let acceptedExtensions: string;
    export let description: string;
    export let selectedFile: File | null = null;
    export let required = false;
    export let icon: string;
    export let backgroundColor: string;
    export let color: string;
    export let disabled = false;
    
    let dragging = false;
    let fileInput: HTMLInputElement;
    
    const dispatch = createEventDispatcher<{
      fileSelected: { file: File | null };
    }>();
    
    function handleDragEnter(e: DragEvent) {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
    }
    
    function handleDragLeave(e: DragEvent) {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = false;
    }
    
    function handleDragOver(e: DragEvent) {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
    }
    
    function handleDrop(e: DragEvent) {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = false;
      
      if (!e.dataTransfer) return;
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        selectFile(files[0]);
      }
    }
    
    function handleFileInputChange(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        selectFile(input.files[0]);
      }
    }
    
    function selectFile(file: File) {
      // Check if the file extension matches one of the accepted extensions
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const acceptedExts = acceptedExtensions.split(',').map(ext => 
        ext.trim().toLowerCase().replace('.', '')
      );
      
      if (acceptedExts.includes(fileExt) || acceptedExtensions === '*') {
        selectedFile = file;
        dispatch('fileSelected', { file });
      } else {
        alert(`Invalid file type. Please select a valid ${acceptedExtensions} file.`);
      }
    }
    
    function clearSelection() {
      selectedFile = null;
      dispatch('fileSelected', { file: null });
      if (fileInput) {
        fileInput.value = '';
      }
    }
    
    function browseFiles() {
      if (disabled) return;
      fileInput.click();
    }
  </script>
  
  <div 
    class="dropzone"
    class:dragging
    class:has-file={selectedFile !== null}
    class:disabled
    style="--bg-color: {backgroundColor}; --color: {color};"
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleDrop}
  >
    <input 
      type="file" 
      accept={acceptedExtensions}
      bind:this={fileInput}
      on:change={handleFileInputChange}
      style="display: none;"
      {disabled}
    />
    
    <div class="dropzone-content">
      {#if selectedFile}
        <div class="file-info">
          <div class="file-icon">
            <span class="material-icons">{icon}</span>
          </div>
          <div class="file-details">
            <div class="file-name">{selectedFile.name}</div>
            <div class="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
          </div>
          <button 
            type="button" 
            class="clear-button" 
            on:click={clearSelection}
            disabled={disabled}
            aria-label="Remove file"
          >
            <span class="material-icons">close</span>
          </button>
        </div>
      {:else}
        <div class="dropzone-placeholder">
          <div class="icon-container">
            <span class="material-icons">{icon}</span>
          </div>
          <div class="dropzone-text">
            <div class="file-type">
              {fileType} {required ? ' (Required)' : ' (Optional)'}
            </div>
            <div class="description">{description}</div>
          </div>
        </div>
        <button 
          type="button" 
          class="browse-button" 
          on:click={browseFiles}
          disabled={disabled}
        >
          Browse Files
        </button>
      {/if}
    </div>
  </div>
  
  <style>
    .dropzone {
      border: 2px dashed #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
      background-color: white;
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
      margin-bottom: 1rem;
    }
    
    .dropzone:hover:not(.disabled) {
      border-color: #cbd5e1;
      background-color: #f8fafc;
    }
    
    .dragging:not(.disabled) {
      border-color: var(--bg-color, #5c9fff);
      background-color: rgba(92, 159, 255, 0.05);
    }
    
    .has-file {
      border-color: var(--bg-color, #5c9fff);
      border-style: solid;
    }
    
    .disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    
    .dropzone-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    
    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background-color: var(--bg-color, #f0f4ff);
      color: var(--color, #5c9fff);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .icon-container .material-icons {
      font-size: 1.5rem;
    }
    
    .dropzone-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .file-type {
      font-weight: 600;
      font-size: 0.9rem;
      color: #1e293b;
    }
    
    .description {
      font-size: 0.8rem;
      color: #64748b;
      max-width: 24rem;
      margin: 0 auto;
    }
    
    .browse-button {
      background-color: var(--bg-color, #f1f5f9);
      color: var(--color, #5c9fff);
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .browse-button:hover:not(:disabled) {
      background-color: rgba(92, 159, 255, 0.1);
    }
    
    .browse-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.5rem;
      background-color: #f8fafc;
      border-radius: 6px;
    }
    
    .file-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 6px;
      background-color: var(--bg-color, #f0f4ff);
      color: var(--color, #5c9fff);
      flex-shrink: 0;
    }
    
    .file-icon .material-icons {
      font-size: 1.25rem;
    }
    
    .file-details {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      flex: 1;
      text-align: left;
      overflow: hidden;
    }
    
    .file-name {
      font-size: 0.85rem;
      font-weight: 500;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .file-size {
      font-size: 0.7rem;
      color: #64748b;
    }
    
    .clear-button {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    
    .clear-button:hover:not(:disabled) {
      background-color: #e2e8f0;
      color: #475569;
    }
    
    .clear-button .material-icons {
      font-size: 0.9rem;
    }
    
    .clear-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  </style>