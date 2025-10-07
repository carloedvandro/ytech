import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Link2, ShoppingCart, Users } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

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
    <section id="como-participar" className="py-20 px-4 bg-background">
      <div ref={ref} className={`container mx-auto max-w-7xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Como Participar?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Nossa rede funciona por indicação. Veja como é simples fazer parte da Y-TECH
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="relative overflow-hidden border-2 hover:border-primary transition-all hover:shadow-lg">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">
              🔒 Sistema Exclusivo por Indicação
            </h3>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Não é possível se cadastrar diretamente pelo site. Você precisa de um código de indicação 
              de alguém que já seja cliente Y-TECH. Isso garante um crescimento sustentável e benefícios 
              para toda a rede!
            </p>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Já tem um código? <span className="font-semibold text-primary">Entre em contato com quem te indicou para receber o link!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
