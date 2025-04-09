/**
 * Login request data
 */
export interface LoginRequest {
    username: string;
    password: string;
  }
  
  /**
   * Registration request data
   */
  export interface RegisterRequest {
    username: string;
    password: string;
    confirmPassword: string;
  }
  
  /**
   * User data
   */
  export interface User {
    id: string;
    username: string;
    roles: string[];
  }
  
  /**
   * Authentication response from server
   */
  export interface AuthResponse {
    id: string;
    username: string;
    roles: string[];
    token: string;
    expiration: string;
  }