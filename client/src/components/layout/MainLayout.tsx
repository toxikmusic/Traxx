import { ReactNode } from "react";
import Header from "./Header";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Radio } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import MobileNavigation from "./MobileNavigation";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 pb-20 md:pb-24">
        {children}
      </main>
      
      <MobileNavigation />
      
      {user && (
        <div className="fixed bottom-24 right-6 flex flex-col gap-4 md:bottom-8">
          <Link href="/go-live">
            <Button size="icon" className="rounded-full bg-red-500 hover:bg-red-600 shadow-lg h-14 w-14" title="Go Live">
              <Radio className="h-6 w-6" />
            </Button>
          </Link>
          
          <Link href="/upload-track">
            <Button size="icon" className="rounded-full bg-primary hover:bg-primary/90 shadow-lg h-14 w-14" title="Upload Track">
              <Upload className="h-6 w-6" />
            </Button>
          </Link>
          
          <Link href="/posts/new">
            <Button size="icon" className="rounded-full bg-primary hover:bg-primary/90 shadow-lg h-14 w-14" title="Create Post">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}