import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        type="text"
        placeholder="Search streams, music, or creators"
        value={searchQuery}
        onChange={handleSearch}
        className="bg-dark-100 w-full py-2 px-4 pr-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button 
        type="submit"
        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
