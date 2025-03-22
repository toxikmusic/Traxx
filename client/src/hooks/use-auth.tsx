import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<unknown, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, InsertUser>;
  refetchUser: () => Promise<any>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Fetch current user with enhanced logging
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchOnWindowFocus: true // Refetch when window regains focus
  });

  // Login mutation with improved error handling
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login for user:", credentials.username);
      try {
        const response = await apiRequest<Omit<SelectUser, "password">>(
          "POST",
          "/api/login", 
          credentials
        );
        console.log("Login successful, received user data:", response);
        return response;
      } catch (error) {
        console.error("Login failed:", error);
        throw error;
      }
    },
    onSuccess: (user: Omit<SelectUser, "password">) => {
      console.log("Setting user data in queryClient cache");
      queryClient.setQueryData(["/api/user"], user);
      
      // Also invalidate any user-dependent queries
      queryClient.invalidateQueries({ queryKey: ["/api/user-settings"] });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error handler:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Registration mutation with improved error handling
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Attempting to register new user:", credentials.username);
      try {
        const response = await apiRequest<Omit<SelectUser, "password">>(
          "POST",
          "/api/register", 
          credentials
        );
        console.log("Registration successful, received user data:", response);
        return response;
      } catch (error) {
        console.error("Registration failed:", error);
        throw error;
      }
    },
    onSuccess: (user: Omit<SelectUser, "password">) => {
      console.log("Setting user data in queryClient cache after registration");
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to Traxx, ${user.displayName}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration mutation error handler:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation with improved error handling
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting to log out");
      try {
        const response = await apiRequest<{message: string}>(
          "POST",
          "/api/logout"
        );
        console.log("Logout successful:", response);
        return response;
      } catch (error) {
        console.error("Logout failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Clearing user data from queryClient cache");
      queryClient.setQueryData(["/api/user"], null);
      
      // Also clear any user-dependent queries
      queryClient.removeQueries({ queryKey: ["/api/user-settings"] });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      console.error("Logout mutation error handler:", error);
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}