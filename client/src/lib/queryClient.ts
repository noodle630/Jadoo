import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

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
  
  console.log(`API Request: ${defaultOptions.method} ${url}`);
  const res = await fetch(url, defaultOptions);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
