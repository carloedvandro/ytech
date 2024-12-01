import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RegisterForm, RegisterFormData } from "@/components/client/RegisterForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: RegisterFormData) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Check if custom_id already exists
      const { data: existingCustomId, error: customIdError } = await supabase
        .from('profiles')
        .select('id')
        .eq('custom_id', values.customId)
        .maybeSingle();

      if (customIdError) {
        throw new Error("Erro ao verificar ID personalizado");
      }

      if (existingCustomId) {
        toast({
          title: "Erro",
          description: "Este ID personalizado já está em uso",
          variant: "destructive",
        });
        return;
      }

      // Check referral ID if provided
      let sponsorId = null;
      if (values.referralId) {
        const { data: sponsor, error: sponsorError } = await supabase
          .from('profiles')
          .select('id')
          .eq('custom_id', values.referralId)
          .maybeSingle();

        if (sponsorError) {
          throw new Error("Erro ao verificar ID de indicação");
        }

        if (!sponsor) {
          toast({
            title: "Erro",
            description: "ID de indicação inválido",
            variant: "destructive",
          });
          return;
        }

        sponsorId = sponsor.id;
      }

      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast({
            title: "Erro",
            description: "Este email já está cadastrado",
            variant: "destructive",
          });
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      // Update profile with additional information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: values.fullName,
          document_id: values.cpf,
          custom_id: values.customId,
          sponsor_id: sponsorId,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        throw profileError;
      }

      toast({
        title: "Sucesso",
        description: "Conta criada com sucesso! Você já pode fazer login.",
      });

      navigate("/client/login");
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto p-4">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Criar Conta</h1>
          <p className="text-gray-500">
            Preencha os dados abaixo para criar sua conta
          </p>
        </div>
        <RegisterForm onSubmit={onSubmit} />
      </div>
    </div>
  );
}