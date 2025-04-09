<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { z } from 'zod';
    import type { LoginRequest } from '../types/auth';
    
    const dispatch = createEventDispatcher<{
      login: LoginRequest;
      error: string;
    }>();
    
    // Form state
    let username = '';
    let password = '';
    let loading = false;
    let errors: Record<string, string> = {};
    
    // Validation schema using Zod
    const loginSchema = z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required')
    });
    
    function validateForm(): boolean {
      errors = {};
      try {
        loginSchema.parse({ username, password });
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0] as string] = err.message;
            }
          });
        }
        return false;
      }
    }
    
    async function handleSubmit() {
      if (!validateForm()) return;
      
      loading = true;
      
      try {
        dispatch('login', { username, password });
      } catch (error) {
        console.error('Login error:', error);
        dispatch('error', 'An error occurred during login');
      } finally {
        loading = false;
      }
    }
  </script>
  
  <form on:submit|preventDefault={handleSubmit} class="login-form">
    <h2>Login to TPServer</h2>
    
    <div class="form-group">
      <label for="username">Username</label>
      <input 
        type="text" 
        id="username" 
        bind:value={username} 
        placeholder="Enter your username"
        class:error={errors.username}
      />
      {#if errors.username}
        <p class="error-message">{errors.username}</p>
      {/if}
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input 
        type="password" 
        id="password" 
        bind:value={password} 
        placeholder="Enter your password"
        class:error={errors.password}
      />
      {#if errors.password}
        <p class="error-message">{errors.password}</p>
      {/if}
    </div>
    
    <button type="submit" class="login-button" disabled={loading}>
      {loading ? 'Logging in...' : 'Login'}
    </button>
  </form>
  
  <style>
    .login-form {
      max-width: 400px;
      margin: 0 auto;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #2c3e50;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #2c3e50;
    }
    
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    input.error {
      border-color: #e74c3c;
    }
    
    .error-message {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .login-button {
      width: 100%;
      padding: 0.75rem;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .login-button:hover {
      background-color: #2980b9;
    }
    
    .login-button:disabled {
      background-color: #95a5a6;
      cursor: not-allowed;
    }
  </style>