import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ShadowOverlay } from "@/components/ui/shadow-overlay";

interface PlansProps {
  referrerUsername?: string;
}

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

export const Plans = ({ referrerUsername }: PlansProps = {}) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  
  return (
    <section id="planos" className="relative py-20 px-4 bg-black overflow-hidden">
      {/* Animated Shadow Overlay Background */}
      <ShadowOverlay
        color="rgba(168, 85, 247, 0.15)"
        animation={{ scale: 40, speed: 25 }}
        noise={{ opacity: 0.1, scale: 1.5 }}
        className="absolute inset-0"
      />
      
      <div ref={ref} className={`container mx-auto max-w-7xl relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            Escolha o Melhor Plano
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Planos flexíveis para atender suas necessidades, com a melhor internet 5G do mercado
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={`relative overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(0,255,255,0.4)] bg-black/60 backdrop-blur-xl ${
                plan.popular 
                  ? 'border-primary/60 shadow-[0_0_30px_rgba(0,255,255,0.3)] scale-105' 
                  : 'border-primary/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-secondary text-black px-4 py-1 text-sm font-semibold rounded-bl-lg z-10">
                  Mais Popular
                </div>
              )}

              <CardHeader className="relative z-10 text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2 text-white">{plan.name}</CardTitle>
                <CardDescription className="text-lg font-medium text-primary">
                  {plan.data}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-white/60">/mês</span>
                </div>
              </CardHeader>

              <CardContent className="relative z-10 space-y-4">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-white/80">{feature}</span>
                  </div>
                ))}
              </CardContent>

              <CardFooter className="relative z-10 pt-6">
                <div className="w-full text-center py-3 px-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-sm font-medium text-primary">
                    Disponível apenas por indicação
                  </p>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-white/70">
            💰 Ganhe comissões indicando amigos! <span className="font-semibold text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Até R$ 26 por indicação</span>
          </p>
        </div>
      </div>
    </section>
  );
};