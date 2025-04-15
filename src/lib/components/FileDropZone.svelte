<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let fileType: string;
  export let acceptedExtensions: string;
  export let description: string;
  export let selectedFile: File | null = null;
  export let required = false;
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
  class:required
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
        <div class="file-details">
          <div class="file-name" title={selectedFile.name}>{selectedFile.name}</div>
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
      <div class="dropzone-placeholder" on:click={browseFiles}>
        <div class="dropzone-text">
          <div class="file-type">
            {fileType}{#if required}<span class="required-mark">*</span>{/if}
          </div>
          <div class="description">{description}</div>
        </div>
      </div>
    {/if}
  </div>
  
  {#if !selectedFile}
    <div class="drop-instruction">Drop file here or <button class="browse-link" on:click={browseFiles}>browse</button></div>
  {/if}
</div>

<style>
  .dropzone {
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 0.7rem;
    text-align: center;
    background-color: #f8fafc;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    margin-bottom: 0.6rem;
  }
  
  .dropzone:hover:not(.disabled) {
    border-color: #94a3b8;
    background-color: #f1f5f9;
  }
  
  .dragging:not(.disabled) {
    border-color: var(--bg-color, #64748b);
    background-color: rgba(241, 245, 249, 0.6);
  }
  
  .has-file {
    border-color: var(--bg-color, #64748b);
    border-style: solid;
  }
  
  .required {
    border-left: 3px solid #3b82f6;
  }
  
  .disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  
  .dropzone-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.25rem;
  }
  
  .dropzone-text {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  
  .file-type {
    font-weight: 600;
    font-size: 0.75rem;
    color: #1e293b;
  }
  
  .file-type .required-mark {
    color: #3b82f6;
    margin-left: 2px;
  }
  
  .description {
    font-size: 0.65rem;
    color: #64748b;
  }
  
  .drop-instruction {
    font-size: 0.65rem;
    color: #94a3b8;
    margin-top: 0.4rem;
  }
  
  .browse-link {
    background: none;
    border: none;
    color: var(--color, #64748b);
    padding: 0;
    font-size: 0.65rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    font-family: inherit;
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    background-color: #f1f5f9;
    border-radius: 5px;
    border: 1px solid #e2e8f0;
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
    font-size: 0.7rem;
    font-weight: 500;
    color: #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .file-size {
    font-size: 0.6rem;
    color: #64748b;
  }
  
  .clear-button {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e2e8f0;
    border: none;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
    padding: 0;
  }
  
  .clear-button:hover:not(:disabled) {
    background-color: #cbd5e1;
    color: #475569;
  }
  
  .clear-button .material-icons {
    font-size: 0.7rem;
  }
  
  .clear-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>