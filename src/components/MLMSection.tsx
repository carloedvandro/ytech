import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users2, Wallet } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export const MLMSection = () => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div ref={ref} className={`container mx-auto max-w-7xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Sistema de Indicação
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforme sua rede de contatos em renda extra mensal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Commission Structure */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Estrutura de Comissões
            </h3>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-foreground">Nível 1 (Diretos)</span>
                  <span className="text-3xl font-bold text-primary">R$ 26</span>
                </div>
                <p className="text-sm text-muted-foreground">Por cada pessoa que você indicar diretamente</p>
              </CardContent>
            </Card>

            <Card className="border-secondary/20 bg-gradient-to-br from-secondary/10 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-foreground">Níveis 2, 3 e 4</span>
                  <span className="text-3xl font-bold text-secondary">R$ 5</span>
                </div>
                <p className="text-sm text-muted-foreground">Por cada pessoa indicada pelos seus indicados</p>
              </CardContent>
            </Card>

            <div className="bg-accent/10 rounded-lg p-6 border border-accent/20">
              <h4 className="font-semibold text-foreground mb-3">Exemplo Prático:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Você indica 10 pessoas: <span className="font-bold text-foreground">R$ 260</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  Cada uma indica mais 5: <span className="font-bold text-foreground">+ R$ 250</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent"></span>
                  <span className="font-bold text-primary text-lg">Total: R$ 510/mês</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Benefits */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Benefícios
            </h3>

            <div className="space-y-4">
              <Card className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Renda Recorrente</h4>
                    <p className="text-sm text-muted-foreground">
                      Receba comissões todos os meses enquanto seus indicados mantiverem o plano ativo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <Users2 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Rede Multinível</h4>
                    <p className="text-sm text-muted-foreground">
                      Ganhe não só com suas indicações, mas também com as indicações delas até 4 níveis
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Saque Semanal</h4>
                    <p className="text-sm text-muted-foreground">
                      Saque disponível toda sexta-feira a partir das 00h. Mínimo R$ 200
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-primary text-primary-foreground rounded-lg p-6 mt-8">
              <p className="text-sm font-semibold mb-2">🎯 Meta Realista</p>
              <p className="text-2xl font-bold mb-2">R$ 1.000+/mês</p>
              <p className="text-sm opacity-90">
                Com dedicação e compartilhando com sua rede, é possível atingir essa marca em poucos meses
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};