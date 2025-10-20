import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FlaskConical, Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WebhookTest() {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [eventType, setEventType] = useState<string>("PAYMENT_CONFIRMED");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Buscar pagamentos recentes
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["recent-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          status,
          created_at,
          profiles!payments_user_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const handleSimulate = async () => {
    if (!selectedPaymentId) {
      toast.error("Selecione um pagamento");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("test-webhook-event", {
        body: {
          paymentId: selectedPaymentId,
          eventType,
        },
      });

      if (error) throw error;

      setResult(data);
      toast.success("Evento simulado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao simular evento:", error);
      toast.error(error.message || "Erro ao simular evento");
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Teste de Webhook</h1>
            <p className="text-muted-foreground">
              Simule eventos do Asaas sem precisar fazer pagamento real
            </p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta ferramenta simula eventos do webhook Asaas v3, permitindo testar
            todo o fluxo de processamento (ativação de usuário, criação de comissões, etc.)
            sem realizar pagamentos reais.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Simulação</CardTitle>
            <CardDescription>
              Selecione um pagamento existente e o tipo de evento para simular
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pagamento</label>
              <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pagamento..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingPayments ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Carregando pagamentos...
                    </div>
                  ) : (
                    payments?.map((payment) => (
                      <SelectItem key={payment.id} value={payment.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {payment.profiles?.full_name || "Sem nome"} - R${" "}
                            {Number(payment.amount).toFixed(2)}
                          </span>
                          <Badge variant="outline" className="ml-auto">
                            {payment.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Evento</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYMENT_CREATED">PAYMENT_CREATED</SelectItem>
                  <SelectItem value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</SelectItem>
                  <SelectItem value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</SelectItem>
                  <SelectItem value="PAYMENT_UPDATED">PAYMENT_UPDATED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSimulate}
              disabled={!selectedPaymentId || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Simulando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Simular Evento
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.error ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Erro na Simulação
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Resultado da Simulação
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Mensagem</h3>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-2">Resposta do Webhook</h3>
                      <div className="bg-muted p-3 rounded-md">
                        <Badge variant="outline" className="mb-2">
                          Status: {result.webhookResponse?.status}
                        </Badge>
                        <pre className="text-xs overflow-auto">
                          {result.webhookResponse?.body}
                        </pre>
                      </div>
                    </div>

                    {result.webhookEvent && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Evento Registrado</h3>
                        <div className="bg-muted p-3 rounded-md">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(result.webhookEvent, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Evento simulado com sucesso! Verifique os logs do webhook e o banco de
                        dados para confirmar o processamento.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
