import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = `${res.status}: ${res.statusText}`;
    let errorData = null;
    
    try {
      // Clone the response to avoid "body already read" errors
      const clone = res.clone();
      // Try to parse as JSON first
      const text = await res.text();
      
      if (text) {
        try {
          // Try to parse the text as JSON
          errorData = JSON.parse(text);
          if (errorData.message) {
            errorText = errorData.message;
          }
        } catch (e) {
          // If parsing fails, use the raw text
          errorText = `${res.status}: ${text}`;
        }
      }
      
      console.error("API Error:", {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        data: errorData || text,
        headers: Object.fromEntries(clone.headers.entries())
      });
    } catch (e) {
      console.error("Error while processing API error:", e);
    }
    
    throw new Error(errorText);
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
    
    try {
      console.log(`Query fetch to ${url}`);
      
      const res = await fetch(url, {
        credentials: "include", // Always include credentials for cookie-based auth
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      console.log(`Query fetch to ${url}, status: ${res.status}, ok: ${res.ok}`);
      console.log(`Response headers:`, Object.fromEntries(res.headers.entries()));

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Unauthorized, returning null as configured");
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Query data from ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`Query error for ${url}:`, error);
      throw error;
    }
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
