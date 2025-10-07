import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const hasRedirected = useRef(false);

  // Redirect to dashboard if already logged in - with protection against loops
  useEffect(() => {
    if (!authLoading && user && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log('User already logged in, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      console.log('🔑 Iniciando login...');
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      console.log('📊 Resposta do login:', { 
        hasUser: !!authData.user,
        hasSession: !!authData.session,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Erro de autenticação:', error);
        toast({
          title: "Erro ao fazer login",
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos'
            : error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!authData.user || !authData.session) {
        console.error('❌ Dados de autenticação incompletos');
        toast({
          title: "Erro ao fazer login",
          description: "Erro inesperado. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('✅ Login bem-sucedido!');

      // Atualizar last_login no profile (não bloqueante)
      supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", authData.user.id);

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });

      console.log('🚀 Redirecionando para dashboard...');
      
      // Marcar como redirecionado e navegar imediatamente
      hasRedirected.current = true;
      
      // Usar window.location para garantir navegação completa
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error('❌ Erro inesperado no login:', error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Entre com suas credenciais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="Sua senha" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Voltar para o início
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
