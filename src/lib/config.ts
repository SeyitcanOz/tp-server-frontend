/**
 * Application configuration
 */
const config = {
    /**
     * API URL - change this to match your backend
     */
    apiUrl: 'http://localhost:5220',
    
    /**
     * User roles
     */
    roles: {
      admin: 'Admin',
      engineer: 'Engineer', 
      viewer: 'Viewer'
    },
    
    /**
     * Default pagination settings
     */
    pagination: {
      defaultPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50]
    }
  };
  
  export default config;