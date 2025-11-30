import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TwoFactorModalProps {
  open: boolean;
  whatsapp: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorModal({ open, whatsapp, onVerified, onCancel }: TwoFactorModalProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  // Debug para Chrome Android
  console.log('🔐 TwoFactorModal render:', { open, whatsapp, codeLength: code.length });

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: "Código incompleto",
        description: "Digite o código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-code", {
        body: { whatsapp, code },
      });

      // Quando há erro HTTP (400), mas com resposta JSON válida
      if (error) {
        // Tentar extrair mensagem de erro do data
        const errorMessage = data?.error || error.message || "Erro ao verificar código";
        toast({
          title: "Código inválido",
          description: errorMessage,
          variant: "destructive",
        });
        setCode("");
        setVerifying(false);
        return;
      }

      if (data.verified) {
        toast({
          title: "Verificado!",
          description: "Código confirmado com sucesso",
        });
        onVerified();
      } else {
        toast({
          title: "Código inválido",
          description: data.error || "Tente novamente",
          variant: "destructive",
        });
        setCode("");
      }
    } catch (error: any) {
      console.error("Erro ao verificar código:", error);
      toast({
        title: "Erro na verificação",
        description: "Erro ao conectar com servidor. Tente novamente.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent 
        className="sm:max-w-md"
        style={{ minHeight: '300px' }}
      >
        <DialogHeader>
          <DialogTitle>Verificação em 2 etapas</DialogTitle>
          <DialogDescription>
            Digite o código de 6 dígitos enviado para seu WhatsApp {whatsapp}
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="flex flex-col items-center gap-6 py-4"
          style={{ minHeight: '200px' }}
        >
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={verifying}
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

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={verifying}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifying || code.length !== 6}
              className="flex-1"
            >
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
