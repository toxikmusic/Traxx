import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SearchResult, searchContent } from "@/lib/search";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, User, Video, FileText, Loader2, Search as SearchIcon, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Parse search query from URL
  const query = new URLSearchParams(location.split("?")[1]).get("q") || "";
  
  // Set the search input field to match the URL query
  useEffect(() => {
    if (query) {
      setSearchInput(query);
    }
  }, [query]);

  useEffect(() => {
    async function fetchSearchResults() {
      setIsLoading(true);
      setError(null);
      
      if (query) {
        try {
          const results = await searchContent(query);
          setSearchResults(results);
        } catch (err) {
          console.error("Search error:", err);
          setError("An error occurred while searching. Please try again.");
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
      
      setIsLoading(false);
    }

    fetchSearchResults();
  }, [query]);

  // Handle new search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Filter results based on active tab
  const filteredResults = activeTab === "all" 
    ? searchResults 
    : searchResults.filter(result => result.type === activeTab);
    
  // Get counts for each type
  const trackCount = searchResults.filter(r => r.type === "track").length;
  const userCount = searchResults.filter(r => r.type === "user").length;
  const streamCount = searchResults.filter(r => r.type === "stream").length;
  const postCount = searchResults.filter(r => r.type === "post").length;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Search Results
            </h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? "Searching..." : 
               searchResults.length > 0 ? `Found ${searchResults.length} results for "${query}"` : 
               query ? `No results found for "${query}"` : "Enter a search term to find content"}
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="w-full md:w-auto flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search again..."
                className="pl-9 min-w-[260px]"
              />
            </div>
            <Button type="submit" disabled={isLoading || !searchInput.trim()}>
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-6 flex overflow-x-auto">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All Results <Badge variant="outline">{searchResults.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="track" className="flex items-center gap-2">
              <Music className="h-4 w-4" /> 
              Tracks <Badge variant="outline">{trackCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" /> 
              Users <Badge variant="outline">{userCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="stream" className="flex items-center gap-2">
              <Video className="h-4 w-4" /> 
              Streams <Badge variant="outline">{streamCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="post" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> 
              Posts <Badge variant="outline">{postCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderResults()}
          </TabsContent>
          <TabsContent value="track" className="mt-0">
            {renderResults()}
          </TabsContent>
          <TabsContent value="user" className="mt-0">
            {renderResults()}
          </TabsContent>
          <TabsContent value="stream" className="mt-0">
            {renderResults()}
          </TabsContent>
          <TabsContent value="post" className="mt-0">
            {renderResults()}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );

  function renderResults() {
    if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Searching for "{query}"...</p>
        </div>
      );
    }

    if (filteredResults.length === 0) {
      return (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <SearchIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We couldn't find any matches for "{query}" in this category. Try another search term or browse popular content.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/discover">Discover</Link>
            </Button>
            <Button asChild>
              <Link href="/tracks">Browse Tracks</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResults.map((result) => (
          <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
        ))}
      </div>
    );
  }
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const getLink = () => {
    switch (result.type) {
      case "track":
        return `/tracks/${result.id}`;
      case "user":
        return `/profile/${result.id}`;
      case "stream":
        return `/stream/${result.id}`;
      case "post":
        return `/posts/${result.id}`;
      default:
        return "/";
    }
  };

  const getIcon = () => {
    switch (result.type) {
      case "track":
        return <Music className="h-5 w-5" />;
      case "user":
        return <User className="h-5 w-5" />;
      case "stream":
        return <Video className="h-5 w-5" />;
      case "post":
        return <FileText className="h-5 w-5" />;
    }
  };
  
  const getTypeLabel = () => {
    switch (result.type) {
      case "track": return "Track";
      case "user": return "User";
      case "stream": return "Live Stream";
      case "post": return "Post";
      default: return result.type;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
      <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 h-40 flex items-center justify-center overflow-hidden">
        {result.imageUrl ? (
          <img 
            src={result.imageUrl} 
            alt={result.title || result.username || ""}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            {getIcon()}
            <span className="mt-2 uppercase text-xs tracking-wider">
              {result.type}
            </span>
          </div>
        )}
        <Badge 
          className="absolute top-2 right-2"
          variant={
            result.type === "track" ? "default" :
            result.type === "user" ? "secondary" :
            result.type === "stream" ? "destructive" : 
            "outline"
          }
        >
          {getTypeLabel()}
        </Badge>
      </div>
      <CardContent className="pt-4 flex-1">
        <div className="flex items-start gap-3">
          {result.type === "user" && (
            <Avatar className="h-10 w-10 border-2 border-background">
              <img 
                src={result.imageUrl || "/placeholder-avatar.png"} 
                alt={result.username || "User"}
              />
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-lg truncate">
              {result.title || result.displayName || result.username || "Untitled"}
            </h3>
            <p className="text-muted-foreground text-sm truncate">
              {result.type === "track" && result.artistName}
              {result.type === "stream" && result.description}
              {result.type === "user" && `@${result.username}`}
              {result.type === "post" && (result.description || "View post details")}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 mt-auto">
        <Button variant="ghost" size="sm" className="ml-auto group-hover:bg-primary/10" asChild>
          <Link href={getLink()}>
            View details <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}