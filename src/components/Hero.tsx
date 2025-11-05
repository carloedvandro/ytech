import { Button } from "@/components/ui/button";
import { Wifi, Zap, Shield } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface HeroProps {
  referrerUsername?: string;
}

export const Hero = ({ referrerUsername }: HeroProps = {}) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  const signupUrl = referrerUsername 
    ? `/cadastro?ref=${referrerUsername}` 
    : '/cadastro';
  return <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary px-4 py-20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-secondary blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className={`text-center space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <Zap className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Internet 5G de Alta Velocidade</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Conecte-se ao Futuro
            <br />
            <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              com Y-TECH 5G
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Velocidade incomparável, estabilidade garantida e a melhor experiência de internet
            para sua casa e empresa.
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8">
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Wifi className="w-10 h-10 text-secondary" />
              <h3 className="text-lg font-semibold text-white">Internet 5G</h3>
              <p className="text-sm text-white/80">Chip de dados com cobertura nacional</p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Zap className="w-10 h-10 text-secondary" />
              <h3 className="text-lg font-semibold text-white">Planos Flexíveis</h3>
              <p className="text-sm text-white/80">160 GB ou 250 GB acumulativos</p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Shield className="w-10 h-10 text-secondary" />
              <h3 className="text-lg font-semibold text-white">Suporte 24/7</h3>
              <p className="text-sm text-white/80">Atendimento sempre disponível</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-lg" 
              onClick={() => window.location.href = signupUrl}
            >
              Quero Participar
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => document.getElementById('como-participar')?.scrollIntoView({ behavior: 'smooth' })} 
              className="text-lg px-8 py-6 border-white bg-gray-50 text-purple-600"
            >
              Como Funciona
            </Button>
          </div>
          
          {/* Login link */}
          <div className="pt-4">
            <Button
              variant="link"
              className="text-white hover:text-white/80 underline text-base"
              onClick={() => window.location.href = "/login"}
            >
              Já tem conta? Faça login
            </Button>
          </div>
        </div>
      </div>
    </section>;
};