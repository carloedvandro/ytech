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
import { TwoFactorModal } from "@/components/TwoFactorModal";

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
  const [show2FA, setShow2FA] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ email: string; password: string; whatsapp: string } | null>(null);
  const hasRedirected = useRef(false);
  const isVerifying2FA = useRef(false); // Flag para indicar que estamos no processo de 2FA

  // Redirect to dashboard if already logged in - with protection against loops
  useEffect(() => {
    if (!authLoading && user && !hasRedirected.current && !isVerifying2FA.current) {
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
    isVerifying2FA.current = true; // Ativar flag de verificação 2FA
    
    try {
      console.log('🔑 Validando credenciais...');
      
      // Validar credenciais SEM fazer login ainda
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
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
        isVerifying2FA.current = false; // Desativar flag em caso de erro
        return;
      }

      if (!authData.user) {
        console.error('❌ Dados de autenticação incompletos');
        toast({
          title: "Erro ao fazer login",
          description: "Erro inesperado. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        isVerifying2FA.current = false; // Desativar flag em caso de erro
        return;
      }

      // Fazer logout imediato para não completar o login ainda
      await supabase.auth.signOut();

      // Buscar WhatsApp do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("whatsapp")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile?.whatsapp) {
        console.error('❌ WhatsApp não encontrado:', profileError);
        toast({
          title: "Erro",
          description: "WhatsApp não cadastrado. Entre em contato com o suporte.",
          variant: "destructive",
        });
        setLoading(false);
        isVerifying2FA.current = false; // Desativar flag em caso de erro
        return;
      }

      console.log('📱 Enviando código 2FA para:', profile.whatsapp);

      // Enviar código via WhatsApp
      const { error: sendError } = await supabase.functions.invoke("send-whatsapp-verification", {
        body: { whatsapp: profile.whatsapp },
      });

      if (sendError) {
        console.error('❌ Erro ao enviar código:', sendError);
        toast({
          title: "Erro ao enviar código",
          description: "Não foi possível enviar o código. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        isVerifying2FA.current = false; // Desativar flag em caso de erro
        return;
      }

      console.log('✅ Código enviado com sucesso');

      // Guardar dados para login após verificação ANTES de mostrar o modal
      const authInfo = {
        email: data.email,
        password: data.password,
        whatsapp: profile.whatsapp,
      };
      
      console.log('💾 Salvando pendingAuth:', authInfo);
      setPendingAuth(authInfo);
      
      console.log('🔓 Ativando modal 2FA');
      setShow2FA(true);
      
      console.log('📊 Estados atualizados - show2FA: true, pendingAuth:', authInfo);
      setLoading(false);

      toast({
        title: "Código enviado!",
        description: "Verifique seu WhatsApp",
      });

    } catch (error: any) {
      console.error('❌ Erro inesperado no login:', error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
      isVerifying2FA.current = false; // Desativar flag em caso de erro
    }
  };

  const handleTwoFactorVerified = async () => {
    if (!pendingAuth) return;

    setLoading(true);
    try {
      // Agora sim, fazer o login completo
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: pendingAuth.email,
        password: pendingAuth.password,
      });

      if (error) throw error;

      console.log('✅ Login 2FA completo!');

      // Atualizar last_login no profile
      await supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", authData.user!.id);

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });

      isVerifying2FA.current = false; // Desativar flag após sucesso
      hasRedirected.current = true;
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error('❌ Erro ao completar login:', error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
      setShow2FA(false);
      setPendingAuth(null);
      isVerifying2FA.current = false; // Desativar flag em caso de erro
    }
  };

  const handleTwoFactorCancel = () => {
    setShow2FA(false);
    setPendingAuth(null);
    setLoading(false);
    isVerifying2FA.current = false; // Desativar flag ao cancelar
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="space-y-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">YTech</h1>
              <p className="text-sm text-muted-foreground">Yrwen Technology</p>
            </div>
            <div className="space-y-1">
              <CardTitle>Login</CardTitle>
              <CardDescription>Entre com suas credenciais</CardDescription>
            </div>
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

      <TwoFactorModal
        open={show2FA && !!pendingAuth}
        whatsapp={pendingAuth?.whatsapp || ''}
        onVerified={handleTwoFactorVerified}
        onCancel={handleTwoFactorCancel}
      />
    </>
  );
};

export default Login;
