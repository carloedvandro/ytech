import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// Schema de validação
const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  whatsapp: z.string().regex(/^\d{11}$/, "WhatsApp deve ter 11 dígitos (DDD + número)"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  verificationCode: z.string().length(6, "Código deve ter 6 dígitos"),
  cep: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
});

type SignupForm = z.infer<typeof signupSchema>;

// Componente de Debug separado que SEMPRE renderiza
const DebugPanel = ({ logs, step, whatsappVerified, cpfValidated, onClear }: {
  logs: string[];
  step: number;
  whatsappVerified: boolean;
  cpfValidated: boolean;
  onClear: () => void;
}) => {
  const [show, setShow] = useState(false);

  return (
    <>
      <div 
        onClick={() => setShow(!show)}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 999999,
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          border: '3px solid white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {show ? 'Fechar Depuração' : 'Ver Depuração'}
      </div>

      {show && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '10px',
          zIndex: 999999,
          backgroundColor: 'white',
          border: '4px solid #ef4444',
          borderRadius: '8px',
          padding: '16px',
          width: '90vw',
          maxWidth: '400px',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '16px', color: '#ef4444' }}>
            📊 Depuração do Sistema
          </h3>
          
          <div style={{ 
            marginBottom: '12px', 
            padding: '12px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div><strong>Step atual:</strong> {step}</div>
            <div><strong>WhatsApp verificado:</strong> {String(whatsappVerified)}</div>
            <div><strong>CPF validado:</strong> {String(cpfValidated)}</div>
            <div><strong>Total de logs:</strong> {logs.length}</div>
          </div>

          <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {logs.length === 0 ? (
              <p style={{ color: '#999' }}>Nenhum log ainda</p>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid #eee', 
                    paddingBottom: '4px',
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>

          <button
            onClick={onClear}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            🗑️ Limpar Logs
          </button>
        </div>
      )}
    </>
  );
};

const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const referralCode = searchParams.get("ref");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cpfValidated, setCpfValidated] = useState(false);
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState<string>("");
  const [cepLoading, setCepLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>(['🔧 Sistema de depuração iniciado']);
  const [hasError, setHasError] = useState(false);

  // Sistema de logging visual
  const addDebugLog = (message: string) => {
    try {
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `[${timestamp}] ${message}`;
      console.log(logMessage);
      setDebugLogs(prev => [...prev.slice(-30), logMessage]);
      
      // Salvar no localStorage para o GlobalDebugPanel
      try {
        const existingLogs = localStorage.getItem('debug-logs');
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        logs.push(logMessage);
        if (logs.length > 100) logs.shift();
        localStorage.setItem('debug-logs', JSON.stringify(logs));
      } catch (e) {
        console.error('Erro ao salvar log no localStorage:', e);
      }
    } catch (e) {
      console.error('Erro ao adicionar log:', e);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  const whatsapp = watch("whatsapp");
  const cpf = watch("cpf");
  const cep = watch("cep");

  // Log inicial
  useEffect(() => {
    addDebugLog('✅ Componente Signup montado');
    addDebugLog(`📍 Step inicial: ${step}`);
  }, []);

  // Detectar quando usuário volta do WhatsApp
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && codeSent && !whatsappVerified) {
        addDebugLog('👁️ Voltou do WhatsApp - mantendo estado do código');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [codeSent, whatsappVerified]);

  // Capturar erros globais
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addDebugLog(`💥 ERRO GLOBAL: ${event.message} em ${event.filename}:${event.lineno}`);
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addDebugLog(`💥 PROMISE REJECTION: ${event.reason}`);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Log de mudanças de step
  useEffect(() => {
    addDebugLog(`🔄 Step mudou para: ${step}`);
    addDebugLog(`📱 WhatsApp verificado: ${whatsappVerified}`);
    addDebugLog(`🆔 CPF validado: ${cpfValidated}`);
    addDebugLog(`📨 Código enviado: ${codeSent}`);
    addDebugLog(`⏰ Código expira: ${codeExpiry || 'N/A'}`);
    
    if (step === 2) {
      addDebugLog(`📍 RENDERIZANDO STEP 2`);
      addDebugLog(`  - codeSent: ${codeSent}`);
      addDebugLog(`  - whatsappVerified: ${whatsappVerified}`);
      addDebugLog(`  - whatsapp value: ${whatsapp || 'vazio'}`);
      addDebugLog(`  - loading: ${loading}`);
    }

    // Log para confirmar que o useEffect executou completamente
    addDebugLog(`✓ useEffect de step concluído`);
  }, [step, whatsappVerified, cpfValidated, codeSent, codeExpiry, whatsapp, loading]);

  // Validar CPF
  const validateCPF = async () => {
    if (!cpf || cpf.length !== 11) {
      addDebugLog('❌ CPF inválido - menos de 11 dígitos');
      toast({
        title: "CPF inválido",
        description: "Digite os 11 dígitos do CPF",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    addDebugLog(`🔍 Validando CPF: ${cpf}`);
    
    try {
      const { data, error } = await supabase.functions.invoke("validate-cpf", {
        body: { cpf },
      });

      if (error) {
        addDebugLog(`❌ Erro na validação: ${error.message}`);
        throw error;
      }

      if (data.valid) {
        setCpfValidated(true);
        addDebugLog('✅ CPF validado com sucesso!');
        toast({
          title: "CPF validado!",
          description: "CPF válido e disponível",
        });
      } else {
        addDebugLog(`❌ CPF inválido ou já cadastrado: ${data.message}`);
        toast({
          title: "CPF inválido",
          description: data.message || "CPF inválido ou já cadastrado",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      addDebugLog(`💥 Erro ao validar CPF: ${error.message}`);
      toast({
        title: "Erro ao validar CPF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      addDebugLog('✓ Validação de CPF finalizada');
    }
  };

  // Enviar código WhatsApp
  const sendWhatsAppCode = async () => {
    if (!whatsapp || whatsapp.length !== 11) {
      addDebugLog(`❌ WhatsApp inválido: ${whatsapp || 'vazio'}`);
      toast({
        title: "WhatsApp inválido",
        description: "Digite os 11 dígitos (DDD + número)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    addDebugLog(`📤 Enviando código para WhatsApp: ${whatsapp}`);
    
    try {
      const response = await supabase.functions.invoke("send-whatsapp-verification", {
        body: { whatsapp, checkDuplicate: true },
      });

      addDebugLog(`📦 Resposta recebida - error: ${response.error ? 'sim' : 'não'}, data: ${JSON.stringify(response.data)}`);

      // Se houver erro na requisição
      if (response.error) {
        addDebugLog(`❌ Error object: ${JSON.stringify(response.error)}`);
        
        // Tentar pegar a mensagem do corpo da resposta
        let errorMessage = "Erro ao enviar código de verificação";
        
        // O erro pode vir no data quando é um erro HTTP
        if (response.data && response.data.error) {
          errorMessage = response.data.error;
          addDebugLog(`📝 Mensagem de erro do backend: ${errorMessage}`);
        } else if (response.error.message) {
          errorMessage = response.error.message;
        }
        
        toast({
          title: "Não foi possível enviar o código",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Verificar se a resposta contém erro mesmo sem o objeto error
      if (response.data && response.data.error) {
        addDebugLog(`❌ Data contém erro: ${response.data.error}`);
        toast({
          title: "Não foi possível enviar o código",
          description: response.data.error,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      addDebugLog('✅ Código enviado com sucesso!');
      setCodeSent(true);
      setCodeExpiry(response.data.expiresAt);
      addDebugLog(`⏰ Código expira em: ${response.data.expiresAt}`);
      
      toast({
        title: "✅ Código enviado!",
        description: "Verifique seu WhatsApp e insira o código de 6 dígitos",
        duration: 5000,
      });
    } catch (error: any) {
      addDebugLog(`💥 Catch error no envio: ${error.message}`);
      addDebugLog(`💥 Error stack: ${error.stack?.substring(0, 200) || 'N/A'}`);
      toast({
        title: "Erro ao processar solicitação",
        description: error.message || "Erro desconhecido. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      addDebugLog('✓ sendWhatsAppCode finalizado');
    }
  };

  // Verificar código WhatsApp
  const verifyWhatsAppCode = async (code: string) => {
    setLoading(true);
    addDebugLog(`🔐 Verificando código: ${code}`);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-code", {
        body: { whatsapp, code },
      });

      if (error) {
        addDebugLog(`❌ Erro na verificação: ${error.message}`);
        throw error;
      }

      if (data.verified) {
        setWhatsappVerified(true);
        addDebugLog('✅ WhatsApp verificado com sucesso!');
        toast({
          title: "WhatsApp verificado!",
          description: "Número confirmado com sucesso",
        });
        addDebugLog('➡️ Avançando para step 3');
        setStep(3);
      } else {
        addDebugLog(`❌ Código incorreto: ${data.error || 'desconhecido'}`);
        toast({
          title: "Código incorreto",
          description: data.error || "Código inválido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      addDebugLog(`💥 Erro ao verificar código: ${error.message}`);
      toast({
        title: "Erro ao verificar código",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      addDebugLog('✓ Verificação de código finalizada');
    }
  };

  // Buscar endereço pelo CEP
  const fetchAddressByCEP = async (cepValue: string) => {
    if (!cepValue || cepValue.length !== 8) return;

    setCepLoading(true);
    addDebugLog(`🔍 Buscando CEP: ${cepValue}`);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
      const data = await response.json();

      if (data.erro) {
        addDebugLog('❌ CEP não encontrado');
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado",
          variant: "destructive",
        });
        return;
      }

      setValue("rua", data.logradouro || "");
      setValue("bairro", data.bairro || "");
      setValue("cidade", data.localidade || "");
      setValue("estado", data.uf || "");
      addDebugLog(`✅ Endereço encontrado: ${data.logradouro}, ${data.localidade}`);

      toast({
        title: "Endereço encontrado!",
        description: "Dados preenchidos automaticamente",
      });
    } catch (error) {
      addDebugLog(`💥 Erro ao buscar CEP: ${error}`);
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setCepLoading(false);
      addDebugLog('✓ Busca de CEP finalizada');
    }
  };

  // Finalizar cadastro
  const onSubmit = async (data: SignupForm) => {
    if (!referralCode) {
      addDebugLog('❌ Código de indicação ausente');
      toast({
        title: "Código de indicação obrigatório",
        description: "Você precisa de um código de indicação para se cadastrar",
        variant: "destructive",
      });
      return;
    }

    if (!cpfValidated) {
      addDebugLog('❌ CPF não validado');
      toast({
        title: "Valide o CPF",
        description: "Você precisa validar o CPF antes de continuar",
        variant: "destructive",
      });
      return;
    }

    if (!whatsappVerified) {
      addDebugLog('❌ WhatsApp não verificado');
      toast({
        title: "Verifique o WhatsApp",
        description: "Você precisa verificar o WhatsApp antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    addDebugLog('🚀 Iniciando cadastro final...');
    
    try {
      // 1. Buscar referred_by pelo código
      let referrer;
      const looksLikeUUID = referralCode.includes('-') && referralCode.length === 36;
      
      if (looksLikeUUID) {
        const { data: referrerById } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", referralCode)
          .maybeSingle();

        if (referrerById) referrer = referrerById;
      }
      
      if (!referrer) {
        const { data: referrerByUsername } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", referralCode)
          .maybeSingle();

        referrer = referrerByUsername;
      }

      if (!referrer) {
        addDebugLog(`❌ Código de indicação não encontrado: ${referralCode}`);
        toast({
          title: "Código inválido",
          description: "Código de indicação não encontrado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      addDebugLog(`✅ Indicador encontrado: ${referrer.id}`);

      // 2. Criar usuário no Supabase Auth
      addDebugLog('📝 Criando usuário no Auth...');
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
            cpf: data.cpf,
            whatsapp: data.whatsapp,
            referred_by: referrer.id,
            address: {
              cep: data.cep,
              rua: data.rua,
              numero: data.numero,
              complemento: data.complemento || "",
              bairro: data.bairro,
              cidade: data.cidade,
              estado: data.estado,
            }
          }
        }
      });

      if (signUpError) {
        addDebugLog(`❌ Erro ao criar usuário: ${signUpError.message}`);
        throw signUpError;
      }

      if (!authData.user) {
        addDebugLog('❌ Usuário não foi criado');
        throw new Error('Erro ao criar usuário');
      }

      addDebugLog(`✅ Usuário criado: ${authData.user.id}`);

      // 3. Enviar mensagem de boas-vindas no WhatsApp
      try {
        addDebugLog('📱 Enviando mensagem de boas-vindas...');
        await supabase.functions.invoke("send-whatsapp-notification", {
          body: {
            whatsapp: data.whatsapp,
            messageType: "welcome",
            data: {
              name: data.fullName,
              email: data.email,
              whatsapp: data.whatsapp,
              cpf: data.cpf,
              loginUrl: window.location.origin + "/login",
            },
            userId: authData.user.id,
          },
        });
        addDebugLog('✅ Mensagem de boas-vindas enviada');
      } catch (whatsappError) {
        addDebugLog(`⚠️ Erro ao enviar WhatsApp de boas-vindas: ${whatsappError}`);
      }

      // 4. Notificar o indicador
      try {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("full_name, whatsapp")
          .eq("id", referrer.id)
          .single();

        if (referrerProfile?.whatsapp) {
          addDebugLog('📱 Notificando indicador...');
          await supabase.functions.invoke("send-whatsapp-notification", {
            body: {
              whatsapp: referrerProfile.whatsapp,
              messageType: "new_referral",
              data: {
                referrerName: referrerProfile.full_name,
                newUserName: data.fullName,
                newUserEmail: data.email,
                newUserWhatsapp: data.whatsapp,
              },
              userId: referrer.id,
            },
          });
          addDebugLog('✅ Indicador notificado');
        }
      } catch (referralNotificationError) {
        addDebugLog(`⚠️ Erro ao notificar indicador: ${referralNotificationError}`);
      }

      addDebugLog('🎉 Cadastro concluído com sucesso!');
      toast({
        title: "Cadastro realizado!",
        description: "Faça login para continuar",
      });

      setTimeout(() => {
        addDebugLog('🔄 Redirecionando para login...');
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      addDebugLog(`💥 ERRO FATAL no cadastro: ${error.message}`);
      console.error('Signup error:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      addDebugLog('✓ onSubmit finalizado');
    }
  };

  const nextStep = async () => {
    try {
      addDebugLog(`🚀 nextStep chamado - step atual: ${step}`);
      addDebugLog(`📊 Estados atuais:`);
      addDebugLog(`  - whatsappVerified: ${whatsappVerified}`);
      addDebugLog(`  - cpfValidated: ${cpfValidated}`);
      addDebugLog(`  - codeSent: ${codeSent}`);
      addDebugLog(`  - loading: ${loading}`);
      
      const fieldsToValidate = (
        step === 1 ? ["fullName", "email", "password"] : 
        step === 2 ? ["whatsapp"] : 
        step === 3 ? ["cpf"] :
        ["cep", "rua", "numero", "bairro", "cidade", "estado"]
      ) as (keyof SignupForm)[];
      
      addDebugLog(`🔍 Validando campos: ${fieldsToValidate.join(', ')}`);
      const isValid = await trigger(fieldsToValidate);
      addDebugLog(`✅ Validação resultado: ${isValid}`);
      
      if (isValid) {
        if (step === 2 && !whatsappVerified) {
          addDebugLog('⚠️ Bloqueado: WhatsApp não verificado');
          return;
        }
        if (step === 3 && !cpfValidated) {
          addDebugLog('⚠️ Bloqueado: CPF não validado');
          return;
        }
        
        const nextStepNum = step + 1;
        addDebugLog(`➡️ Mudando step de ${step} para ${nextStepNum}`);
        addDebugLog(`🔧 Chamando setStep(${nextStepNum})...`);
        setStep(nextStepNum);
        addDebugLog(`✓ setStep chamado! Aguardando re-render...`);
      } else {
        addDebugLog(`❌ Validação falhou`);
        Object.keys(errors).forEach(key => {
          addDebugLog(`  - Erro em ${key}: ${errors[key as keyof typeof errors]?.message}`);
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      addDebugLog(`💥 ERRO em nextStep: ${errorMsg}`);
      addDebugLog(`Stack: ${error?.stack?.substring(0, 200) || 'N/A'}`);
      setHasError(true);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao avançar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Verificar se tem código de indicação
  if (!referralCode) {
    return (
      <>
        <DebugPanel 
          logs={debugLogs}
          step={step}
          whatsappVerified={whatsappVerified}
          cpfValidated={cpfValidated}
          onClear={() => {
            setDebugLogs(['🗑️ Logs limpos']);
            addDebugLog('Sistema reiniciado');
          }}
        />
        <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                Código de Indicação Obrigatório
              </CardTitle>
              <CardDescription>
                Para se cadastrar, você precisa de um código de indicação válido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Entre em contato com quem te indicou para obter o link correto de cadastro.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                Voltar para o início
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Se houver erro, mostrar mensagem
  if (hasError) {
    addDebugLog('⚠️ Componente em modo de erro');
  }

  return (
    <>
      <DebugPanel 
        logs={debugLogs}
        step={step}
        whatsappVerified={whatsappVerified}
        cpfValidated={cpfValidated}
        onClear={() => {
          setDebugLogs(['🗑️ Logs limpos']);
          addDebugLog('Sistema reiniciado');
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Cadastro de Novo Revendedor</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para se cadastrar (Etapa {step} de 5)
            </CardDescription>
            <div className="flex justify-between items-center mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full mx-1 transition-all ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Etapa 1: Dados Pessoais */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome completo"
                      {...register("fullName")}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <Button type="button" className="w-full" onClick={nextStep}>
                    Continuar
                  </Button>
                </>
              )}

              {/* Etapa 2: WhatsApp */}
              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      placeholder="11999999999"
                      maxLength={11}
                      {...register("whatsapp")}
                      disabled={whatsappVerified}
                    />
                    {errors.whatsapp && (
                      <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
                    )}
                  </div>

                  {/* Sempre renderiza o container, mas muda o conteúdo */}
                  <div className="space-y-4">
                    {!codeSent && !whatsappVerified && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={sendWhatsAppCode}
                        disabled={loading || !whatsapp || whatsapp.length !== 11}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Código de Verificação
                      </Button>
                    )}

                    {codeSent && !whatsappVerified && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="verificationCode">Código de Verificação</Label>
                          <Input
                            id="verificationCode"
                            placeholder="000000"
                            maxLength={6}
                            {...register("verificationCode")}
                          />
                          {errors.verificationCode && (
                            <p className="text-sm text-destructive">{errors.verificationCode.message}</p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          onClick={() => verifyWhatsAppCode(watch("verificationCode"))}
                          disabled={loading || !watch("verificationCode") || watch("verificationCode").length !== 6}
                        >
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Verificar Código
                        </Button>
                      </div>
                    )}

                    {whatsappVerified && (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>WhatsApp verificado com sucesso!</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)}>
                      Voltar
                    </Button>
                    {whatsappVerified && (
                      <Button type="button" className="w-full" onClick={nextStep}>
                        Continuar
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Etapa 3: CPF */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="12345678900"
                      maxLength={11}
                      {...register("cpf")}
                      disabled={cpfValidated}
                    />
                    {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
                  </div>

                  {!cpfValidated && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={validateCPF}
                      disabled={loading || !cpf || cpf.length !== 11}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Validar CPF
                    </Button>
                  )}

                  {cpfValidated && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>CPF validado com sucesso!</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setStep(2)}>
                      Voltar
                    </Button>
                    {cpfValidated && (
                      <Button type="button" className="w-full" onClick={nextStep}>
                        Continuar
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Etapa 4: Endereço */}
              {step === 4 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      placeholder="12345678"
                      maxLength={8}
                      {...register("cep")}
                      onBlur={(e) => fetchAddressByCEP(e.target.value)}
                    />
                    {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
                    {cepLoading && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Buscando endereço...
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rua">Rua</Label>
                    <Input
                      id="rua"
                      placeholder="Nome da rua"
                      {...register("rua")}
                    />
                    {errors.rua && <p className="text-sm text-destructive">{errors.rua.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        placeholder="123"
                        {...register("numero")}
                      />
                      {errors.numero && <p className="text-sm text-destructive">{errors.numero.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        placeholder="Apto 45"
                        {...register("complemento")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      placeholder="Nome do bairro"
                      {...register("bairro")}
                    />
                    {errors.bairro && <p className="text-sm text-destructive">{errors.bairro.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        placeholder="Cidade"
                        {...register("cidade")}
                      />
                      {errors.cidade && <p className="text-sm text-destructive">{errors.cidade.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        placeholder="SP"
                        maxLength={2}
                        {...register("estado")}
                      />
                      {errors.estado && <p className="text-sm text-destructive">{errors.estado.message}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setStep(3)}>
                      Voltar
                    </Button>
                    <Button type="button" className="w-full" onClick={nextStep}>
                      Continuar
                    </Button>
                  </div>
                </>
              )}

              {/* Etapa 5: Confirmação */}
              {step === 5 && (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Todos os dados foram validados! Clique em "Finalizar Cadastro" para continuar.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Nome:</strong> {watch("fullName")}
                    </p>
                    <p>
                      <strong>Email:</strong> {watch("email")}
                    </p>
                    <p>
                      <strong>WhatsApp:</strong> {watch("whatsapp")}
                    </p>
                    <p>
                      <strong>CPF:</strong> {watch("cpf")}
                    </p>
                    <p>
                      <strong>Endereço:</strong> {watch("rua")}, {watch("numero")} - {watch("bairro")}, {watch("cidade")}/{watch("estado")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setStep(4)}>
                      Voltar
                    </Button>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Finalizar Cadastro
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Signup;
