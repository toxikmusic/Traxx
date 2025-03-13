import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Extend the insertUserSchema for login form validation
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Extend the insertUserSchema for registration form validation
const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      bio: "",
      profileImageUrl: null,
    },
  });
  
  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Transform any null values to empty strings for optional fields
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === null ? "" : value])
    ) as RegisterFormValues;
    
    registerMutation.mutate(cleanedData);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      {/* Form section */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Traxx
            </h1>
            <p className="text-muted-foreground">
              {activeTab === "login"
                ? "Sign in to your account to continue"
                : "Create a new account and start streaming"}
            </p>
            {activeTab === "login" && (
              <div className="text-xs text-muted-foreground mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <p><strong><span>welcome, login to access the site, otherwise register a free account</span></strong>
                  </p>
              </div>
            )}
          </div>

          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="space-y-4">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="space-y-4">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your display name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Tell us about yourself" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero image section */}
      <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-black p-8 relative overflow-hidden">
        {/* Animated background dots */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute w-2 h-2 rounded-full bg-white animate-pulse" style={{ top: '10%', left: '10%', animationDelay: '0s' }}></div>
          <div className="absolute w-1 h-1 rounded-full bg-white animate-pulse" style={{ top: '20%', left: '30%', animationDelay: '0.5s' }}></div>
          <div className="absolute w-2 h-2 rounded-full bg-white animate-pulse" style={{ top: '45%', left: '15%', animationDelay: '1s' }}></div>
          <div className="absolute w-1 h-1 rounded-full bg-white animate-pulse" style={{ top: '70%', left: '35%', animationDelay: '1.5s' }}></div>
          <div className="absolute w-2 h-2 rounded-full bg-white animate-pulse" style={{ top: '85%', left: '20%', animationDelay: '2s' }}></div>
          <div className="absolute w-1 h-1 rounded-full bg-white animate-pulse" style={{ top: '30%', left: '80%', animationDelay: '2.5s' }}></div>
          <div className="absolute w-2 h-2 rounded-full bg-white animate-pulse" style={{ top: '60%', left: '75%', animationDelay: '3s' }}></div>
          <div className="absolute w-1 h-1 rounded-full bg-white animate-pulse" style={{ top: '15%', left: '60%', animationDelay: '3.5s' }}></div>
          <div className="absolute w-2 h-2 rounded-full bg-white animate-pulse" style={{ top: '80%', left: '60%', animationDelay: '4s' }}></div>
        </div>
        
        <div className="max-w-xl space-y-8 text-white z-10">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Your music, your audience, all in one place
          </h2>
          <p className="text-xl font-light">
            Traxx is the ultimate platform for musicians to connect with
            fans, live stream performances, and share music with the world.
          </p>
          <div className="space-y-6">
            <div className="flex items-start space-x-4 backdrop-blur-sm bg-white/5 rounded-lg p-4 transition-all hover:bg-white/10">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
                🎵
              </div>
              <div>
                <h3 className="font-semibold text-lg text-purple-300">Live Streaming</h3>
                <p className="text-base text-gray-300">
                  Connect with your audience in real-time through high-quality
                  audio streaming.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 backdrop-blur-sm bg-white/5 rounded-lg p-4 transition-all hover:bg-white/10">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg">
                💿
              </div>
              <div>
                <h3 className="font-semibold text-lg text-pink-300">Track Library</h3>
                <p className="text-base text-gray-300">
                  Upload your music and build your discography for fans to
                  explore.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 backdrop-blur-sm bg-white/5 rounded-lg p-4 transition-all hover:bg-white/10">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                💬
              </div>
              <div>
                <h3 className="font-semibold text-lg text-blue-300">Community</h3>
                <p className="text-base text-gray-300">
                  Engage with a vibrant community of musicians and music lovers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}