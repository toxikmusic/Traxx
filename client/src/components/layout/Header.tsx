import { useState } from "react";
import { Link, useLocation } from "wouter";
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
import { Search, Compass, Video, ChevronDown } from 'lucide-react';

export default function Header() {
  const [, setLocation] = useLocation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const toggleMobileSearch = () => {
    setMobileSearchOpen(!mobileSearchOpen);
  };

  return (
    <>
      <header className="bg-dark-200 border-b border-dark-100 py-3 px-4 fixed top-0 w-full z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer">
                BeatStream
              </h1>
            </Link>
          </div>
          
          {/* Search bar (desktop) */}
          <div className="hidden md:block flex-grow max-w-xl mx-4">
            <SearchBar />
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center space-x-4">
            <button className="md:hidden text-gray-400" onClick={toggleMobileSearch}>
              <Search size={20} />
            </button>
            
            <Link href="/discover" className="hidden md:flex items-center text-gray-400 hover:text-primary transition">
              <Compass className="mr-1" size={18} />
              <span>Discover</span>
            </Link>
            
            <Button 
              variant="default" 
              className="bg-secondary hover:bg-secondary/80 text-white" 
              onClick={() => setLocation("/go-live")}
            >
              <Video className="mr-1" size={18} />
              <span className="hidden md:inline">Go Live</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 border border-dark-100">
                    <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=40&h=40&q=80" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile/user123")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/library")}>
                  My Library
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pt-16 pb-2 bg-dark-200 fixed w-full z-40">
          <SearchBar />
        </div>
      )}
    </>
  );
}
