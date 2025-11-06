import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Link2, ShoppingCart, Users } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

const steps = [
  {
    icon: UserPlus,
    title: "Receba uma Indicação",
    description: "Para se cadastrar, você precisa de um código de indicação de um usuário ativo da Y-TECH."
  },
  {
    icon: Link2,
    title: "Clique no Link",
    description: "Acesse o link de indicação compartilhado. Ele contém o código único do seu indicador."
  },
  {
    icon: ShoppingCart,
    title: "Complete o Cadastro",
    description: "Preencha seus dados, escolha seu plano e finalize o pagamento dentro do sistema."
  },
  {
    icon: Users,
    title: "Ganhe Indicando",
    description: "Após ativo, você também pode indicar amigos e ganhar até R$ 26 por indicação direta!"
  }
];

export const HowToJoin = () => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  
  return (
    <section id="como-participar" className="relative py-20 px-4 bg-black overflow-hidden">
      {/* Animated Shadow Overlay Background */}
      <EtheralShadow
        color="rgba(0, 255, 255, 0.18)"
        animation={{ scale: 45, speed: 28 }}
        noise={{ opacity: 0.12, scale: 1.5 }}
      />
      
      <div ref={ref} className={`container mx-auto max-w-7xl relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            Como Participar?
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Nossa rede funciona por indicação. Veja como é simples fazer parte da Y-TECH
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="relative overflow-hidden border-2 border-primary/30 hover:border-primary/60 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] bg-black/60 backdrop-blur-xl group">
                <CardContent className="relative z-10 pt-8 pb-6 px-6">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white">
                      {step.title}
                    </h3>
                    
                    <p className="text-sm text-white/70 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 p-8 rounded-2xl bg-black/60 backdrop-blur-xl border-2 border-primary/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]">
              🔒 Sistema Exclusivo por Indicação
            </h3>
            <p className="text-lg text-white/70 max-w-3xl mx-auto">
              Não é possível se cadastrar diretamente pelo site. Você precisa de um código de indicação 
              de alguém que já seja cliente Y-TECH. Isso garante um crescimento sustentável e benefícios 
              para toda a rede!
            </p>
            <div className="pt-4">
              <p className="text-sm text-white/70">
                Já tem um código? <span className="font-semibold text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">Entre em contato com quem te indicou para receber o link!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
