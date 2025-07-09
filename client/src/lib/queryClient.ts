import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Environment detection and API URL configuration
const getApiBaseUrl = () => {
  // Check if we're on Lovable or any remote environment
  if (window.location.hostname.includes('lovable.app') || !window.location.hostname.includes('localhost')) {
    console.log('🌐 Detecting environment:', window.location.hostname);
    console.log('🔧 Using ngrok backend for development');
    return 'https://jadoo.ngrok-free.app/api';
  }
  // Local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }
  // Fallback
  return 'https://jadoo.ngrok-free.app/api';
};

// DEV API BASE URL - update here for all dev/preview environments
export const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('🌐 Using API_BASE_URL:', API_BASE_URL);

export async function apiRequest(
  url: string,
  data?: unknown | undefined,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    method: 'GET',
    credentials: "include",
    ...options
  };
  
  if (data) {
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData (browser will set it with boundary)
      defaultOptions.body = data;
    } else {
      defaultOptions.headers = { 
        "Content-Type": "application/json",
        ...defaultOptions.headers 
      };
      defaultOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }
  }
  
  // Always prefix with API_BASE_URL if not already absolute
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
  console.log(`API Request: ${defaultOptions.method} ${fullUrl}`);
  const res = await fetch(fullUrl, defaultOptions);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Always prefix with API_BASE_URL if not already absolute
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Enable refetch on window focus for auth state
      staleTime: 5 * 60 * 1000, // 5 minutes stale time instead of Infinity
      retry: 1, // Allow one retry for auth-related queries
    },
    mutations: {
      retry: false,
    },
  },
});
