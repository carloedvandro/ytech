import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Shield, 
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";

const Resellers = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Valores Diferenciados",
      description: "Acesse uma tabela de preços exclusiva para revendedores, garantindo maior margem e competitividade no mercado."
    },
    {
      icon: Building2,
      title: "Produto de Alta Demanda",
      description: "Ofereça internet 5G da Vivo, um serviço essencial e de alta qualidade, com ampla cobertura nacional."
    },
    {
      icon: Users,
      title: "Flexibilidade para Seu Negócio",
      description: "Atenda tanto o segmento rural quanto usuários de smartphones, ampliando seu público-alvo."
    },
    {
      icon: Shield,
      title: "Credibilidade e Suporte",
      description: "Conte com a solidez de uma empresa com mais de 7 anos de experiência (desde 2018) e nosso suporte dedicado."
    }
  ];

  const handleWhatsAppContact = () => {
    window.open('https://wa.me/5511970492228?text=Olá! Tenho interesse em me tornar um revendedor Y-TECH.', '_blank');
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Programa de Revendedores</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Y-TECH para Revendedores
              <span className="block text-primary mt-2">
                Potencialize Suas Vendas de Internet 5G
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Você que já atua no mercado de telecomunicações ou busca expandir seu negócio, 
              a Y-TECH oferece uma oportunidade exclusiva. Tenha acesso a condições especiais 
              e fortaleça sua oferta de internet 5G da Vivo para seus clientes!
            </p>
            
            <Button 
              size="lg" 
              onClick={handleWhatsAppContact}
              className="gap-2 text-lg px-8 py-6"
            >
              <Phone className="w-5 h-5" />
              Falar com Setor Comercial
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Por que ser um Revendedor Y-TECH?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <Card 
                key={index}
                className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Important Information */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold mb-4">Importante Saber</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Como revendedor, você terá acesso a um <strong className="text-foreground">modelo de negócio 
                      focado na venda direta</strong> dos nossos planos. Este formato <strong className="text-foreground">não 
                      inclui</strong> a participação no sistema de rede (MLM) nem nos ganhos de indicação.
                    </p>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-background/80 border border-primary/20">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p>
                        No entanto, sua atuação como revendedor <strong className="text-foreground">não impede</strong> que 
                        você, caso deseje, participe da nossa rede de marketing de relacionamento em paralelo, 
                        seguindo as regras específicas de cada modalidade.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Quer saber mais e ter acesso às nossas condições exclusivas?
          </h2>
          
          <Card className="border-2 border-primary/30">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">
                    Entre em contato com nosso Setor Comercial de Revendedores:
                  </h3>
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-2xl font-bold text-primary">
                      <Phone className="w-8 h-8" />
                      <span>(11) 97049-2228</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Horário de Atendimento: Segunda a Sexta, das 8h às 18h
                    </p>
                    
                    <Button 
                      size="lg" 
                      onClick={handleWhatsAppContact}
                      className="gap-2 mt-4"
                    >
                      <Phone className="w-5 h-5" />
                      Iniciar Conversa no WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Resellers;
