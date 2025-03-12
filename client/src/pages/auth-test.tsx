import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function AuthTest() {
  const { user, isLoading, loginMutation, logoutMutation, refetchUser } = useAuth();
  const [username, setUsername] = useState("djshadow");
  const [password, setPassword] = useState("password123");
  const [apiResponse, setApiResponse] = useState<any>(null);

  const handleLogin = async () => {
    try {
      await loginMutation.mutateAsync({ username, password });
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleRefetchUser = async () => {
    try {
      const result = await refetchUser();
      toast({
        title: "User Data Refetched",
        description: "Refetch operation completed"
      });
      console.log("Refetch result:", result);
    } catch (error) {
      console.error("Refetch error:", error);
    }
  };

  const testEndpoint = async (endpoint: string) => {
    try {
      const credentials = "include";
      const headers = { "Content-Type": "application/json" };
      setApiResponse({ loading: true, data: null, error: null });
      
      console.log(`Testing endpoint ${endpoint} with credentials: ${credentials}`);
      const response = await fetch(endpoint, { credentials, headers });
      console.log(`Response status:`, response.status);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || `${response.status}: ${response.statusText}`;
        } catch {
          errorText = `${response.status}: ${response.statusText}`;
        }
        
        setApiResponse({
          loading: false,
          data: null,
          error: errorText,
          status: response.status,
          statusText: response.statusText
        });
        return;
      }

      const data = await response.json();
      setApiResponse({
        loading: false,
        data,
        error: null,
        status: response.status,
        statusText: response.statusText
      });
    } catch (error) {
      console.error("API test error:", error);
      setApiResponse({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        status: "Error",
        statusText: "Request failed"
      });
    }
  };

  const checkCookies = () => {
    const cookieData = document.cookie;
    console.log("Document cookies:", cookieData);
    
    // Parse connect.sid cookie if it exists
    const connectSid = cookieData.split(';').find(c => c.trim().startsWith('connect.sid='));
    
    toast({
      title: "Cookie Check",
      description: cookieData 
        ? `Cookies found: ${cookieData.length} chars. Session cookie: ${connectSid ? "Found" : "Missing"}`
        : "No cookies found."
    });
  };

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
      
      <div className="grid gap-6 mb-8 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Authentication State</CardTitle>
            <CardDescription>Current authentication status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-semibold mb-1">Status:</div>
                  <div className={`px-3 py-1 rounded-full inline-block ${user ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {user ? "Authenticated" : "Not Authenticated"}
                  </div>
                </div>
                
                {user && (
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold">Username:</div>
                      <div>{user.username}</div>
                    </div>
                    <div>
                      <div className="font-semibold">Display Name:</div>
                      <div>{user.displayName}</div>
                    </div>
                    <div>
                      <div className="font-semibold">User ID:</div>
                      <div>{user.id}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleRefetchUser} variant="outline">
              Refetch User Data
            </Button>
            <Button onClick={checkCookies} variant="outline">
              Check Cookies
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Actions</CardTitle>
            <CardDescription>Log in or out to test authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handleLogin} disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Log In
            </Button>
            <Button onClick={handleLogout} variant="outline" disabled={logoutMutation.isPending}>
              {logoutMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Log Out
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>API Endpoint Tests</CardTitle>
          <CardDescription>Test various API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button onClick={() => testEndpoint('/api/user')} variant="outline">
              Test /api/user
            </Button>
            <Button onClick={() => testEndpoint('/api/user-settings/1')} variant="outline">
              Test /api/user-settings/1
            </Button>
            <Button onClick={() => testEndpoint('/api/posts')} variant="outline">
              Test /api/posts
            </Button>
            <Button onClick={() => testEndpoint('/api/streams')} variant="outline">
              Test /api/streams
            </Button>
          </div>
        </CardContent>
      </Card>

      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
            <CardDescription>
              Status: {apiResponse.loading ? "Loading..." : `${apiResponse.status} ${apiResponse.statusText}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiResponse.loading ? (
              <div className="flex justify-center p-4">
                <Spinner size="lg" />
              </div>
            ) : apiResponse.error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md overflow-auto">
                <h3 className="font-bold mb-2">Error:</h3>
                <pre className="whitespace-pre-wrap">{apiResponse.error}</pre>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-md overflow-auto max-h-80">
                <pre className="whitespace-pre-wrap">{JSON.stringify(apiResponse.data, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}