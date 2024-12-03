import { supabase } from "@/integrations/supabase/client";
import { isValidEmail } from "@/utils/validation/emailValidation";
import { isValidCPF } from "@/utils/validation/cpfValidation";
import { log } from "@/utils/logging/userLogger";

export type CreateUserData = {
  email: string;
  password: string;
  fullName: string;
  cpf: string;
  customId: string;
  sponsorCustomId?: string;
};

export const createUser = async (data: CreateUserData) => {
  // Validate input data
  if (!isValidEmail(data.email)) {
    throw new Error("Email inválido");
  }
  if (!isValidCPF(data.cpf)) {
    throw new Error("CPF inválido");
  }
  if (!data.customId || data.customId.length < 3) {
    throw new Error("ID personalizado deve ter pelo menos 3 caracteres");
  }

  log("info", "Creating new user", { 
    email: data.email, 
    fullName: data.fullName,
    customId: data.customId
  });

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        custom_id: data.customId,
        cpf: data.cpf,
      },
    },
  });

  if (signUpError) {
    log("error", "Error creating user", signUpError);
    throw signUpError;
  }
  
  if (!authData.user) {
    throw new Error("Falha ao criar usuário");
  }

  log("info", "User created successfully", { userId: authData.user.id });
  return authData;
};