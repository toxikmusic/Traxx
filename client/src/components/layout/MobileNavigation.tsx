import { Link, useLocation } from "wouter";
import { Home, Radio, Video, BookmarkIcon, LayoutDashboard } from "lucide-react";

export default function MobileNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="md:hidden fixed bottom-16 left-0 w-full bg-stone-200 border-t border-dark-100 py-2 z-50">
      <div className="flex items-center justify-around">
        <Link 
          href="/" 
          className={`flex flex-col items-center ${isActive('/') ? 'text-primary' : 'text-gray-400 hover:text-primary'} transition`}
        >
          <Home size={16} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link 
          href="/streams" 
          className={`flex flex-col items-center ${isActive('/streams') ? 'text-primary' : 'text-gray-400 hover:text-primary'} transition`}
        >
          <Radio size={16} />
          <span className="text-xs mt-1">Streams</span>
        </Link>
        
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center ${isActive('/dashboard') ? 'text-primary' : 'text-gray-400 hover:text-primary'} transition`}
        >
          <LayoutDashboard size={16} />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        
        <Link 
          href="/go-live" 
          className={`flex flex-col items-center ${isActive('/go-live') ? 'text-primary' : 'text-gray-400 hover:text-primary'} transition`}
        >
          <Video size={16} />
          <span className="text-xs mt-1">Go Live</span>
        </Link>
        
        <Link 
          href="/library" 
          className={`flex flex-col items-center ${isActive('/library') ? 'text-primary' : 'text-gray-400 hover:text-primary'} transition`}
        >
          <BookmarkIcon size={16} />
          <span className="text-xs mt-1">Library</span>
        </Link>
      </div>
    </nav>
  );
}
