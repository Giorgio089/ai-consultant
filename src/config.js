/**
 * Application configuration
 */
export const CONFIG = {
  // Use a CORS proxy for the free tier to bypass browser CORS restrictions
  // This can be overridden by setting VITE_PROXY_URL in environment variables
  PROXY_URL: import.meta.env?.VITE_PROXY_URL || 'https://api.allorigins.win/raw?url=',
};
