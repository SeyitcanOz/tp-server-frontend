import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { authService } from '$lib/services/auth';

/**
 * Checks if the user is authenticated and redirects to login if not
 * @param requiredRole Optional role that the user must have
 * @returns True if authentication passes, false otherwise
 */
export function authGuard(requiredRole?: string): boolean {
  if (!browser) return true; // Skip during SSR
  
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    goto('/login');
    return false;
  }
  
  if (requiredRole && !authService.hasRole(requiredRole)) {
    goto('/forbidden');
    return false;
  }
  
  return true;
}