import { useState } from "react";
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
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      // Buscar usuário pelo email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", data.email)
        .single();

      if (userError || !user) {
        toast({
          title: "Erro ao fazer login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar senha (temporário - usar bcrypt no backend)
      const passwordHash = btoa(data.password);
      if (user.password_hash !== passwordHash) {
        toast({
          title: "Erro ao fazer login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Atualizar last_login
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", user.id);

      // Salvar sessão no localStorage
      localStorage.setItem("user_session", JSON.stringify(user));

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Entre com suas credenciais</CardDescription>
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
  );
};

export default Login;
