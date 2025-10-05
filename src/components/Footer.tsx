import { Wifi } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-8 h-8" />
              <span className="text-2xl font-bold">Y-TECH</span>
            </div>
            <p className="text-sm text-background/80">
              Internet 5G de alta velocidade para sua casa e empresa.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><a href="#" className="hover:text-background transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Cobertura</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Tecnologia</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><a href="#" className="hover:text-background transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-background transition-colors">WhatsApp</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Status da Rede</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><a href="#" className="hover:text-background transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Regulamento MLM</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 text-center text-sm text-background/60">
          <p>© 2025 Y-TECH Internet 5G. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};