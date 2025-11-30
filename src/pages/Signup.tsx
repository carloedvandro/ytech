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

  // Detectar quando usuário volta do WhatsApp (apenas quando código foi enviado)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && codeSent && !whatsappVerified) {
        console.log('👁️ Voltou do WhatsApp - mantendo estado do código');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [codeSent, whatsappVerified]);

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

  // Enviar código WhatsApp
  const sendWhatsAppCode = async () => {
    if (!whatsapp || whatsapp.length !== 11) {
      toast({
        title: "WhatsApp inválido",
        description: "Digite os 11 dígitos (DDD + número)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('📤 Enviando código de verificação para:', whatsapp);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-verification", {
        body: { whatsapp, checkDuplicate: true },
      });

      if (error) {
        console.error('❌ Erro ao enviar código:', error);
        // Supabase retorna FunctionsHttpError com context
        const errorMessage = error.context?.error || error.message || "Erro ao enviar código de verificação";
        throw new Error(errorMessage);
      }

      console.log('✅ Código enviado com sucesso!');
      console.log('🔍 User Agent:', navigator.userAgent);
      console.log('🔍 Estado ANTES:', { codeSent, whatsappVerified, step });
      
      toast({
        title: "Código enviado!",
        description: "Verifique seu WhatsApp",
      });

      // Forçar atualização síncrona para Chrome Android
      setCodeExpiry(data.expiresAt);
      
      // Usar callback para garantir atualização correta
      setCodeSent((prev) => {
        console.log('🔍 Atualizando codeSent de', prev, 'para true');
        return true;
      });
      
      // Aguardar um frame de animação para Chrome processar
      await new Promise(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      }));
      
      console.log('✅ Estado atualizado - codeSent:', true);
    } catch (error: any) {
      console.error('❌ Erro ao enviar código:', error);
      toast({
        title: "Erro ao enviar código",
        description: error.message || "Erro desconhecido ao processar solicitação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar código WhatsApp
  const verifyWhatsAppCode = async (code: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-code", {
        body: { whatsapp, code },
      });

      if (error) throw error;

      if (data.verified) {
        setWhatsappVerified(true);
        toast({
          title: "WhatsApp verificado!",
          description: "Número confirmado com sucesso",
        });
        setStep(3);
      } else {
        toast({
          title: "Código incorreto",
          description: data.error || "Código inválido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao verificar código",
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

    if (!whatsappVerified) {
      toast({
        title: "Verifique o WhatsApp",
        description: "Você precisa verificar o WhatsApp antes de continuar",
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
      if (step === 2 && !whatsappVerified) return;
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
            Etapa {step} de 5 • Código: {referralCode.slice(0, 8)}...
          </CardDescription>
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
              <div key="step-2-whatsapp" style={{ minHeight: '200px' }}>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    placeholder="11999999999"
                    maxLength={11}
                    {...register("whatsapp")}
                    disabled={whatsappVerified || codeSent}
                  />
                  {errors.whatsapp && (
                    <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {codeSent ? '✅ Código enviado' : 'Digite seu WhatsApp com DDD'}
                  </p>
                </div>

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
                  <div key="verification-code-section" style={{ minHeight: '150px' }}>
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
  );
};

export default Signup;
