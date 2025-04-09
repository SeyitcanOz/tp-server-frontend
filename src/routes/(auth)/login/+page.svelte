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
  <title>Login - TP Server</title>
  <meta name="description" content="Log in to TP Server" />
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <h1>Login to TP Server</h1>
    
    <form on:submit|preventDefault={handleLogin}>
      {#if errorMessage}
        <div class="error-message">
          {errorMessage}
        </div>
      {/if}
      
      <div class="form-group">
        <label for="username">Username</label>
        <input 
          id="username"
          type="text" 
          bind:value={username} 
          placeholder="Enter your username" 
          disabled={isLoading}
          required
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input 
          id="password"
          type="password" 
          bind:value={password} 
          placeholder="Enter your password" 
          disabled={isLoading}
          required
        />
      </div>
      
      <button type="submit" class="login-button" disabled={isLoading}>
        {#if isLoading}
          Logging in...
        {:else}
          Login
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 16rem);
    padding: 2rem 1rem;
  }
  
  .login-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    width: 100%;
    max-width: 400px;
  }
  
  h1 {
    font-size: 1.75rem;
    color: var(--color-theme-1);
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  input:focus {
    border-color: var(--color-theme-2);
    outline: none;
    box-shadow: 0 0 0 2px rgba(64, 117, 166, 0.2);
  }
  
  .login-button {
    background-color: var(--color-theme-1);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-weight: 600;
    width: 100%;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .login-button:hover:not(:disabled) {
    background-color: #cc3200;
  }
  
  .login-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .error-message {
    background-color: #fff5f5;
    color: #e53e3e;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.25rem;
    font-size: 0.9rem;
  }
</style>