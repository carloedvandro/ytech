import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginSimple = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ email: string; password: string; whatsapp: string } | null>(null);

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
      console.log('🔑 [SIMPLE] Buscando usuário...');
      
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, whatsapp")
        .eq("email", data.email)
        .limit(1);

      if (profileError || !profiles || profiles.length === 0) {
        toast({
          title: "Erro",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        setLoading(false);
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
        return;
      }

      console.log('📱 [SIMPLE] Enviando código...');

      const { error: sendError } = await supabase.functions.invoke("send-whatsapp-verification", {
        body: { whatsapp: profile.whatsapp },
      });

      if (sendError) {
        toast({
          title: "Erro",
          description: "Não foi possível enviar código",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('✅ [SIMPLE] Código enviado');

      setPendingAuth({
        email: data.email,
        password: data.password,
        whatsapp: profile.whatsapp,
      });
      
      setLoading(false);
      setShow2FA(true);

      toast({
        title: "Código enviado",
        description: "Verifique seu WhatsApp",
      });

    } catch (error: any) {
      console.error('❌ [SIMPLE] Erro:', error);
      toast({
        title: "Erro",
        description: "Tente novamente",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!pendingAuth || verificationCode.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Digite 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    
    try {
      console.log('🔐 [SIMPLE] Verificando código...');
      
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-code", {
        body: { whatsapp: pendingAuth.whatsapp, code: verificationCode },
      });

      if (error && !data) {
        toast({
          title: "Erro de conexão",
          description: "Tente novamente",
          variant: "destructive",
        });
        setVerificationCode("");
        setVerifying(false);
        return;
      }

      if (data && !data.verified) {
        toast({
          title: "Código inválido",
          description: data.error || "Tente novamente",
          variant: "destructive",
        });
        setVerificationCode("");
        setVerifying(false);
        return;
      }

      console.log('✅ [SIMPLE] Fazendo login...');

      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: pendingAuth.email,
        password: pendingAuth.password,
      });

      if (loginError) throw loginError;

      await supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", authData.user!.id);

      toast({
        title: "Login realizado",
        description: "Bem-vindo",
      });

      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error('❌ [SIMPLE] Erro ao verificar:', error);
      toast({
        title: "Erro",
        description: "Tente novamente",
        variant: "destructive",
      });
      setVerifying(false);
      setVerificationCode("");
    }
  };

  const handleCancel = () => {
    setShow2FA(false);
    setPendingAuth(null);
    setVerificationCode("");
    setLoading(false);
    setVerifying(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#000',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: '#111',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '24px'
      }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1 style={{ color: '#00ffff', fontSize: '28px', marginBottom: '8px' }}>YTech</h1>
          <p style={{ color: '#999', fontSize: '14px' }}>Yrwen Technology</p>
        </div>

        <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Login</h2>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>Entre com suas credenciais</p>

        {!show2FA ? (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Email</label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#222',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
              {errors.email && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Senha</label>
              <input
                id="password"
                type="password"
                placeholder="Sua senha"
                {...register("password")}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#222',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
              {errors.password && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#00ffff',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Aguarde...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#00ffff',
                border: '1px solid #00ffff',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Voltar
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>Verificação 2FA</h3>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '8px' }}>Digite o código de 6 dígitos</p>
              <p style={{ color: '#00ffff', fontSize: '14px' }}>{pendingAuth?.whatsapp}</p>
            </div>

            <div>
              <label htmlFor="code" style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Código</label>
              <input
                id="code"
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={verifying}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#222',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '8px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCancel}
                disabled={verifying}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: '#00ffff',
                  border: '1px solid #00ffff',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: verifying ? 'not-allowed' : 'pointer',
                  opacity: verifying ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verifying || verificationCode.length !== 6}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#00ffff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (verifying || verificationCode.length !== 6) ? 'not-allowed' : 'pointer',
                  opacity: (verifying || verificationCode.length !== 6) ? 0.6 : 1
                }}
              >
                {verifying ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
