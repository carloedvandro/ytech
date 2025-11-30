import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  whatsapp: z.string().regex(/^\d{11}$/, "WhatsApp: 11 dígitos (DDD + número)"),
  cpf: z.string().regex(/^\d{11}$/, "CPF: 11 dígitos"),
  verificationCode: z.string().length(6, "Código: 6 dígitos"),
  cep: z.string().regex(/^\d{8}$/, "CEP: 8 dígitos"),
  rua: z.string().min(1, "Rua obrigatória"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "Estado: 2 letras"),
});

type SignupForm = z.infer<typeof signupSchema>;

export const SignupSimple = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const referralCode = searchParams.get("ref");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cpfValidated, setCpfValidated] = useState(false);
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

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

  const validateCPF = async () => {
    if (!cpf || cpf.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Digite 11 dígitos",
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
          title: "CPF validado",
          description: "CPF válido",
        });
      } else {
        toast({
          title: "CPF inválido",
          description: data.message || "CPF inválido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppCode = async () => {
    if (!whatsapp || whatsapp.length !== 11) {
      toast({
        title: "WhatsApp inválido",
        description: "Digite 11 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log('📤 [SIMPLE] Enviando código:', whatsapp);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-verification", {
        body: { whatsapp, checkDuplicate: true },
      });

      if (error) {
        const errorMessage = error.context?.error || error.message || "";
        
        if (errorMessage.toLowerCase().includes("já cadastrado") || 
            errorMessage.toLowerCase().includes("já existe")) {
          toast({
            title: "WhatsApp já cadastrado",
            description: `Número ${whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")} já registrado`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível enviar código",
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      console.log('✅ [SIMPLE] Código enviado');
      
      setCodeSent(true);
      setLoading(false);
      
      toast({
        title: "Código enviado",
        description: `Verifique WhatsApp ${whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}`,
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
          title: "WhatsApp verificado",
          description: "Número confirmado",
        });
        setStep(3);
      } else {
        toast({
          title: "Código incorreto",
          description: data.error || "Inválido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressByCEP = async (cepValue: string) => {
    if (!cepValue || cepValue.length !== 8) return;

    setLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setValue("rua", data.logradouro || "");
      setValue("bairro", data.bairro || "");
      setValue("cidade", data.localidade || "");
      setValue("estado", data.uf || "");

      toast({
        title: "Endereço encontrado",
        description: "Dados preenchidos",
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SignupForm) => {
    if (!referralCode) {
      toast({
        title: "Código obrigatório",
        description: "Código de indicação necessário",
        variant: "destructive",
      });
      return;
    }

    if (!cpfValidated || !whatsappVerified) {
      toast({
        title: "Validação pendente",
        description: "Valide CPF e WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
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
        toast({
          title: "Código inválido",
          description: "Indicação não encontrada",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName,
            cpf: data.cpf,
            whatsapp: data.whatsapp,
            referred_by: referrer.id,
          },
        },
      });

      if (signUpError) throw signUpError;

      await supabase
        .from("profiles")
        .update({
          metadata: {
            address: {
              cep: data.cep,
              rua: data.rua,
              numero: data.numero,
              complemento: data.complemento || "",
              bairro: data.bairro,
              cidade: data.cidade,
              estado: data.estado,
            },
          },
        })
        .eq("id", authData.user!.id);

      toast({
        title: "Cadastro realizado",
        description: "Faça login",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Erro",
        description: "Tente novamente",
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

  if (!referralCode) {
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
          padding: '24px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ff4444', marginBottom: '16px' }}>Código Obrigatório</h2>
          <p style={{ color: '#999', marginBottom: '24px' }}>
            Você precisa de um código de indicação
          </p>
          <button
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
        </div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#222',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#00ffff',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
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
        <h2 style={{ color: '#fff', marginBottom: '8px' }}>Criar Conta</h2>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>
          Etapa {step} de 5
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {step === 1 && (
            <>
              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Nome Completo</label>
                <input {...register("fullName")} style={inputStyle} placeholder="Seu nome" />
                {errors.fullName && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.fullName.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Email</label>
                <input type="email" {...register("email")} style={inputStyle} placeholder="seu@email.com" />
                {errors.email && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.email.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Senha</label>
                <input type="password" {...register("password")} style={inputStyle} placeholder="Mínimo 6 caracteres" />
                {errors.password && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.password.message}</p>}
              </div>

              <button type="button" onClick={nextStep} style={buttonStyle}>Continuar</button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>WhatsApp</label>
                <input 
                  {...register("whatsapp")} 
                  maxLength={11} 
                  style={inputStyle} 
                  placeholder="11999999999"
                  disabled={whatsappVerified || codeSent}
                />
                {errors.whatsapp && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.whatsapp.message}</p>}
                <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                  {codeSent ? '✅ Código enviado' : 'DDD + número'}
                </p>
              </div>

              {!codeSent && !whatsappVerified && (
                <button
                  type="button"
                  onClick={sendWhatsAppCode}
                  disabled={loading || !whatsapp || whatsapp.length !== 11}
                  style={{
                    ...buttonStyle,
                    opacity: (loading || !whatsapp || whatsapp.length !== 11) ? 0.6 : 1,
                    cursor: (loading || !whatsapp || whatsapp.length !== 11) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar Código'}
                </button>
              )}

              {codeSent && !whatsappVerified && (
                <>
                  <div>
                    <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Código Verificação</label>
                    <input {...register("verificationCode")} maxLength={6} style={inputStyle} placeholder="000000" />
                    {errors.verificationCode && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.verificationCode.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => verifyWhatsAppCode(watch("verificationCode"))}
                    disabled={loading}
                    style={{
                      ...buttonStyle,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Verificando...' : 'Verificar'}
                  </button>
                </>
              )}

              {whatsappVerified && (
                <button type="button" onClick={nextStep} style={buttonStyle}>Continuar</button>
              )}

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'transparent',
                  color: '#00ffff',
                  border: '1px solid #00ffff'
                }}
              >
                Voltar
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>CPF</label>
                <input {...register("cpf")} maxLength={11} style={inputStyle} placeholder="11122233344" disabled={cpfValidated} />
                {errors.cpf && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.cpf.message}</p>}
              </div>

              {!cpfValidated && (
                <button
                  type="button"
                  onClick={validateCPF}
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Validando...' : 'Validar CPF'}
                </button>
              )}

              {cpfValidated && (
                <button type="button" onClick={nextStep} style={buttonStyle}>Continuar</button>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'transparent',
                  color: '#00ffff',
                  border: '1px solid #00ffff'
                }}
              >
                Voltar
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>CEP</label>
                <input 
                  {...register("cep")} 
                  maxLength={8} 
                  style={inputStyle} 
                  placeholder="12345678"
                  onBlur={(e) => fetchAddressByCEP(e.target.value)}
                />
                {errors.cep && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.cep.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Rua</label>
                <input {...register("rua")} style={inputStyle} />
                {errors.rua && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.rua.message}</p>}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Número</label>
                  <input {...register("numero")} style={inputStyle} />
                  {errors.numero && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.numero.message}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Compl.</label>
                  <input {...register("complemento")} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Bairro</label>
                <input {...register("bairro")} style={inputStyle} />
                {errors.bairro && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.bairro.message}</p>}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 3 }}>
                  <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>Cidade</label>
                  <input {...register("cidade")} style={inputStyle} />
                  {errors.cidade && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.cidade.message}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#fff', marginBottom: '8px' }}>UF</label>
                  <input {...register("estado")} maxLength={2} style={inputStyle} />
                  {errors.estado && <p style={{ color: '#ff4444', fontSize: '14px', marginTop: '4px' }}>{errors.estado.message}</p>}
                </div>
              </div>

              <button type="button" onClick={nextStep} style={buttonStyle}>Continuar</button>
              
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'transparent',
                  color: '#00ffff',
                  border: '1px solid #00ffff'
                }}
              >
                Voltar
              </button>
            </>
          )}

          {step === 5 && (
            <>
              <div style={{ color: '#fff', marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '8px' }}>Confirme seus dados</h3>
                <p style={{ fontSize: '14px', color: '#999' }}>Revise antes de finalizar</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonStyle,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                style={{
                  ...buttonStyle,
                  backgroundColor: 'transparent',
                  color: '#00ffff',
                  border: '1px solid #00ffff'
                }}
              >
                Voltar
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
