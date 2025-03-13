import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type HealthStatus = {
  status: string;
  timestamp?: string;
  environment?: string;
  uptime?: number;
  version?: string;
  database?: string;
  services?: Record<string, string>;
  memoryUsage?: Record<string, string>;
};

export default function HealthTestPage() {
  const [basicHealth, setBasicHealth] = useState<HealthStatus | null>(null);
  const [detailedHealth, setDetailedHealth] = useState<HealthStatus | null>(null);
  const [basicLoading, setBasicLoading] = useState(false);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [directHealth, setDirectHealth] = useState<HealthStatus | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch data from our health endpoints
  const fetchBasicHealth = async () => {
    setBasicLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setBasicHealth(data);
    } catch (err) {
      setError(`Error fetching basic health: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Error fetching basic health:", err);
    } finally {
      setBasicLoading(false);
    }
  };

  const fetchDetailedHealth = async () => {
    setDetailedLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health/detailed');
      const data = await response.json();
      setDetailedHealth(data);
    } catch (err) {
      setError(`Error fetching detailed health: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Error fetching detailed health:", err);
    } finally {
      setDetailedLoading(false);
    }
  };

  const fetchDirectHealthCheck = async () => {
    setDirectLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health-check');
      const data = await response.json();
      setDirectHealth(data);
    } catch (err) {
      setError(`Error fetching direct health check: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Error fetching direct health check:", err);
    } finally {
      setDirectLoading(false);
    }
  };

  // Check health automatically on page load
  useEffect(() => {
    fetchBasicHealth();
    fetchDetailedHealth();
    fetchDirectHealthCheck();
  }, []);

  return (
    <div className="min-h-screen w-full p-6 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">BeatStream Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Basic Health Status */}
            <div className="col-span-1">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                Basic Health
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchBasicHealth} 
                  disabled={basicLoading}
                  className="ml-auto"
                >
                  {basicLoading ? "Loading..." : "Refresh"}
                </Button>
              </h2>
              
              {basicHealth ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${basicHealth.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-medium">{basicHealth.status === "ok" ? "Healthy" : "Unhealthy"}</span>
                  </div>
                  
                  {basicHealth.timestamp && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Last updated:</span>
                      <span className="ml-2">{new Date(basicHealth.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {basicHealth.version && (
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">Version:</span>
                      <span className="ml-2">{basicHealth.version}</span>
                    </div>
                  )}
                  
                  {basicHealth.environment && (
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">Environment:</span>
                      <span className="ml-2">{basicHealth.environment}</span>
                    </div>
                  )}
                  
                  {basicHealth.uptime !== undefined && (
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">Uptime:</span>
                      <span className="ml-2">{Math.floor(basicHealth.uptime / 60)} min {Math.floor(basicHealth.uptime % 60)} sec</span>
                    </div>
                  )}
                  
                  {basicHealth.database && (
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">Database:</span>
                      <span className="ml-2">{basicHealth.database}</span>
                    </div>
                  )}
                </div>
              ) : basicLoading ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-gray-500 italic">No data available</p>
                </div>
              )}
            </div>

            {/* Detailed Health Status */}
            <div className="col-span-1">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                Detailed Health
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchDetailedHealth} 
                  disabled={detailedLoading}
                  className="ml-auto"
                >
                  {detailedLoading ? "Loading..." : "Refresh"}
                </Button>
              </h2>
              
              {detailedHealth ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${detailedHealth.status === "healthy" ? "bg-green-500" : detailedHealth.status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`} />
                    <span className="font-medium capitalize">{detailedHealth.status}</span>
                  </div>
                  
                  {detailedHealth.timestamp && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Last updated:</span>
                      <span className="ml-2">{new Date(detailedHealth.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {detailedHealth.services && (
                    <>
                      <div className="mt-3 text-sm font-medium">Services:</div>
                      <div className="space-y-1 mt-1">
                        {Object.entries(detailedHealth.services).map(([service, status]) => (
                          <div key={service} className="flex items-center gap-2 text-xs">
                            <div className={`w-2 h-2 rounded-full ${status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-gray-700 dark:text-gray-300">{service}:</span>
                            <span className={status === "healthy" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {detailedHealth.memoryUsage && (
                    <>
                      <div className="mt-3 text-sm font-medium">Memory Usage:</div>
                      <div className="space-y-1 mt-1">
                        {Object.entries(detailedHealth.memoryUsage).map(([type, usage]) => (
                          <div key={type} className="text-xs flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">{type}:</span>
                            <span>{usage}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : detailedLoading ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-gray-500 italic">No data available</p>
                </div>
              )}
            </div>

            {/* Direct Health Check */}
            <div className="col-span-1">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                Direct Health Check
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchDirectHealthCheck} 
                  disabled={directLoading}
                  className="ml-auto"
                >
                  {directLoading ? "Loading..." : "Refresh"}
                </Button>
              </h2>
              
              {directHealth ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${directHealth.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-medium">{directHealth.status === "ok" ? "Healthy" : "Unhealthy"}</span>
                  </div>
                  
                  {directHealth.timestamp && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Last updated:</span>
                      <span className="ml-2">{new Date(directHealth.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : directLoading ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-full"></div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-gray-500 italic">No data available</p>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>This page directly tests the health endpoints of BeatStream's backend services.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Basic Health: <code>/api/health</code> - Shows basic system status</li>
              <li>Detailed Health: <code>/api/health/detailed</code> - Shows detailed system status with services</li>
              <li>Direct Health Check: <code>/api/health-check</code> - A simple and direct health check endpoint</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}