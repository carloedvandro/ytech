import { Wifi } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="relative bg-black border-t border-primary/20 py-12 px-4 overflow-hidden">
      {/* Tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      
      {/* Glowing accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/5 rounded-full blur-[100px]"></div>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]">Y-TECH</span>
            </div>
            <p className="text-sm text-white/60">
              Internet 5G de alta velocidade para sua casa e empresa.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Empresa</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="https://wa.me/5511994869948" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Sobre Nós</a></li>
              <li><a href="https://wa.me/5511994869948" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Cobertura</a></li>
              <li><a href="https://wa.me/5511994869948" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Tecnologia</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Suporte</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="https://wa.me/5511994869948" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
              <li><a href="https://wa.me/5511994869948" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WhatsApp</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Status da Rede</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Regulamento MLM</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary/20 pt-8 text-center text-sm text-white/40">
          <p>© 2025 Y-TECH Internet 5G. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};