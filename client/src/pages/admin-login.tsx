import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, registerSchema, type LoginData, type RegisterData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music } from "lucide-react";

export function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);

  const form = useForm<LoginData & { displayName?: string }>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData & { displayName?: string }) => {
      const endpoint = isRegister ? '/api/admin/register' : '/api/admin/login';
      const res = await apiRequest('POST', endpoint, data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: isRegister ? "Account created successfully!" : "Welcome back!",
      });
      setLocation(`/dashboard/${data.admin.id}`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Authentication failed",
      });
    },
  });

  const onSubmit = (data: LoginData & { displayName?: string }) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" data-testid="login-page">
      <Card className="w-full max-w-md bg-slate-850 border-slate-700">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mx-auto flex items-center justify-center">
            <Music className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gradient">QR Jukebox</CardTitle>
            <p className="text-slate-400 mt-2">Collaborative music experience</p>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={isRegister ? "register" : "login"} onValueChange={(value) => setIsRegister(value === "register")} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="login" className="data-[state=active]:bg-slate-600" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-slate-600" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-login">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter your username"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Enter your password"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={loginMutation.isPending}
                    className="w-full gradient-primary hover:opacity-90 transition-opacity"
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-register">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Display Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Your jukebox name"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-display-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Choose a username"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Create a password"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={loginMutation.isPending}
                    className="w-full gradient-primary hover:opacity-90 transition-opacity"
                    data-testid="button-register"
                  >
                    {loginMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
