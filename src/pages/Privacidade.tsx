import { VideoBackground } from "@/components/ui/video-background";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const VIDEO_URL = "https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//videooficialytech.mp4";

const Privacidade = () => {
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
              Política de Privacidade
            </h1>
            
            <div className="prose prose-invert prose-primary max-w-none space-y-6 text-white/80">
              <p className="text-sm text-white/60">
                Última atualização: 10 de Dezembro de 2025
              </p>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Introdução</h2>
                <p>
                  A Y-TECH Internet 5G está comprometida com a proteção da privacidade e dos dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Dados que Coletamos</h2>
                <p>
                  Coletamos os seguintes tipos de dados pessoais:
                </p>
                
                <h3 className="text-lg font-medium text-white mt-6 mb-3">2.1 Dados Cadastrais</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nome completo</li>
                  <li>CPF (Cadastro de Pessoa Física)</li>
                  <li>Número de WhatsApp</li>
                  <li>Endereço de e-mail</li>
                </ul>

                <h3 className="text-lg font-medium text-white mt-6 mb-3">2.2 Dados de Ativação</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IMEI do dispositivo</li>
                  <li>EID (para eSIM)</li>
                  <li>Código de barras do chip</li>
                  <li>Tipo de dispositivo (iOS/Android)</li>
                </ul>

                <h3 className="text-lg font-medium text-white mt-6 mb-3">2.3 Dados Financeiros</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Histórico de pagamentos</li>
                  <li>Chave PIX para recebimento de comissões</li>
                  <li>Saldo e transações de comissões</li>
                </ul>

                <h3 className="text-lg font-medium text-white mt-6 mb-3">2.4 Dados de Navegação</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Endereço IP</li>
                  <li>Tipo de navegador e dispositivo</li>
                  <li>Páginas visitadas e tempo de permanência</li>
                  <li>Cookies e tecnologias similares</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Finalidade do Tratamento</h2>
                <p>
                  Utilizamos seus dados para as seguintes finalidades:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li><strong>Prestação do serviço:</strong> Ativação e manutenção do plano de internet</li>
                  <li><strong>Comunicação:</strong> Envio de notificações sobre pagamentos, renovações e suporte</li>
                  <li><strong>Programa de indicação:</strong> Gestão da rede de indicados e pagamento de comissões</li>
                  <li><strong>Cumprimento legal:</strong> Atendimento às obrigações legais e regulatórias</li>
                  <li><strong>Segurança:</strong> Prevenção de fraudes e proteção contra atividades maliciosas</li>
                  <li><strong>Melhoria do serviço:</strong> Análise de uso para aprimorar nossa plataforma</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Base Legal</h2>
                <p>
                  O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li><strong>Execução de contrato:</strong> Para prestação dos serviços contratados</li>
                  <li><strong>Consentimento:</strong> Para comunicações de marketing (quando aplicável)</li>
                  <li><strong>Cumprimento de obrigação legal:</strong> Para atendimento às exigências fiscais e regulatórias</li>
                  <li><strong>Legítimo interesse:</strong> Para prevenção de fraudes e melhoria dos serviços</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Compartilhamento de Dados</h2>
                <p>
                  Seus dados podem ser compartilhados com:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li><strong>Operadoras de telefonia:</strong> Para ativação e gestão dos chips/eSIMs</li>
                  <li><strong>Processadores de pagamento:</strong> Para processamento de transações financeiras</li>
                  <li><strong>Prestadores de serviço:</strong> Empresas que auxiliam na operação da plataforma</li>
                  <li><strong>Autoridades públicas:</strong> Quando exigido por lei ou ordem judicial</li>
                </ul>
                <p className="mt-4">
                  Não vendemos ou alugamos seus dados pessoais a terceiros para fins de marketing.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Armazenamento e Segurança</h2>
                <p>
                  Seus dados são armazenados em servidores seguros com as seguintes medidas de proteção:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Criptografia de dados em trânsito e em repouso</li>
                  <li>Controle de acesso restrito a colaboradores autorizados</li>
                  <li>Monitoramento contínuo de segurança</li>
                  <li>Backups regulares dos dados</li>
                  <li>Autenticação de dois fatores para acessos sensíveis</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Retenção de Dados</h2>
                <p>
                  Mantemos seus dados pessoais pelo tempo necessário para:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Prestação dos serviços contratados</li>
                  <li>Cumprimento de obrigações legais (mínimo de 5 anos para dados fiscais)</li>
                  <li>Defesa em processos judiciais, quando aplicável</li>
                </ul>
                <p className="mt-4">
                  Após o encerramento da relação contratual e decorridos os prazos legais, os dados serão anonimizados ou eliminados.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Seus Direitos</h2>
                <p>
                  Conforme a LGPD, você tem direito a:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li><strong>Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
                  <li><strong>Correção:</strong> Solicitar a correção de dados incompletos ou inexatos</li>
                  <li><strong>Anonimização ou eliminação:</strong> Solicitar a anonimização ou exclusão de dados desnecessários</li>
                  <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                  <li><strong>Revogação do consentimento:</strong> Retirar o consentimento a qualquer momento</li>
                  <li><strong>Oposição:</strong> Opor-se ao tratamento em determinadas circunstâncias</li>
                  <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
                </ul>
                <p className="mt-4">
                  Para exercer seus direitos, entre em contato através do WhatsApp: +55 11 99486-9948
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Cookies</h2>
                <p>
                  Utilizamos cookies e tecnologias similares para:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Manter sua sessão ativa durante a navegação</li>
                  <li>Lembrar suas preferências</li>
                  <li>Analisar o uso da plataforma</li>
                  <li>Melhorar a experiência do usuário</li>
                </ul>
                <p className="mt-4">
                  Você pode configurar seu navegador para recusar cookies, porém isso pode afetar algumas funcionalidades do site.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">10. Menores de Idade</h2>
                <p>
                  Nossos serviços são destinados a pessoas maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade. Se tomarmos conhecimento de que dados de menores foram coletados, tomaremos medidas para excluí-los.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">11. Alterações nesta Política</h2>
                <p>
                  Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas através do site ou WhatsApp. Recomendamos revisar esta página regularmente.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">12. Encarregado de Dados (DPO)</h2>
                <p>
                  Para questões relacionadas à proteção de dados pessoais, entre em contato com nosso Encarregado de Dados:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>WhatsApp: +55 11 99486-9948</li>
                  <li>Site: https://ytech.yrwentechnology.com.br</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">13. Autoridade Nacional</h2>
                <p>
                  Caso considere que o tratamento de seus dados pessoais viola a LGPD, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD): www.gov.br/anpd
                </p>
              </section>
            </div>
          </div>
        </div>
        
        <Footer />
      </main>
    </>
  );
};

export default Privacidade;
