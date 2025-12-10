import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface MiniSiteCTAProps {
  referrerUsername: string;
}

export const MiniSiteCTA = ({ referrerUsername }: MiniSiteCTAProps) => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section 
      ref={ref}
      className={`relative bg-gradient-to-br from-primary/20 via-black/80 to-primary/10 backdrop-blur-sm py-16 px-4 border-y border-primary/30 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <span className="text-primary font-medium">Não perca essa oportunidade!</span>
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Pronto para começar?
        </h2>
        
        <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
          Cadastre-se agora e tenha acesso à internet 5G de alta velocidade com a melhor tecnologia do mercado.
        </p>
        
        <Link to={`/cadastro?ref=${referrerUsername}`}>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 group"
          >
            Quero me Cadastrar
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </section>
  );
};
