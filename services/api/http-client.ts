import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { getAuthToken } from './auth';
import { logger } from '@/utils/logger';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';

/**
 * Axios instance with connection pooling and keep-alive
 * Reuses connections to reduce latency on subsequent requests
 */
const httpClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
  },
  // Enable connection pooling
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 300,
});

/**
 * Request interceptor: Add authentication token
 */
httpClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.warn('[HttpClient] Failed to get auth token:', error);
    }
    return config;
  },
  (error) => {
    logger.error('[HttpClient] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle errors
 */
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      logger.error('[HttpClient] Response error:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      logger.error('[HttpClient] Network error:', error.message);
    } else {
      logger.error('[HttpClient] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Helper function for GET requests
 */
export const get = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await httpClient.get<T>(url, config);
  return response.data;
};

/**
 * Helper function for POST requests
 */
export const post = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await httpClient.post<T>(url, data, config);
  return response.data;
};

/**
 * Helper function for PUT requests
 */
export const put = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await httpClient.put<T>(url, data, config);
  return response.data;
};

/**
 * Helper function for DELETE requests
 */
export const del = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await httpClient.delete<T>(url, config);
  return response.data;
};

export { httpClient };
export default httpClient;
