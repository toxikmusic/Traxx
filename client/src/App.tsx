import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { ThemeProvider } from "@/context/ThemeContext";

import Home from "@/pages/home";
import Stream from "@/pages/stream";
import Profile from "@/pages/profile";
import Posts from "@/pages/posts";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Discover from "@/pages/discover";
import Library from "@/pages/library";
import GoLive from "@/pages/go-live";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/stream/:id" component={Stream} />
      <Route path="/profile/:username" component={Profile} />
      <Route path="/posts" component={Posts} />
      <Route path="/settings" component={Settings} />
      <Route path="/discover" component={Discover} />
      <Route path="/library" component={Library} />
      <Route path="/go-live" component={GoLive} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AudioPlayerProvider>
          <Router />
          <Toaster />
        </AudioPlayerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
