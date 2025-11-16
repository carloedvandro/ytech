import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { EtheralShadow } from "@/components/ui/etheral-shadow";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
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
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  
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
    <main className="min-h-screen">
      {/* Hero Section */}
      <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4 py-20">
        {/* Animated Shadow Overlay Background */}
        <EtheralShadow
          color="rgba(0, 255, 255, 0.2)"
          animation={{ scale: 50, speed: 30 }}
          noise={{ opacity: 0.15, scale: 1.5 }}
        />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className={`text-center space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/30 shadow-[0_0_20px_rgba(0,255,255,0.3)]">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Programa de Revendedores</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">
              Y-TECH para Revendedores
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse">
                Potencialize Suas Vendas de Internet 5G
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Você que já atua no mercado de telecomunicações ou busca expandir seu negócio, 
              a Y-TECH oferece uma oportunidade exclusiva. Tenha acesso a condições especiais 
              e fortaleça sua oferta de internet 5G da Vivo para seus clientes!
            </p>
            
            <Button 
              size="lg" 
              onClick={handleWhatsAppContact}
              className="gap-2 text-lg px-8 py-6 bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] transition-all font-semibold"
            >
              <Phone className="w-5 h-5" />
              Falar com Setor Comercial
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 px-4 overflow-hidden bg-black">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        
        {/* Glowing accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]"></div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]">
            Por que ser um Revendedor Y-TECH?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <Card 
                key={index}
                className="bg-black/40 backdrop-blur-sm border-2 border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-white">{benefit.title}</h3>
                      <p className="text-white/70">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Important Information */}
      <section className="relative py-16 px-4 overflow-hidden bg-black">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <Card className="border-2 border-primary/50 bg-black/60 backdrop-blur-sm shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <AlertCircle className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-white">Importante Saber</h3>
                  <div className="space-y-4 text-white/70">
                    <p>
                      Como revendedor, você terá acesso a um <strong className="text-white">modelo de negócio 
                      focado na venda direta</strong> dos nossos planos. Este formato <strong className="text-white">não 
                      inclui</strong> a participação no sistema de rede (MLM) nem nos ganhos de indicação.
                    </p>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p>
                        No entanto, sua atuação como revendedor <strong className="text-white">não impede</strong> que 
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
      <section className="relative py-20 px-4 overflow-hidden bg-black">
        {/* Tech Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        
        {/* Glowing accent */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]">
            Quer saber mais e ter acesso às nossas condições exclusivas?
          </h2>
          
          <Card className="border-2 border-primary/50 bg-black/60 backdrop-blur-sm shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Entre em contato com nosso Setor Comercial de Revendedores:
                  </h3>
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-2xl font-bold text-primary">
                      <Phone className="w-8 h-8" />
                      <span>(11) 97049-2228</span>
                    </div>
                    
                    <p className="text-sm text-white/60">
                      Horário de Atendimento: Segunda a Sexta, das 8h às 18h
                    </p>
                    
                    <Button 
                      size="lg" 
                      onClick={handleWhatsAppContact}
                      className="gap-2 mt-4 bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] transition-all font-semibold"
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
