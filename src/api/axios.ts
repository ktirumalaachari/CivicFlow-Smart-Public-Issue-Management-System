import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create a central Axios instance
const apiClient = axios.create({
  baseURL: '/api', // Vite proxy or relative path
  timeout: 10000,
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('civicflow_token');
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response) {
    // Check for unauthorized (401)
    if (error.response.status === 401) {
      console.warn('[CivicFlow API] Unauthorized access. Invalidating session.');
      localStorage.removeItem('civicflow_token');
      // Only toast if it's not the initial profile fetch failing
      if (error.config.url !== '/auth/profile') {
        toast.error('Session expired. Please log in again.');
        setTimeout(() => window.location.href = '/', 1500);
      }
    } else if (error.response.status >= 500) {
      toast.error('Server error occurred. Please try again later.');
    }
  } else if (error.request) {
    toast.error('Network error. Check your connection.');
  }
  return Promise.reject(error);
});

export default apiClient;
