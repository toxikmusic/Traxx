import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import SearchBar from "@/components/ui/search-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Search, Compass, Video, ChevronDown, Loader2 } from 'lucide-react';

export default function Header() {
  const [, setLocation] = useLocation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  const toggleMobileSearch = () => {
    setMobileSearchOpen(!mobileSearchOpen);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <header className="bg-background border-b themed-border py-3 px-4 absolute top-0 w-full z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-primary font-bold text-xl flex items-center">
                <span className="themed-text-gradient">TRAXX</span>
            </Link>
          </div>
          
          {/* Search bar (desktop) */}
          <div className="hidden md:block flex-grow max-w-xl mx-4">
            <SearchBar />
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center space-x-4">
            <button className="md:hidden text-muted-foreground hover:text-primary transition-colors" onClick={toggleMobileSearch}>
              <Search className="themed-icon" size={20} />
            </button>
            
            <Link href="/discover" className="hidden md:flex items-center text-muted-foreground hover:text-primary transition-colors">
              <Compass className="mr-1 themed-icon" size={18} />
              <span>Discover</span>
            </Link>
            
            <Button 
              variant="default" 
              className="bg-primary hover:bg-primary/80 text-primary-foreground" 
              onClick={() => setLocation("/go-live")}
            >
              <Video className="mr-1" size={18} />
              <span className="hidden md:inline">Go Live</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 border-2 themed-border ring-2 ring-primary/20">
                    {user?.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {user ? user.displayName : 'My Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                  Creator Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation(`/profile/${user?.username}`)}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/library")}>
                  My Library
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing out...
                    </>
                  ) : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pt-16 pb-2 bg-background border-b themed-border fixed w-full z-40">
          <SearchBar />
        </div>
      )}
    </>
  );
}
