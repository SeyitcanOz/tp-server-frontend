<!-- src/lib/components/DeleteConfirmationModal.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    // Props
    export let isOpen = false;
    export let title = 'Delete Confirmation';
    export let message = 'Are you sure you want to delete this item? This action cannot be undone.';
    export let itemName: string | null = null;
    export let isDeleting = false;
    export let error: string | null = null;
    
    // Dispatch events for confirm and cancel
    const dispatch = createEventDispatcher<{
      confirm: void;
      cancel: void;
    }>();
    
    // Handle confirm button click
    function handleConfirm() {
      dispatch('confirm');
    }
    
    // Handle cancel button click
    function handleCancel() {
      dispatch('cancel');
    }
    
    // Handle keyboard events
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isDeleting) {
        handleCancel();
      }
    }
  </script>
  
  <svelte:window on:keydown={handleKeydown} />
  
  {#if isOpen}
    <!-- Using a button with role="presentation" for backdrop to fix accessibility -->
    <div 
      class="modal-backdrop" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title">
      
      <!-- Click-blocking overlay with semantic structure -->
      <div class="modal-overlay" 
        tabindex="-1" 
        on:click|self|preventDefault={() => !isDeleting && handleCancel()}>
        
        <div class="modal-container">
          <div class="modal-header">
            <div class="header-icon">
              <span class="material-icons">!</span>
            </div>
            <div class="header-text">
              <h2 id="modal-title">{title}</h2>
              {#if itemName}
                <p class="header-item-name">{itemName}</p>
              {/if}
            </div>
          </div>
          
          <div class="modal-body">
            {#if error}
              <div class="error-message">
                <span class="material-icons">error_outline</span>
                <span>{error}</span>
              </div>
            {/if}
            
            <p class="confirm-message">{message}</p>
          </div>
          
          <div class="modal-footer">
            <button 
              type="button" 
              class="btn-cancel" 
              on:click={handleCancel}
              disabled={isDeleting}
            >
              Cancel
            </button>
            
            <button 
              type="button" 
              class="btn-delete" 
              on:click={handleConfirm}
              disabled={isDeleting}
            >
              {#if isDeleting}
                <div class="button-spinner"></div>
                <span>Deleting...</span>
              {:else}
                <span class="material-icons">delete</span>
                <span>Delete</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <style>
    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    
    /* Modal overlay for better a11y */
    .modal-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 1rem;
    }
    
    /* Modal Container */
    .modal-container {
      width: 100%;
      max-width: 450px;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: modal-appear 0.2s ease-out;
    }
    
    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Modal Header - Smaller with simpler icon */
    .modal-header {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      color: white;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      font-weight: bold;
      font-size: 1rem;
    }
    
    .header-icon .material-icons {
      font-size: 1.1rem;
      font-weight: bold;
    }
    
    .header-text {
      flex: 1;
    }
    
    .header-text h2 {
      font-size: 1.1rem;
      margin: 0;
      font-weight: 500;
    }
    
    .header-item-name {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      opacity: 0.9;
    }
    
    /* Modal Body */
    .modal-body {
      padding: 1.5rem;
    }
    
    .confirm-message {
      color: #334155;
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      background-color: #fee2e2;
      color: #dc2626;
    }
    
    .error-message .material-icons {
      font-size: 1.1rem;
    }
    
    /* Modal Footer */
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    
    /* Buttons */
    .btn-cancel, .btn-delete {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }
    
    .btn-cancel {
      background-color: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
    }
    
    .btn-cancel:hover:not(:disabled) {
      background-color: #e2e8f0;
    }
    
    .btn-delete {
      background-color: #ef4444;
      color: white;
    }
    
    .btn-delete:hover:not(:disabled) {
      background-color: #dc2626;
    }
    
    .btn-cancel:disabled, .btn-delete:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    /* Button spinner */
    .button-spinner {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-left-color: white;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Responsive styles */
    @media (max-width: 480px) {
      .modal-footer {
        flex-direction: column-reverse;
        gap: 0.5rem;
      }
      
      .btn-cancel, .btn-delete {
        width: 100%;
        justify-content: center;
      }
    }
  </style>