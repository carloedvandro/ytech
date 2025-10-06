import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Clock, QrCode } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";

const Payment = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [payment, setPayment] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      navigate("/dashboard");
      return;
    }
    loadPayment();
    
    // Verificar status a cada 5 segundos
    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [paymentId]);

  const loadPayment = async () => {
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;
      setPayment(paymentData);

      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", paymentData.plan_id)
        .single();

      if (planError) throw planError;
      setPlan(planData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pagamento",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("status")
        .eq("id", paymentId)
        .single();

      if (error) throw error;

      if (data.status === "completed") {
        toast({
          title: "Pagamento confirmado!",
          description: "Seu plano foi ativado com sucesso.",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
    } finally {
      setChecking(false);
    }
  };

  const copyPixCode = () => {
    if (payment?.pix_code) {
      navigator.clipboard.writeText(payment.pix_code);
      toast({
        title: "Código copiado!",
        description: "Cole no seu aplicativo de banco.",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const expiresAt = new Date(payment.expires_at);
  const now = new Date();
  const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60));

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pagamento via PIX</h1>
          <p className="text-muted-foreground">
            Escaneie o QR Code ou copie o código PIX
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tempo restante: {timeLeft} minutos
            </CardTitle>
            <CardDescription>
              O pagamento expira em {expiresAt.toLocaleString()}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="text-2xl font-bold text-primary">
                R$ {Number(payment.amount).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code PIX
            </CardTitle>
            <CardDescription>
              Escaneie com o aplicativo do seu banco
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {payment.pix_qr_code && (
              <img 
                src={`data:image/png;base64,${payment.pix_qr_code}`} 
                alt="QR Code PIX" 
                className="w-64 h-64 border rounded-lg"
              />
            )}
            
            <div className="w-full space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Ou copie o código PIX:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={payment.pix_code || ""}
                  className="flex-1 px-4 py-2 border rounded-md bg-muted text-xs"
                />
                <Button onClick={copyPixCode}>
                  Copiar
                </Button>
              </div>
            </div>

            <div className="w-full space-y-2">
              <Button
                onClick={checkPaymentStatus}
                disabled={checking}
                variant="outline"
                className="w-full"
              >
                {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verificar Pagamento
              </Button>

              <Button
                onClick={async () => {
                  setChecking(true);
                  try {
                    const { error } = await supabase.functions.invoke('simulate-payment-confirmation', {
                      body: { paymentId }
                    });

                    if (error) throw error;

                    // Atualizar dados do usuário no localStorage
                    const userData = JSON.parse(localStorage.getItem("user_session") || "{}");
                    const { data: updatedUser } = await supabase
                      .from("users")
                      .select("*")
                      .eq("id", userData.id)
                      .single();

                    if (updatedUser) {
                      localStorage.setItem("user_session", JSON.stringify(updatedUser));
                    }

                    toast({
                      title: "Pagamento confirmado!",
                      description: "Simulação em ambiente sandbox.",
                    });
                    
                    setTimeout(() => navigate("/dashboard"), 1500);
                  } catch (error: any) {
                    toast({
                      title: "Erro",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setChecking(false);
                  }
                }}
                disabled={checking}
                variant="secondary"
                className="w-full"
              >
                {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Pagamento (Sandbox)
              </Button>
            </div>
          </CardContent>
        </Card>

        {payment.status === "completed" && (
          <Card className="border-secondary bg-secondary/5">
            <CardContent className="flex items-center gap-4 pt-6">
              <CheckCircle2 className="h-12 w-12 text-secondary" />
              <div>
                <h3 className="font-semibold text-lg">Pagamento confirmado!</h3>
                <p className="text-sm text-muted-foreground">
                  Seu plano foi ativado com sucesso.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Payment;
