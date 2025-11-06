import { Button } from "@/components/ui/button";
import { Wifi, Zap, Shield } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { TechParticles } from "@/components/ui/tech-particles";

interface HeroProps {
  referrerUsername?: string;
}

export const Hero = ({ referrerUsername }: HeroProps = {}) => {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });
  const signupUrl = referrerUsername 
    ? `/cadastro?ref=${referrerUsername}` 
    : '/cadastro';
  return <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4 py-20">
      {/* Tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      {/* Animated Particles */}
      <TechParticles />
      
      {/* Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className={`text-center space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/30 shadow-[0_0_20px_rgba(0,255,255,0.3)]">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Internet 5G de Alta Velocidade</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-[0_0_30px_rgba(0,255,255,0.5)]">
            Conecte-se ao Futuro
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse">
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
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-primary/30 hover:border-primary/60 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] group">
              <Wifi className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white">Internet 5G</h3>
              <p className="text-sm text-white/70">Chip de dados com cobertura nacional</p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-primary/30 hover:border-primary/60 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] group">
              <Zap className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white">Planos Flexíveis</h3>
              <p className="text-sm text-white/70">160 GB ou 250 GB acumulativos</p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-primary/30 hover:border-primary/60 transition-all hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] group">
              <Shield className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-white">Suporte 24/7</h3>
              <p className="text-sm text-white/70">Atendimento sempre disponível</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] transition-all font-semibold" 
              onClick={() => window.location.href = signupUrl}
            >
              Quero Participar
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => document.getElementById('como-participar')?.scrollIntoView({ behavior: 'smooth' })} 
              className="text-lg px-8 py-6 border-2 border-primary/50 bg-black/40 text-primary hover:bg-primary/10 hover:border-primary transition-all font-semibold"
            >
              Como Funciona
            </Button>
          </div>
          
          {/* Login link */}
          <div className="pt-4">
            <Button
              variant="link"
              className="text-primary hover:text-primary/80 underline text-base"
              onClick={() => window.location.href = "/login"}
            >
              Já tem conta? Faça login
            </Button>
          </div>
        </div>
      </div>
    </section>;
};