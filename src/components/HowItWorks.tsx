import { UserPlus, Wifi, DollarSign, Users } from "lucide-react";

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
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Como Funciona
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
                  <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary to-secondary -z-10"></div>
                )}

                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Number badge */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <Icon className="w-14 h-14 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
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