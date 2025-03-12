import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  // Create safe fetch options
  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    credentials: "include", // Always include credentials for cookie-based auth
    ...options,
  };

  // Handle Content-Type header for non-FormData bodies
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    // Use Record type to avoid TypeScript issues with headers
    const headers: Record<string, string> = {};
    
    // Copy existing headers if present
    if (fetchOptions.headers) {
      const existingHeaders = fetchOptions.headers as Record<string, string>;
      Object.keys(existingHeaders).forEach(key => {
        headers[key] = existingHeaders[key];
      });
    }
    
    // Add Content-Type header
    headers["Content-Type"] = "application/json";
    
    fetchOptions.headers = headers;
  }
  
  // Make sure credentials isn't overridden
  fetchOptions.credentials = "include";
  
  const res = await fetch(url, fetchOptions);

  console.log(`API ${fetchOptions.method} request to ${url}, status: ${res.status}`);
  
  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    console.log(`Query fetch to ${url}, status: ${res.status}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("Unauthorized, returning null as configured");
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
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
