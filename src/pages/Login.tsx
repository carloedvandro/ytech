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
  const [show2FA, setShow2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ email: string; password: string; whatsapp: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'whatsapp' | 'email'>('email');
  const hasRedirected = useRef(false);
  const isVerifying2FA = useRef(false);

  // Clean corrupted data on mount and redirect if logged in
  useEffect(() => {
    // Aggressive cleanup on mount for Chrome Android
    const cleanCorruptedData = () => {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('temp-') || 
            key.startsWith('pending-') ||
            key.includes('verification') ||
            key.includes('2fa')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('🧹 Cleaned corrupted auth data on mount');
      } catch (error) {
        console.error('Error cleaning data:', error);
      }
    };

    cleanCorruptedData();

    // NÃO redirecionar se estamos no processo de 2FA
    // isVerifying2FA.current é setado como true durante todo o fluxo de 2FA
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
    // CRÍTICO: Prevenir qualquer comportamento padrão
    console.log('🚀 [LOGIN] onSubmit iniciado');
    
    // Limpar qualquer localStorage problemático que possa interferir
    try {
      console.log('🧹 [LOGIN] Limpando possíveis dados corrompidos');
      // Não limpar a sessão do Supabase, apenas dados temporários problemáticos
      const keysToCheck = Object.keys(localStorage);
      keysToCheck.forEach(key => {
        if (key.includes('temp-') || key.includes('pending-')) {
          localStorage.removeItem(key);
          console.log('🗑️ [LOGIN] Removido:', key);
        }
      });
    } catch (e) {
      console.log('⚠️ [LOGIN] Erro ao limpar localStorage:', e);
    }
    
    // Criar uma Promise para controlar o fluxo
    return new Promise<void>(async (resolve) => {
      setLoading(true);
      isVerifying2FA.current = true;
      
      try {
        console.log('🔑 [LOGIN] Buscando usuário...');
        
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, whatsapp")
          .eq("email", data.email)
          .limit(1);

        if (profileError || !profiles || profiles.length === 0) {
          toast({
            title: "Erro ao fazer login",
            description: "Email ou senha incorretos",
            variant: "destructive",
          });
          setLoading(false);
          isVerifying2FA.current = false;
          resolve();
          return;
        }

        const profile = profiles[0];

        if (!profile.whatsapp) {
          toast({
            title: "Erro",
            description: "WhatsApp não cadastrado",
            variant: "destructive",
          });
          setLoading(false);
          isVerifying2FA.current = false;
          resolve();
          return;
        }

        console.log('📧 [LOGIN] Enviando código por EMAIL...');

        // Enviar código por email (padrão) ao invés de WhatsApp
        const { error: sendError } = await supabase.functions.invoke("send-email-verification", {
          body: { 
            email: data.email,
            whatsapp: profile.whatsapp 
          },
        });

        if (sendError) {
          toast({
            title: "Erro ao enviar código",
            description: "Não foi possível enviar o código por email",
            variant: "destructive",
          });
          setLoading(false);
          isVerifying2FA.current = false;
          resolve();
          return;
        }

        console.log('✅ [LOGIN] Código enviado por email');

        // Usar setState de forma segura
        const authInfo = {
          email: data.email,
          password: data.password,
          whatsapp: profile.whatsapp,
        };
        
        console.log('💾 [LOGIN] Salvando pendingAuth');
        setPendingAuth(authInfo);
        
        // Esperar um pouco antes de mudar UI
        setTimeout(() => {
          console.log('🔓 [LOGIN] Ativando 2FA');
          setShow2FA(true);
          setLoading(false);
          
          toast({
            title: "Código enviado!",
            description: "Verifique seu email",
          });
          
          console.log('✅ [LOGIN] UI 2FA ativada com sucesso');
          resolve();
        }, 250);

      } catch (error: any) {
        console.error('❌ [LOGIN] Erro:', error);
        toast({
          title: "Erro ao fazer login",
          description: "Tente novamente",
          variant: "destructive",
        });
        setLoading(false);
        isVerifying2FA.current = false;
        resolve();
      }
    });
  };
  
  // Handler seguro que previne submit
  const handleLoginClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🖱️ [LOGIN] Botão clicado');
    
    // Validar manualmente
    const emailValue = (document.getElementById('email') as HTMLInputElement)?.value;
    const passwordValue = (document.getElementById('password') as HTMLInputElement)?.value;
    
    if (!emailValue || !passwordValue) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email e senha",
        variant: "destructive",
      });
      return;
    }
    
    await onSubmit({ email: emailValue, password: passwordValue });
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
      
      const fnName = verificationMethod === 'email' ? 'verify-email-code' : 'verify-whatsapp-code';
      const body = verificationMethod === 'email'
        ? { email: pendingAuth.email, whatsapp: pendingAuth.whatsapp, code: verificationCode }
        : { whatsapp: pendingAuth.whatsapp, code: verificationCode };

      const { data, error } = await supabase.functions.invoke(fnName, { body });

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
        // Senha incorreta: voltar para a tela de senha (o código continua válido)
        setShow2FA(false);
        setPendingAuth(null);
        setVerificationCode("");
        setVerifying(false);
        isVerifying2FA.current = false;
        toast({
          title: "Senha incorreta",
          description: "Código validado, mas a senha está incorreta. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Login 2FA completo!');

      // Atualizar last_login no profile (não aguardar)
      supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", authData.user!.id)
        .then(() => console.log('📝 last_login atualizado'));

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });

      // CRÍTICO: Limpar estados ANTES do redirect
      setShow2FA(false);
      setPendingAuth(null);
      setVerificationCode("");
      setVerifying(false);
      
      // Usar timeout pequeno para garantir que o toast aparece
      // E navigate ao invés de window.location para manter o estado
      setTimeout(() => {
        isVerifying2FA.current = false;
        hasRedirected.current = true;
        navigate('/dashboard', { replace: true });
      }, 100);

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
    setSendingEmail(false);
    setVerificationMethod('email');
    isVerifying2FA.current = false;
  };

  const handleSendByEmail = async () => {
    if (!pendingAuth) return;
    
    setSendingEmail(true);
    
    try {
      console.log('📧 Enviando código por email...');
      
      const { error } = await supabase.functions.invoke("send-email-verification", {
        body: { 
          email: pendingAuth.email,
          whatsapp: pendingAuth.whatsapp 
        },
      });

      if (error) {
        console.error('❌ Erro ao enviar email:', error);
        toast({
          title: "Erro ao enviar email",
          description: "Não foi possível enviar o código por email",
          variant: "destructive",
        });
        setSendingEmail(false);
        return;
      }

      setVerificationMethod('email');
      toast({
        title: "Código enviado por email!",
        description: `Verifique sua caixa de entrada: ${pendingAuth.email}`,
      });
      
    } catch (error) {
      console.error('❌ Erro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o código",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4 py-20">
        <Card className="relative z-10 max-w-md w-full bg-black/90 border-primary/30">
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
            <form onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }} className="space-y-4">
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
                    type="button"
                    onClick={handleLoginClick}
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
                    <h3 className="text-lg font-semibold text-white">Verificação 2FA</h3>
                    <p className="text-sm text-white/70">
                      Digite o código de 6 dígitos enviado {verificationMethod === 'email' ? 'por email' : 'via WhatsApp'}
                    </p>
                    <p className="text-sm text-primary font-medium">
                      {verificationMethod === 'email' ? pendingAuth?.email : pendingAuth?.whatsapp}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verification-code" className="text-white">Código</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        disabled={verifying}
                        className="bg-black/60 border-primary/30 text-white text-center text-xl tracking-widest"
                      />
                    </div>

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

                    {verificationMethod === 'whatsapp' && (
                      <div className="pt-2 border-t border-primary/20">
                        <p className="text-xs text-white/50 text-center mb-2">
                          Não recebeu o código no WhatsApp?
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSendByEmail}
                          disabled={sendingEmail}
                          className="w-full text-primary hover:text-primary hover:bg-primary/10 text-sm"
                        >
                          {sendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          📧 Enviar código por Email
                        </Button>
                      </div>
                    )}

                    {verificationMethod === 'email' && (
                      <div className="pt-2 border-t border-primary/20">
                        <p className="text-xs text-white/50 text-center mb-2">
                          Prefere receber pelo WhatsApp?
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setVerificationMethod('whatsapp')}
                          className="w-full text-primary hover:text-primary hover:bg-primary/10 text-sm"
                        >
                          📱 Voltar para WhatsApp
                        </Button>
                      </div>
                    )}
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
