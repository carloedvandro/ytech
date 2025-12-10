import { VideoBackground } from "@/components/ui/video-background";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const VIDEO_URL = "https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//videooficialytech.mp4";

const TermosDeUso = () => {
  return (
    <>
      <VideoBackground videoUrl={VIDEO_URL} overlayOpacity={65} />
      
      <main className="relative min-h-screen z-10">
        <div className="container mx-auto max-w-4xl px-4 py-12">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          <div className="bg-black/80 backdrop-blur-sm rounded-2xl border border-primary/20 p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Termos de Uso
            </h1>
            
            <div className="prose prose-invert prose-primary max-w-none space-y-6 text-white/80">
              <p className="text-sm text-white/60">
                Última atualização: 10 de Dezembro de 2025
              </p>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Aceitação dos Termos</h2>
                <p>
                  Ao acessar e utilizar os serviços da Y-TECH Internet 5G, você declara ter lido, compreendido e concordado com estes Termos de Uso. Caso não concorde com qualquer disposição destes termos, não utilize nossos serviços.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Descrição dos Serviços</h2>
                <p>
                  A Y-TECH oferece serviços de internet móvel 5G através de chips eSIM e físicos, com planos de dados de alta velocidade. Nossos serviços incluem:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Planos de internet móvel 5G com franquias de dados variadas</li>
                  <li>Ativação remota de eSIM em até 48 horas úteis</li>
                  <li>Suporte técnico via WhatsApp</li>
                  <li>Programa de indicação e revendedores (Marketing Multinível)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Cadastro e Conta</h2>
                <p>
                  Para utilizar nossos serviços, você deve:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Ter no mínimo 18 anos de idade ou ser emancipado legalmente</li>
                  <li>Fornecer informações verdadeiras, completas e atualizadas</li>
                  <li>Manter a confidencialidade de sua senha de acesso</li>
                  <li>Ser responsável por todas as atividades realizadas em sua conta</li>
                  <li>Possuir CPF válido e regular junto à Receita Federal</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Pagamentos e Renovações</h2>
                <p>
                  Os pagamentos são realizados mensalmente, com vencimento conforme data de ativação do plano. Formas de pagamento aceitas:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>PIX (pagamento instantâneo)</li>
                  <li>Criptomoedas (USDT)</li>
                </ul>
                <p className="mt-4">
                  O não pagamento até a data de vencimento pode resultar na suspensão temporária ou cancelamento do serviço. A reativação está sujeita a nova adesão ao plano.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Uso Aceitável</h2>
                <p>
                  O usuário compromete-se a utilizar os serviços de forma ética e legal, sendo vedado:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Revender ou redistribuir a conexão de internet para terceiros</li>
                  <li>Utilizar o serviço para atividades ilegais ou fraudulentas</li>
                  <li>Comprometer a segurança da rede ou de outros usuários</li>
                  <li>Violar direitos de propriedade intelectual de terceiros</li>
                  <li>Enviar spam, malware ou qualquer conteúdo malicioso</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Limitações do Serviço</h2>
                <p>
                  A velocidade e disponibilidade do serviço dependem de fatores externos, incluindo:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Cobertura da operadora na região do usuário</li>
                  <li>Compatibilidade do dispositivo com tecnologia 5G/4G</li>
                  <li>Condições climáticas e interferências ambientais</li>
                  <li>Congestionamento da rede em horários de pico</li>
                </ul>
                <p className="mt-4">
                  A Y-TECH não garante velocidades mínimas, pois atua como revendedora autorizada de operadoras parceiras.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Programa de Indicação</h2>
                <p>
                  A participação no programa de indicação (Marketing Multinível) está sujeita ao Regulamento MMN específico, disponível em nosso site. Os ganhos dependem exclusivamente do desempenho individual e da rede formada.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Propriedade Intelectual</h2>
                <p>
                  Todo o conteúdo do site Y-TECH, incluindo logotipos, textos, imagens e software, são protegidos por direitos autorais e pertencem exclusivamente à Y-TECH ou seus licenciadores. É proibida a reprodução sem autorização prévia.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Limitação de Responsabilidade</h2>
                <p>
                  A Y-TECH não se responsabiliza por:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Danos indiretos, incidentais ou consequentes do uso do serviço</li>
                  <li>Perda de dados ou lucros cessantes</li>
                  <li>Interrupções temporárias por manutenção ou força maior</li>
                  <li>Ações de terceiros que possam afetar o serviço</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">10. Cancelamento</h2>
                <p>
                  O usuário pode solicitar o cancelamento a qualquer momento através do suporte via WhatsApp. Não há reembolso proporcional de valores já pagos. A Y-TECH pode cancelar o serviço em caso de violação destes termos.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">11. Alterações nos Termos</h2>
                <p>
                  A Y-TECH reserva-se o direito de modificar estes termos a qualquer momento. As alterações serão comunicadas através do site e/ou WhatsApp. O uso continuado após as alterações implica na aceitação dos novos termos.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">12. Legislação Aplicável e Foro</h2>
                <p>
                  Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">13. Contato</h2>
                <p>
                  Para dúvidas sobre estes Termos de Uso, entre em contato:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>WhatsApp: +55 11 99486-9948</li>
                  <li>Site: https://ytech.yrwentechnology.com.br</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
        
        <Footer />
      </main>
    </>
  );
};

export default TermosDeUso;
