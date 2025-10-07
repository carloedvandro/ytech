import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'request' | 'verify' | 'change'>('request');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const handleRequestCode = async () => {
    if (!profile?.whatsapp) {
      toast({
        title: "Erro",
        description: "WhatsApp não encontrado no perfil",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
        body: { whatsapp: profile.whatsapp }
      });

      if (error) throw error;

      if (data.expiresAt) {
        setExpiresAt(data.expiresAt);
      }

      toast({
        title: "Código enviado!",
        description: `Um código de verificação foi enviado para ${profile.whatsapp}`,
      });
      
      setStep('verify');
    } catch (error: any) {
      toast({
        title: "Erro ao enviar código",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Digite o código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-whatsapp-code', {
        body: { 
          whatsapp: profile?.whatsapp,
          code 
        }
      });

      if (error) throw error;

      if (!data.verified) {
        throw new Error(data.error || "Código inválido");
      }

      toast({
        title: "Código verificado!",
        description: "Agora você pode definir sua nova senha",
      });
      
      setStep('change');
    } catch (error: any) {
      toast({
        title: "Erro na verificação",
        description: error.message || "Código incorreto ou expirado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso",
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Trocar Senha</h1>
          <p className="text-muted-foreground">Altere sua senha de acesso</p>
        </div>

        {step === 'request' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Verificação via WhatsApp
              </CardTitle>
              <CardDescription>
                Para sua segurança, enviaremos um código de verificação para seu WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>WhatsApp cadastrado</Label>
                <Input 
                  value={profile.whatsapp} 
                  disabled 
                  className="mt-2"
                />
              </div>
              
              <Button 
                onClick={handleRequestCode} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar código via WhatsApp
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'verify' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Digite o código
              </CardTitle>
              <CardDescription>
                Insira o código de 6 dígitos enviado para {profile.whatsapp}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={code} 
                  onChange={setCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {expiresAt && (
                <p className="text-xs text-muted-foreground text-center">
                  Código expira em: {new Date(expiresAt).toLocaleTimeString('pt-BR')}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('request')}
                  className="flex-1"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={loading || code.length !== 6}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar código
                </Button>
              </div>

              <Button
                variant="link"
                onClick={handleRequestCode}
                disabled={loading}
                className="w-full"
              >
                Não recebeu? Enviar novo código
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'change' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Nova senha
              </CardTitle>
              <CardDescription>
                Digite sua nova senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input 
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirme a senha</Label>
                <Input 
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="mt-2"
                />
              </div>
              
              <Button 
                onClick={handleChangePassword} 
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar senha
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ChangePassword;
