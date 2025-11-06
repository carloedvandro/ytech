import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users2, Wallet } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

export const MMNSection = () => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  
  return (
    <section className="relative py-20 px-4 bg-black overflow-hidden">
      {/* Animated Shadow Overlay Background */}
      <EtheralShadow
        color="rgba(0, 255, 255, 0.16)"
        animation={{ scale: 48, speed: 32 }}
        noise={{ opacity: 0.14, scale: 1.5 }}
      />
      
      <div ref={ref} className={`container mx-auto max-w-7xl relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            Sistema de Indicação
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Transforme sua rede de contatos em renda extra mensal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Commission Structure */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">
              Estrutura de Comissões
            </h3>

            <Card className="border-primary/30 bg-black/60 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-white">Nível 1 (Diretos)</span>
                  <span className="text-3xl font-bold text-primary drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">R$ 26</span>
                </div>
                <p className="text-sm text-white/70">Por cada pessoa que você indicar diretamente</p>
              </CardContent>
            </Card>

            <Card className="border-secondary/30 bg-black/60 backdrop-blur-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-white">Níveis 2, 3 e 4</span>
                  <span className="text-3xl font-bold text-secondary drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">R$ 5</span>
                </div>
                <p className="text-sm text-white/70">Por cada pessoa indicada pelos seus indicados</p>
              </CardContent>
            </Card>

            <div className="bg-black/60 backdrop-blur-xl rounded-lg p-6 border border-primary/30">
              <h4 className="font-semibold text-white mb-3">Exemplo Prático:</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,255,0.8)]"></span>
                  Você indica 10 pessoas: <span className="font-bold text-white">R$ 260</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                  Cada uma indica mais 5: <span className="font-bold text-white">+ R$ 250</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,255,0.8)]"></span>
                  <span className="font-bold text-primary text-lg drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Total: R$ 510/mês</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Benefits */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">
              Benefícios
            </h3>

            <div className="space-y-4">
              <Card className="border-primary/30 bg-black/60 backdrop-blur-xl hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/40">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">Renda Recorrente</h4>
                    <p className="text-sm text-white/70">
                      Receba comissões todos os meses enquanto seus indicados mantiverem o plano ativo
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-secondary/30 bg-black/60 backdrop-blur-xl hover:border-secondary/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 border border-secondary/40">
                    <Users2 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">Rede Multinível</h4>
                    <p className="text-sm text-white/70">
                      Ganhe não só com suas indicações, mas também com as indicações delas até 4 níveis
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-black/60 backdrop-blur-xl hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/40">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">Saque Semanal</h4>
                    <p className="text-sm text-white/70">
                      Saque disponível toda sexta-feira a partir das 00h. Mínimo R$ 200
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gradient-to-r from-primary to-secondary text-black rounded-lg p-6 mt-8 shadow-[0_0_40px_rgba(0,255,255,0.3)]">
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