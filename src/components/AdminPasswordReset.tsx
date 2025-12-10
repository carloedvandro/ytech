import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";

interface AdminPasswordResetProps {
  userId: string;
  userName: string;
}

export const AdminPasswordReset = ({ userId, userName }: AdminPasswordResetProps) => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [whatsappSent, setWhatsappSent] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setNewPassword(null);
    setCopied(false);
    setWhatsappSent(false);

    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId, sendWhatsApp },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNewPassword(data.tempPassword);
      setWhatsappSent(data.whatsappSent);
      
      toast.success("Senha resetada com sucesso!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao resetar senha: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast.success("Senha copiada!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50 border-destructive/30">
      <AnimatedGradient colors={["#ef4444", "#f87171", "#fca5a5"]} speed={0.05} blur="medium" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Resetar Senha
        </CardTitle>
        <CardDescription>
          Gerar nova senha temporária para {userName}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        {!newPassword ? (
          <>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="sendWhatsApp" 
                checked={sendWhatsApp}
                onCheckedChange={(checked) => setSendWhatsApp(checked === true)}
              />
              <Label htmlFor="sendWhatsApp" className="text-sm cursor-pointer">
                Enviar nova senha via WhatsApp
              </Label>
            </div>
            <Button 
              onClick={handleReset} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Resetar Senha
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Nova senha temporária:</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-bold flex-1">{newPassword}</code>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={copyPassword}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {whatsappSent && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <MessageCircle className="h-4 w-4" />
                Senha enviada via WhatsApp
              </div>
            )}
            
            <Button 
              onClick={() => setNewPassword(null)} 
              variant="outline"
              className="w-full"
            >
              Resetar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
