import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  features: any;
}

interface PlanSelectorProps {
  onPlanSelected: () => void;
  userId: string;
}

export const PlanSelector = ({ onPlanSelected, userId }: PlanSelectorProps) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar planos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    navigate(`/checkout?plan=${planId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Alert className="border-primary bg-primary/5">
        <AlertDescription className="text-center">
          <strong>Complete seu cadastro!</strong> Escolha um plano para ativar sua conta e começar a
          ganhar comissões.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              selectedPlan === plan.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="text-3xl font-bold text-primary pt-4">
                R$ {Number(plan.price).toFixed(2)}
                <span className="text-sm text-muted-foreground font-normal">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {Array.isArray(plan.features) && plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleSelectPlan(plan.id)}
              >
                Escolher este Plano
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
