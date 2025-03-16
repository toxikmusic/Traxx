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
  methodOrUrl: string,
  endpointOrBody?: string | any,
  bodyOrOptions?: any,
  options?: RequestInit,
): Promise<T> {
  // Handle different function signatures:
  
  let method: string;
  let url: string;
  let body: any;
  let fetchOptions: RequestInit = {};
  
  // Check parameter types to determine which signature is being used
  if (endpointOrBody && typeof methodOrUrl === 'string' && typeof endpointOrBody === 'string') {
    // New signature: apiRequest(method, endpoint, body, options)
    method = methodOrUrl;
    url = endpointOrBody;
    body = bodyOrOptions;
    fetchOptions = options || {};
  } else {
    // Old signature: apiRequest(endpoint, options)
    method = 'GET';
    url = methodOrUrl;
    fetchOptions = endpointOrBody as RequestInit || {};
    body = undefined;
    
    if (fetchOptions.method) {
      method = fetchOptions.method;
    }
    
    if (fetchOptions.body) {
      body = fetchOptions.body;
    }
  }
  
  // Replit environment URL handling
  // Make sure we're using relative URLs for API endpoints
  if (url.startsWith('/api/')) {
    // Using relative URL which is correct
    console.log(`Using relative API URL: ${url}`);
  } else if (url.includes('/api/')) {
    // Extract the path part from an absolute URL
    const urlObject = new URL(url);
    url = urlObject.pathname + urlObject.search;
    console.log(`Converted to relative API URL: ${url}`);
  }
  
  // Final fetch options
  fetchOptions = {
    method,
    credentials: "include", // Always include credentials for cookie-based auth
    headers: {
      "Accept": "application/json",
      "Cache-Control": "no-cache"
    },
    ...fetchOptions
  };
  
  // Handle request body
  if (body) {
    if (body instanceof FormData) {
      // Let the browser set the content type for FormData (includes boundary)
      fetchOptions.body = body;
    } else {
      // For JSON requests
      fetchOptions.headers = {
        ...fetchOptions.headers as Record<string, string>,
        "Content-Type": "application/json"
      };
      fetchOptions.body = JSON.stringify(body);
    }
  }
  
  // Ensure credentials aren't overridden
  fetchOptions.credentials = "include";
  
  console.log(`API ${method} request to ${url}`, { 
    method,
    credentials: fetchOptions.credentials,
    headers: fetchOptions.headers
  });
  
  try {
    const res = await fetch(url, fetchOptions);
    
    console.log(`API ${method} request to ${url}, status: ${res.status}`);
    console.log(`Response headers:`, Object.fromEntries(res.headers.entries()));
    
    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    console.error(`API Error for ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Replit environment URL handling
    // Make sure we're using relative URLs for API endpoints
    if (url.startsWith('/api/')) {
      // Using relative URL which is correct
      console.log(`Using relative API URL: ${url}`);
    } else if (url.includes('/api/')) {
      // Extract the path part from an absolute URL
      const urlObject = new URL(url);
      url = urlObject.pathname + urlObject.search;
      console.log(`Converted to relative API URL: ${url}`);
    }
    
    try {
      console.log(`Query fetch to ${url}`);
      
      // Check if document has valid cookie
      console.log("Current cookies:", document.cookie);
      
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
        // If we're getting 401 repeatedly, we might need to redirect to login
        if (url === '/api/user' && !document.cookie.includes('connect.sid')) {
          console.log("No session cookie found, auth system may need refresh");
        }
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
