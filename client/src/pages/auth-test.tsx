import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

export default function AuthTestPage() {
  const { user, isLoading, error, loginMutation, logoutMutation } = useAuth();
  const [username, setUsername] = useState("djshadow");
  const [password, setPassword] = useState("password123");

  const handleLogin = () => {
    loginMutation.mutate({ username, password });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const [apiResponse, setApiResponse] = useState<string>("");
  const [isApiLoading, setIsApiLoading] = useState(false);

  const testApiCall = async () => {
    setIsApiLoading(true);
    try {
      const res = await fetch("/api/user", {
        credentials: "include",
      });
      const data = await res.text();
      setApiResponse(`Status: ${res.status}\nResponse: ${data}`);
    } catch (error) {
      setApiResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsApiLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current user info and status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : user ? (
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Status:</span> Authenticated
                </p>
                <p>
                  <span className="font-semibold">User ID:</span> {user.id}
                </p>
                <p>
                  <span className="font-semibold">Username:</span> {user.username}
                </p>
                <p>
                  <span className="font-semibold">Display Name:</span> {user.displayName}
                </p>
              </div>
            ) : (
              <p>Not authenticated</p>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{error.message}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {user ? (
              <Button onClick={handleLogout} disabled={logoutMutation.isPending}>
                {logoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  "Logout"
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Use the login form to authenticate</p>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login Form</CardTitle>
            <CardDescription>Test authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleLogin} disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>API Test</CardTitle>
          <CardDescription>Test authenticated API call</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={testApiCall} disabled={isApiLoading}>
              {isApiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing API...
                </>
              ) : (
                "Test /api/user Endpoint"
              )}
            </Button>

            {apiResponse && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                <pre className="whitespace-pre-wrap break-all text-sm">{apiResponse}</pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}