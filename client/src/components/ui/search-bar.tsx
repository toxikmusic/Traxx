import { useState } from "react";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <Input
        type="text"
        placeholder="Search tracks, users, streams, or posts"
        value={searchQuery}
        onChange={handleSearch}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full py-2 px-4 pr-16 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 ${isFocused ? 'bg-background/90' : 'bg-background/50'}`}
      />
      {searchQuery && (
        <button 
          type="button"
          onClick={clearSearch}
          className="absolute right-10 top-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button 
        type="submit"
        className="absolute right-3 top-2.5 text-primary hover:text-primary/80"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
