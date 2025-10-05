import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Plano Básico",
    price: 129,
    speed: "100 Mbps",
    features: [
      "Velocidade de até 100 Mbps",
      "Wi-Fi grátis",
      "Suporte 24/7",
      "Instalação inclusa",
      "Sem fidelidade"
    ],
    popular: false
  },
  {
    name: "Plano Premium",
    price: 199,
    speed: "300 Mbps",
    features: [
      "Velocidade de até 300 Mbps",
      "Wi-Fi Mesh grátis",
      "Suporte prioritário 24/7",
      "Instalação premium",
      "Sem fidelidade",
      "2 meses grátis no anual"
    ],
    popular: true
  },
  {
    name: "Plano VIP",
    price: 299,
    speed: "500 Mbps",
    features: [
      "Velocidade de até 500 Mbps",
      "Wi-Fi Mesh premium",
      "Suporte VIP exclusivo",
      "Instalação express",
      "Sem fidelidade",
      "3 meses grátis no anual",
      "IP fixo incluso"
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
                  {plan.speed}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">
                    R$ {plan.price}
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
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-secondary hover:bg-secondary/90'
                  }`}
                  size="lg"
                >
                  Assinar Agora
                </Button>
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