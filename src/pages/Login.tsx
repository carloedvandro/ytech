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
import { EtheralShadow } from "@/components/ui/etheral-shadow";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
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
    isVerifying2FA.current = true;
    
    try {
      console.log('🔑 Buscando usuário pelo email...');
      
      // Buscar perfil pelo email primeiro
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, whatsapp")
        .eq("email", data.email)
        .limit(1);

      if (profileError || !profiles || profiles.length === 0) {
        console.error('❌ Usuário não encontrado');
        toast({
          title: "Erro ao fazer login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        setLoading(false);
        isVerifying2FA.current = false;
        return;
      }

      const profile = profiles[0];

      if (!profile.whatsapp) {
        console.error('❌ WhatsApp não cadastrado');
        toast({
          title: "Erro",
          description: "WhatsApp não cadastrado. Entre em contato com o suporte.",
          variant: "destructive",
        });
        setLoading(false);
        isVerifying2FA.current = false;
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
        isVerifying2FA.current = false;
        return;
      }

      console.log('✅ Código enviado com sucesso');

      // Guardar dados para login após verificação
      setPendingAuth({
        email: data.email,
        password: data.password,
        whatsapp: profile.whatsapp,
      });
      
      setShow2FA(true);
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
      isVerifying2FA.current = false;
    }
  };

  const handleVerifyCode = async () => {
    if (!pendingAuth || verificationCode.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Digite o código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    
    try {
      console.log('🔐 Verificando código 2FA...');
      console.log('📊 Estado atual - show2FA:', show2FA, 'pendingAuth:', !!pendingAuth);
      
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-code", {
        body: { whatsapp: pendingAuth.whatsapp, code: verificationCode },
      });

      console.log('📥 Resposta da verificação:', { data, error });

      // Tratar erro de rede ou resposta
      if (error && !data) {
        console.error('❌ Erro de rede:', error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível verificar o código. Tente novamente.",
          variant: "destructive",
        });
        setVerificationCode("");
        setVerifying(false);
        // MANTER show2FA true para não perder a tela
        console.log('🔄 Mantendo tela 2FA após erro de rede');
        return;
      }

      // Se data existe mas verified é false
      if (data && !data.verified) {
        console.log('❌ Código incorreto:', data.error);
        toast({
          title: "Código inválido",
          description: data.error || "Tente novamente",
          variant: "destructive",
        });
        setVerificationCode("");
        setVerifying(false);
        // MANTER show2FA true para não perder a tela
        console.log('🔄 Mantendo tela 2FA após código incorreto');
        return;
      }

      console.log('✅ Código verificado! Fazendo login...');

      // Código verificado, fazer login completo
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: pendingAuth.email,
        password: pendingAuth.password,
      });

      if (loginError) {
        console.error('❌ Erro no login final:', loginError);
        throw loginError;
      }

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

      isVerifying2FA.current = false;
      hasRedirected.current = true;
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error('❌ Erro inesperado ao verificar/login:', error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setVerifying(false);
      setVerificationCode("");
      // IMPORTANTE: MANTER show2FA true para não perder a tela
      console.log('🔄 Mantendo tela 2FA após erro inesperado');
      // NÃO resetar show2FA aqui!
    }
  };

  const handleCancelVerification = () => {
    setShow2FA(false);
    setPendingAuth(null);
    setVerificationCode("");
    setLoading(false);
    setVerifying(false);
    isVerifying2FA.current = false;
  };

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4 py-20">
        {/* Animated Shadow Overlay Background */}
        <EtheralShadow
          color="rgba(0, 255, 255, 0.2)"
          animation={{ scale: 50, speed: 30 }}
          noise={{ opacity: 0.15, scale: 1.5 }}
        />

        <Card className="relative z-10 max-w-md w-full bg-black/40 backdrop-blur-sm border-primary/30 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
          <CardHeader className="space-y-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-2 drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">YTech</h1>
              <p className="text-sm text-white/70">Yrwen Technology</p>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-white">Login</CardTitle>
              <CardDescription className="text-white/70">Entre com suas credenciais</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Campos de login - sempre no DOM */}
              <div style={{ display: !show2FA ? 'block' : 'none' }}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      {...register("email")}
                      className="bg-black/60 border-primary/30 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Senha</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Sua senha" 
                      {...register("password")}
                      className="bg-black/60 border-primary/30 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] transition-all font-semibold" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-primary/50 bg-black/40 text-primary hover:bg-primary/10 hover:border-primary transition-all"
                    onClick={() => navigate("/")}
                  >
                    Voltar para o início
                  </Button>
                </div>
              </div>

              {/* Seção 2FA - sempre no DOM, controlada por display */}
              <div style={{ display: show2FA ? 'block' : 'none', minHeight: '300px' }}>
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-white">Verificação em 2 etapas</h3>
                    <p className="text-sm text-white/70">
                      Digite o código de 6 dígitos enviado para seu WhatsApp
                    </p>
                    <p className="text-sm text-primary font-medium">
                      {pendingAuth?.whatsapp}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-6 py-4">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                      disabled={verifying}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="bg-black/60 border-primary/30 text-white" />
                        <InputOTPSlot index={1} className="bg-black/60 border-primary/30 text-white" />
                        <InputOTPSlot index={2} className="bg-black/60 border-primary/30 text-white" />
                        <InputOTPSlot index={3} className="bg-black/60 border-primary/30 text-white" />
                        <InputOTPSlot index={4} className="bg-black/60 border-primary/30 text-white" />
                        <InputOTPSlot index={5} className="bg-black/60 border-primary/30 text-white" />
                      </InputOTPGroup>
                    </InputOTP>

                    <div className="flex gap-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelVerification}
                        disabled={verifying}
                        className="flex-1 border-2 border-primary/50 bg-black/40 text-primary hover:bg-primary/10"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verifying || verificationCode.length !== 6}
                        className="flex-1 bg-primary text-black hover:bg-primary/90"
                      >
                        {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verificar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Login;
