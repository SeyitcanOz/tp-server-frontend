<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { authService } from '$lib/services/auth';
  import { goto } from '$app/navigation';
  import type { AxiosError } from 'axios';
  
  let username = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false;
  let usernameError = false;
  let passwordError = false;
  
  async function handleLogin() {
    // Reset error states
    usernameError = false;
    passwordError = false;
    
    // Check for empty fields manually
    if (!username) usernameError = true;
    if (!password) passwordError = true;
    
    if (!username || !password) {
      errorMessage = 'Please enter both username and password';
      return;
    }
    
    try {
      isLoading = true;
      errorMessage = '';
      
      await authService.login({ username, password });
      
      // Redirect to projects page on successful login
      goto('/projects');
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Type guard to check if error is an AxiosError
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError;
        if (axiosError.response && axiosError.response.status === 401) {
          errorMessage = 'Invalid username or password';
        } else {
          errorMessage = 'An error occurred during login. Please try again.';
        }
      } else {
        errorMessage = 'An error occurred during login. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }
  
  // Clear error state when user types
  function handleInput(field: 'username' | 'password') {
    if (field === 'username' && usernameError) usernameError = false;
    if (field === 'password' && passwordError) passwordError = false;
    
    // Clear error message if both fields are filled
    if (username && password) errorMessage = '';
  }
</script>

<svelte:head>
  <title>Login - TPServer</title>
  <meta name="description" content="Log in to TPServer" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="overlay">
  <div class="page-container">
    <div class="login-card">
      <div class="form-header">
        <div class="header-icon">
          <span class="material-icons">login</span>
        </div>
        <div class="header-text">
          <h2>Sign In</h2>
          <p class="header-subtitle">Access your TPServer account</p>
        </div>
      </div>
      
      <form on:submit|preventDefault={handleLogin} class="login-form" novalidate>
        {#if errorMessage}
          <div class="alert alert-error">
            <span class="material-icons error-icon">error_outline</span>
            <span>{errorMessage}</span>
          </div>
        {/if}
        
        <div class="form-group">
          <label for="username">Username</label>
          <div class="input-container">
            <span class="material-icons input-icon">person_outline</span>
            <input 
              type="text" 
              id="username"
              bind:value={username} 
              disabled={isLoading}
              class:error={usernameError}
              on:input={() => handleInput('username')}
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-container">
            <span class="material-icons input-icon">lock_outline</span>
            <input 
              type="password" 
              id="password"
              bind:value={password} 
              disabled={isLoading}
              class:error={passwordError}
              on:input={() => handleInput('password')}
            />
          </div>
        </div>
        
        <div class="form-footer">
          <a href="/" class="btn-secondary">
            <span class="material-icons">arrow_back</span>
            <span>Back</span>
          </a>
          <button type="submit" class="btn-primary" disabled={isLoading}>
            {#if isLoading}
              <div class="button-spinner"></div>
              <span>Signing in...</span>
            {:else}
              <span class="material-icons">login</span>
              <span>Sign In</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
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
    max-width: 400px;
  }
  
  /* Login Card */
  .login-card {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
    overflow: hidden;
  }
  
  /* Form Header */
  .form-header {
    padding: 0.75rem 1.5rem;
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
    width: 28px;
    height: 28px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    font-weight: bold;
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
  
  .header-subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    opacity: 0.9;
  }
  
  /* Form */
  .login-form {
    padding: 1.5rem;
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
  
  /* Custom error styling (without browser validation) */
  input.error {
    border-color: #fca5a5;
  }
  
  input.error:focus {
    border-color: #fca5a5;
    box-shadow: 0 0 0 2px rgba(252, 165, 165, 0.1);
  }
  
  /* Alert */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.25rem;
    font-size: 0.75rem;
  }
  
  .alert-error {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  .error-icon {
    font-size: 0.9rem;
  }
  
  /* Form Footer */
  .form-footer {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;
  }
  
  /* Buttons - Smaller Size */
  .btn-primary, .btn-secondary {
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
    text-decoration: none;
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