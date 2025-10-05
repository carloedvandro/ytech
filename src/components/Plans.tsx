import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Plano Smartphone",
    price: 129.99,
    data: "160 GB",
    features: [
      "160 GB de internet 5G",
      "Velocidade ultra rápida",
      "Cobertura nacional",
      "Suporte 24/7",
      "Sem fidelidade",
      "Ganhe indicando amigos"
    ],
    popular: true
  },
  {
    name: "Plano Rural",
    price: 129.99,
    data: "250 GB",
    features: [
      "250 GB acumulativos",
      "Ideal para área rural",
      "Internet estável no campo",
      "Suporte 24/7",
      "Sem fidelidade",
      "Ganhe indicando amigos"
    ],
    popular: false
  }
];

export const Plans = () => {
  return (
    <section id="planos" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Escolha o Melhor Plano
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Planos flexíveis para atender suas necessidades, com a melhor internet 5G do mercado
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={`relative overflow-hidden transition-all hover:shadow-xl ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Mais Popular
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-lg font-medium text-primary">
                  {plan.data}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </CardContent>

              <CardFooter className="pt-6">
                <div className="w-full text-center py-3 px-4 rounded-lg bg-muted border border-border">
                  <p className="text-sm font-medium text-muted-foreground">
                    Disponível apenas por indicação
                  </p>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            💰 Ganhe comissões indicando amigos! <span className="font-semibold text-primary">Até R$ 26 por indicação</span>
          </p>
        </div>
      </div>
    </section>
  );
};