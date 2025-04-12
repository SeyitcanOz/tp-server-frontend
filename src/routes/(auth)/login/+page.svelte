<script lang="ts">
  import { authService } from '$lib/services/auth';
  import { goto } from '$app/navigation';
  import type { AxiosError } from 'axios';
  
  let username = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false;
  
  async function handleLogin() {
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
</script>

<svelte:head>
  <title>Login - TPServer</title>
  <meta name="description" content="Log in to TPServer" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <h1>Sign In</h1>
    
    <form on:submit|preventDefault={handleLogin} class="login-form">
      {#if errorMessage}
        <div class="error-container">
          <span class="material-icons">error_outline</span>
          <span>{errorMessage}</span>
        </div>
      {/if}
      
      <div class="form-group">
        <div class="input-container">
          <span class="material-icons">person_outline</span>
          <input 
            type="text" 
            bind:value={username} 
            placeholder="Username" 
            disabled={isLoading}
            required
          />
        </div>
      </div>
      
      <div class="form-group">
        <div class="input-container">
          <span class="material-icons">lock_outline</span>
          <input 
            type="password" 
            bind:value={password} 
            placeholder="Password" 
            disabled={isLoading}
            required
          />
        </div>
      </div>
      
      <button type="submit" class="login-button" disabled={isLoading}>
        {#if isLoading}
          <div class="button-spinner"></div>
          <span>Signing in...</span>
        {:else}
          Sign In
        {/if}
      </button>
    </form>
    
    <div class="login-footer">
      <a href="/" class="back-link">
        <span class="material-icons">arrow_back</span>
        <span>Back to Home</span>
      </a>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8fafc;
    padding: 1rem;
  }
  
  .login-card {
    width: 100%;
    max-width: 360px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    padding: 1.5rem;
    border-top: 3px solid #5c9fff;
  }
  
  h1 {
    font-size: 1.25rem;
    color: #1e3a8a;
    margin: 0 0 1.5rem 0;
    text-align: center;
    font-weight: 500;
  }
  
  .login-form {
    margin-bottom: 1.25rem;
  }
  
  .error-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    background-color: #fee2e2;
    border-radius: 4px;
    margin-bottom: 1rem;
    color: #dc2626;
    font-size: 0.75rem;
  }
  
  .error-container .material-icons {
    font-size: 1rem;
  }
  
  .form-group {
    margin-bottom: 0.75rem;
  }
  
  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .input-container .material-icons {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    font-size: 1rem;
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
  
  input::placeholder {
    color: #94a3b8;
  }
  
  .login-button {
    width: 100%;
    padding: 0.6rem;
    background-color: #5c9fff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background-color 0.2s;
    margin-top: 0.5rem;
  }
  
  .login-button:hover:not(:disabled) {
    background-color: #4a89e8;
  }
  
  .login-button:disabled {
    opacity: 0.7;
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
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .login-footer {
    text-align: center;
    margin-top: 0.75rem;
  }
  
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #64748b;
    text-decoration: none;
    font-size: 0.75rem;
    transition: color 0.2s;
  }
  
  .back-link:hover {
    color: #5c9fff;
  }
  
  .back-link .material-icons {
    font-size: 0.8rem;
  }
  
  @media (max-width: 480px) {
    .login-card {
      max-width: 100%;
    }
  }
</style>