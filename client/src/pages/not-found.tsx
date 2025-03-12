import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/MainLayout";

export default function NotFound() {
  const { user } = useAuth();
  
  const NotFoundContent = () => (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
  
  if (user) {
    return (
      <MainLayout>
        <NotFoundContent />
      </MainLayout>
    );
  }
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <NotFoundContent />
    </div>
  );
}
