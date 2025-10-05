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
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const addressSchema = z.object({
  cep: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
  street: z.string().min(3, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(3, "Bairro é obrigatório"),
  city: z.string().min(3, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado deve ter 2 caracteres"),
});

type AddressForm = z.infer<typeof addressSchema>;

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const planId = searchParams.get("plan");

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  });

  useEffect(() => {
    if (!planId) {
      navigate("/dashboard");
      return;
    }
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar plano",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: AddressForm) => {
    setProcessing(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user_session") || "{}");

      // Criar pagamento
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userData.id,
          plan_id: planId,
          amount: plan.price,
          status: "pending",
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          metadata: {
            address: data,
          },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Criar cobrança no Asaas
      const { error: asaasError } = await supabase.functions.invoke('create-asaas-payment', {
        body: { paymentId: payment.id },
      });

      if (asaasError) throw asaasError;

      toast({
        title: "Pagamento criado!",
        description: "Gerando QR Code PIX...",
      });

      setTimeout(() => {
        navigate(`/payment/${payment.id}`);
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Finalizar Assinatura</h1>
          <p className="text-muted-foreground">
            Complete as informações para ativar seu plano
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plano Selecionado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="text-2xl font-bold text-primary">
                R$ {Number(plan.price).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço de Instalação</CardTitle>
            <CardDescription>
              Informe o endereço onde o chip será utilizado (área rural)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" placeholder="12345678" maxLength={8} {...register("cep")} />
                  {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input id="street" placeholder="Nome da rua" {...register("street")} />
                {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input id="number" placeholder="123" {...register("number")} />
                  {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento (opcional)</Label>
                  <Input id="complement" placeholder="Apto 101" {...register("complement")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input id="neighborhood" placeholder="Nome do bairro" {...register("neighborhood")} />
                {errors.neighborhood && (
                  <p className="text-sm text-destructive">{errors.neighborhood.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" placeholder="Nome da cidade" {...register("city")} />
                  {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input id="state" placeholder="SP" maxLength={2} {...register("state")} />
                  {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" size="lg" disabled={processing}>
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar com PIX
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Checkout;
