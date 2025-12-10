import { UserPlus, Wifi, DollarSign, Users } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

const steps = [
  {
    icon: UserPlus,
    title: "Cadastre-se",
    description: "Crie sua conta em poucos minutos e escolha o melhor plano para você"
  },
  {
    icon: Wifi,
    title: "Receba Internet 5G",
    description: "Instalação rápida em até 24h, sem complicação"
  },
  {
    icon: Users,
    title: "Indique Amigos",
    description: "Compartilhe seu link exclusivo com amigos e familiares"
  },
  {
    icon: DollarSign,
    title: "Ganhe Comissões",
    description: "Receba até R$ 26 por cada pessoa que assinar através do seu link"
  }
];

export const HowItWorks = () => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  
  return (
    <section className="relative py-20 px-4 bg-black/70 backdrop-blur-sm overflow-hidden">
      {/* Animated Shadow Overlay Background */}
      <EtheralShadow
        color="rgba(168, 85, 247, 0.2)"
        animation={{ scale: 55, speed: 35 }}
        noise={{ opacity: 0.13, scale: 1.5 }}
      />
      
      <div ref={ref} className={`container mx-auto max-w-7xl relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            Como Funciona
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            É simples começar a usar a melhor internet 5G e ainda ganhar dinheiro
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent -z-10"></div>
                )}

                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Number badge */}
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.4)] group-hover:shadow-[0_0_60px_rgba(0,255,255,0.6)] transition-all">
                      <Icon className="w-14 h-14 text-black" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-black border-2 border-primary text-primary flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(0,255,255,0.5)]">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-white/70">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};