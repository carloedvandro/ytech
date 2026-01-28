import { useState, useEffect, useCallback } from "react";
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
import { Loader2, CheckCircle2, AlertCircle, MessageCircle, Copy, Mail } from "lucide-react";

// Schema de validação
const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  whatsapp: z.string().regex(/^\d{11}$/, "WhatsApp deve ter 11 dígitos (DDD + número)"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  cep: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
});

type SignupForm = z.infer<typeof signupSchema>;

const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const referralCode = searchParams.get("ref");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cpfValidated, setCpfValidated] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  
  // Estados para verificação WhatsApp
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [waitingForCode, setWaitingForCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  
  // Número do WhatsApp de suporte da YTech
  const YTECH_WHATSAPP = "5511994869948"; // Formato: 55 + DDD + número
  const YTECH_WHATSAPP_DISPLAY = "(11) 99486-9948";

  // Clean corrupted data on mount
  useEffect(() => {
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
        console.log('🧹 Cleaned corrupted signup data on mount');
      } catch (error) {
        console.error('Error cleaning data:', error);
      }
    };

    cleanCorruptedData();
  }, []);

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

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Função para iniciar a espera pelo código
  const startWaitingForCode = async () => {
    if (!whatsapp || whatsapp.length !== 11) {
      toast({
        title: "WhatsApp inválido",
        description: "Digite os 11 dígitos do WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Registrar que este número está aguardando verificação
      const { error } = await supabase.functions.invoke("register-whatsapp-verification", {
        body: { whatsapp },
      });

      if (error) throw error;

      setWaitingForCode(true);
      toast({
        title: "Aguardando sua mensagem!",
        description: `Envie "Oi" para ${YTECH_WHATSAPP_DISPLAY}`,
      });

      // Iniciar polling para verificar se o código foi enviado
      const interval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('whatsapp_verifications')
            .select('code, verified')
            .eq('whatsapp', whatsapp)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data && data.code && !data.verified) {
            // Código foi gerado, parar polling
            clearInterval(interval);
            setPollingInterval(null);
            toast({
              title: "Código enviado!",
              description: "Digite o código que você recebeu no WhatsApp",
            });
          }
        } catch (err) {
          console.error('Erro no polling:', err);
        }
      }, 3000); // Verificar a cada 3 segundos

      setPollingInterval(interval);

      // Timeout de 5 minutos
      setTimeout(() => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
          setWaitingForCode(false);
          toast({
            title: "Tempo esgotado",
            description: "Tente novamente",
            variant: "destructive",
          });
        }
      }, 5 * 60 * 1000);

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar o código
  const verifyCode = async () => {
    const email = watch("email");

    if (verificationCode.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Digite os 6 dígitos do código",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      const fnName = verificationMethod === 'email' ? 'verify-email-code' : 'verify-whatsapp-code';
      const body = verificationMethod === 'email'
        ? { email, whatsapp, code: verificationCode }
        : { whatsapp, code: verificationCode };

      const { data, error } = await supabase.functions.invoke(fnName, { body });

      if (error) throw error;

      if (data.verified) {
        setWhatsappVerified(true);
        setWaitingForCode(false);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        toast({
          title: "WhatsApp verificado!",
          description: "Você pode continuar o cadastro",
        });
      } else {
        toast({
          title: "Código inválido",
          description: data.error || "Tente novamente",
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao verificar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Função para copiar número do WhatsApp
  const copyWhatsappNumber = () => {
    navigator.clipboard.writeText(YTECH_WHATSAPP);
    toast({
      title: "Número copiado!",
      description: "Cole no WhatsApp e envie a mensagem",
    });
  };

  // Mensagem específica para cadastro (chatbot vai identificar)
  const SIGNUP_MESSAGE = "Oi, estou me cadastrando";

  // Função para abrir WhatsApp diretamente
  const openWhatsapp = () => {
    const message = encodeURIComponent(SIGNUP_MESSAGE);
    window.open(`https://wa.me/${YTECH_WHATSAPP}?text=${message}`, '_blank');
  };

  // Função para enviar código por email
  const handleSendByEmail = async () => {
    const email = watch("email");
    
    if (!email || !whatsapp) {
      toast({
        title: "Erro",
        description: "Email e WhatsApp são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    setSendingEmail(true);
    
    try {
      console.log('📧 Enviando código por email no cadastro...');
      
      const { error } = await supabase.functions.invoke("send-email-verification", {
        body: { 
          email,
          whatsapp 
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
        description: `Verifique sua caixa de entrada: ${email}`,
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


  // Validar CPF
  const validateCPF = async () => {
    if (!cpf || cpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Digite os 11 dígitos do CPF",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-cpf", {
        body: { cpf },
      });

      if (error) throw error;

      if (data.valid) {
        setCpfValidated(true);
        toast({
          title: "CPF validado!",
          description: "CPF válido e disponível",
        });
      } else {
        toast({
          title: "CPF inválido",
          description: data.message || "CPF inválido ou já cadastrado",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao validar CPF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Buscar endereço pelo CEP
  const fetchAddressByCEP = async (cepValue: string) => {
    if (!cepValue || cepValue.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado",
          variant: "destructive",
        });
        return;
      }

      // Preencher automaticamente os campos
      setValue("rua", data.logradouro || "");
      setValue("bairro", data.bairro || "");
      setValue("cidade", data.localidade || "");
      setValue("estado", data.uf || "");

      toast({
        title: "Endereço encontrado!",
        description: "Dados preenchidos automaticamente",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setCepLoading(false);
    }
  };

  // Finalizar cadastro
  const onSubmit = async (data: SignupForm) => {
    if (!referralCode) {
      toast({
        title: "Código de indicação obrigatório",
        description: "Você precisa de um código de indicação para se cadastrar",
        variant: "destructive",
      });
      return;
    }

    if (!cpfValidated) {
      toast({
        title: "Valide o CPF",
        description: "Você precisa validar o CPF antes de continuar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Buscar referred_by pelo código (pode ser UUID ou username)
      let referrer;
      
      // Verificar se parece ser um UUID (contém hífens e tem 36 caracteres)
      const looksLikeUUID = referralCode.includes('-') && referralCode.length === 36;
      
      if (looksLikeUUID) {
        // Tentar primeiro como UUID
        const { data: referrerById } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", referralCode)
          .maybeSingle();

        if (referrerById) {
          referrer = referrerById;
        }
      }
      
      // Se não encontrou por UUID ou não parece UUID, tentar como username
      if (!referrer) {
        const { data: referrerByUsername } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", referralCode)
          .maybeSingle();

        referrer = referrerByUsername;
      }

      if (!referrer) {
        toast({
          title: "Código inválido",
          description: "Código de indicação não encontrado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Criar usuário no Supabase Auth
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

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // 3. Enviar mensagem de boas-vindas no WhatsApp
      try {
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
      } catch (whatsappError) {
        console.error("Erro ao enviar WhatsApp:", whatsappError);
        // Não bloqueia o cadastro se o WhatsApp falhar
      }

      // 4. Notificar o indicador direto (nível 1)
      try {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("full_name, whatsapp")
          .eq("id", referrer.id)
          .single();

        if (referrerProfile?.whatsapp) {
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
        }
      } catch (referralNotificationError) {
        console.error("Erro ao notificar indicador:", referralNotificationError);
        // Não bloqueia o cadastro se a notificação falhar
      }

      toast({
        title: "Cadastro realizado!",
        description: "Faça login para continuar",
      });

      // Redirecionar para login
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const isValid = await trigger(
      step === 1 ? ["fullName", "email", "password"] : 
      step === 2 ? ["whatsapp"] : 
      step === 3 ? ["cpf"] :
      ["cep", "rua", "numero", "bairro", "cidade", "estado"]
    );
    if (isValid) {
      // Verificar se WhatsApp foi verificado na etapa 2
      if (step === 2 && !whatsappVerified) {
        toast({
          title: "Verifique seu WhatsApp",
          description: "Você precisa verificar seu WhatsApp antes de continuar",
          variant: "destructive",
        });
        return;
      }
      if (step === 3 && !cpfValidated) return;
      setStep(step + 1);
    }
  };

  // Verificar se tem código de indicação
  if (!referralCode) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>
            Etapa {step} de 4 • Código: {referralCode.slice(0, 8)}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }} className="space-y-4">
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

            {/* Etapa 2: WhatsApp com Verificação */}
            {step === 2 && (
              <div className="space-y-4">
                {!whatsappVerified ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp (obrigatório)</Label>
                      <Input
                        id="whatsapp"
                        placeholder="11999999999"
                        maxLength={11}
                        {...register("whatsapp")}
                        disabled={waitingForCode}
                      />
                      {errors.whatsapp && (
                        <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
                      )}
                    </div>

                    {!waitingForCode ? (
                      <>
                        <Alert className="bg-primary/10 border-primary/30">
                          <MessageCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Para verificar seu WhatsApp:</strong>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                              <li>Clique em "Iniciar Verificação"</li>
                              <li>Envie a mensagem indicada para nosso WhatsApp</li>
                              <li>Você receberá um código de 6 dígitos</li>
                            </ol>
                          </AlertDescription>
                        </Alert>

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)}>
                            Voltar
                          </Button>
                          <Button 
                            type="button" 
                            className="w-full" 
                            onClick={startWaitingForCode}
                            disabled={loading || !whatsapp || whatsapp.length !== 11}
                          >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Iniciar Verificação
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Alert className="bg-green-500/10 border-green-500/30">
                          <MessageCircle className="h-4 w-4 text-green-500" />
                          <AlertDescription>
                            <strong className="text-green-600">Envie a mensagem para:</strong>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-lg font-bold">{YTECH_WHATSAPP_DISPLAY}</span>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={copyWhatsappNumber}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm mt-2 p-2 bg-white/50 rounded border">
                              <strong>Mensagem:</strong> "{SIGNUP_MESSAGE}"
                            </p>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="mt-2 w-full bg-green-500 text-white hover:bg-green-600"
                              onClick={openWhatsapp}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Abrir WhatsApp
                            </Button>
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <Label htmlFor="verification-code">Código de Verificação</Label>
                          <Input
                            id="verification-code"
                            placeholder="000000"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            className="text-center text-xl tracking-widest"
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            Digite o código de 6 dígitos que você recebeu
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full" 
                            onClick={() => {
                              setWaitingForCode(false);
                              setVerificationCode("");
                              setVerificationMethod('whatsapp');
                              if (pollingInterval) {
                                clearInterval(pollingInterval);
                                setPollingInterval(null);
                              }
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            className="w-full" 
                            onClick={verifyCode}
                            disabled={verifying || verificationCode.length !== 6}
                          >
                            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verificar Código
                          </Button>
                        </div>

                        {/* Opção de enviar por email */}
                        {verificationMethod === 'whatsapp' && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground text-center mb-2">
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
                              <Mail className="mr-2 h-4 w-4" />
                              Enviar código por Email
                            </Button>
                          </div>
                        )}

                        {verificationMethod === 'email' && (
                          <div className="pt-3 border-t border-border">
                            <Alert className="bg-blue-500/10 border-blue-500/30 mb-2">
                              <Mail className="h-4 w-4 text-blue-500" />
                              <AlertDescription>
                                <strong className="text-blue-600">Código enviado por email!</strong>
                                <p className="text-sm mt-1">Verifique sua caixa de entrada</p>
                              </AlertDescription>
                            </Alert>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setVerificationMethod('whatsapp')}
                              className="w-full text-muted-foreground hover:text-foreground text-sm"
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Voltar para WhatsApp
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Alert className="bg-green-500/10 border-green-500/30">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        <strong className="text-green-600">WhatsApp verificado!</strong>
                        <p className="text-sm mt-1">{whatsapp}</p>
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)}>
                        Voltar
                      </Button>
                      <Button type="button" className="w-full" onClick={nextStep}>
                        Continuar
                      </Button>
                    </div>
                  </>
                )}
              </div>
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
                  <Button 
                    type="button" 
                    className="w-full" 
                    disabled={loading}
                    onClick={async () => {
                      const formData = {
                        fullName: watch("fullName") || "",
                        email: watch("email") || "",
                        password: watch("password") || "",
                        whatsapp: watch("whatsapp") || "",
                        cpf: watch("cpf") || "",
                        cep: watch("cep") || "",
                        rua: watch("rua") || "",
                        numero: watch("numero") || "",
                        complemento: watch("complemento"),
                        bairro: watch("bairro") || "",
                        cidade: watch("cidade") || "",
                        estado: watch("estado") || "",
                      };
                      await onSubmit(formData);
                    }}
                  >
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
  );
};

export default Signup;
