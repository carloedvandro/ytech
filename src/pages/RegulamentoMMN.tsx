import { VideoBackground } from "@/components/ui/video-background";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const VIDEO_URL = "https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//videooficialytech.mp4";

const RegulamentoMMN = () => {
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
              Regulamento do Programa de Indicação (MMN)
            </h1>
            
            <div className="prose prose-invert prose-primary max-w-none space-y-6 text-white/80">
              <p className="text-sm text-white/60">
                Última atualização: 10 de Dezembro de 2025
              </p>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-8">
                <p className="text-primary font-medium">
                  Este regulamento estabelece as regras do Programa de Marketing Multinível (MMN) da Y-TECH Internet 5G. A participação no programa implica na aceitação integral destas condições.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Definições</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>MMN (Marketing Multinível):</strong> Sistema de comercialização por indicação em múltiplos níveis</li>
                  <li><strong>Revendedor/Participante:</strong> Pessoa física cadastrada no programa com plano ativo</li>
                  <li><strong>Indicador:</strong> Revendedor que indica novos clientes</li>
                  <li><strong>Indicado:</strong> Novo cliente cadastrado através de link de indicação</li>
                  <li><strong>Rede:</strong> Conjunto de indicados diretos e indiretos de um revendedor</li>
                  <li><strong>Nível:</strong> Posição do indicado na hierarquia da rede (1º ao 4º nível)</li>
                  <li><strong>Comissão:</strong> Valor pago ao indicador por cada pagamento de indicado</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Requisitos para Participação</h2>
                <p>
                  Para participar do programa de indicação, o revendedor deve:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Ser maior de 18 anos e possuir capacidade civil plena</li>
                  <li>Possuir CPF válido e regular junto à Receita Federal</li>
                  <li>Estar com o plano de internet Y-TECH ativo e adimplente</li>
                  <li>Aceitar integralmente este regulamento e os Termos de Uso</li>
                  <li>Fornecer dados bancários válidos para recebimento de comissões</li>
                </ul>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                  <p className="text-yellow-400 font-medium">
                    ⚠️ IMPORTANTE: Somente usuários com plano ATIVO podem indicar novos clientes e receber comissões. O link de indicação é gerado automaticamente após a ativação do plano.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Estrutura de Comissões</h2>
                <p>
                  As comissões são pagas sobre o valor do plano de cada indicado, distribuídas em 4 níveis:
                </p>
                
                <div className="bg-black/50 rounded-lg p-6 mt-4 border border-primary/20">
                  <h3 className="text-lg font-medium text-primary mb-4">Tabela de Comissões</h3>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-primary/20">
                        <th className="py-2 text-white">Nível</th>
                        <th className="py-2 text-white">Relação</th>
                        <th className="py-2 text-white">Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-primary font-bold">1º Nível</td>
                        <td className="py-3">Indicação direta</td>
                        <td className="py-3 text-green-400 font-bold">R$ 26,00</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-primary font-bold">2º Nível</td>
                        <td className="py-3">Indicação do seu indicado</td>
                        <td className="py-3 text-green-400 font-bold">R$ 5,00</td>
                      </tr>
                      <tr className="border-b border-white/10">
                        <td className="py-3 text-primary font-bold">3º Nível</td>
                        <td className="py-3">Indicação do 2º nível</td>
                        <td className="py-3 text-green-400 font-bold">R$ 5,00</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-primary font-bold">4º Nível</td>
                        <td className="py-3">Indicação do 3º nível</td>
                        <td className="py-3 text-green-400 font-bold">R$ 5,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                  <h4 className="text-green-400 font-medium mb-2">💰 Exemplo Prático:</h4>
                  <p className="text-white/80">
                    Se você indicar 10 pessoas (1º nível), e cada uma dessas 10 indicar mais 10 (2º nível), e assim por diante:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>1º Nível: 10 × R$ 26 = <strong className="text-green-400">R$ 260/mês</strong></li>
                    <li>2º Nível: 100 × R$ 5 = <strong className="text-green-400">R$ 500/mês</strong></li>
                    <li>3º Nível: 1.000 × R$ 5 = <strong className="text-green-400">R$ 5.000/mês</strong></li>
                    <li>4º Nível: 10.000 × R$ 5 = <strong className="text-green-400">R$ 50.000/mês</strong></li>
                  </ul>
                  <p className="mt-2 text-white font-medium">
                    Potencial total: até R$ 55.760/mês (rendimento residual e recorrente)
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Regras de Atribuição</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O indicado é atribuído permanentemente ao indicador cujo link foi utilizado no cadastro</li>
                  <li>Não é possível transferir indicados entre revendedores, exceto em casos excepcionais analisados pela administração</li>
                  <li>Em caso de disputa de indicação, será considerado o primeiro link utilizado no cadastro do cliente</li>
                  <li>Se comprovado que um indicador referenciou o cliente antes do cadastro, mediante apresentação de provas, o indicado poderá ser transferido</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Liberação e Pagamento de Comissões</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>As comissões são geradas quando o indicado realiza o pagamento do plano</li>
                  <li>As comissões ficam com status "pendente" por 7 dias após a confirmação do pagamento</li>
                  <li>Após o período de pendência, as comissões ficam "disponíveis" para saque</li>
                  <li>O saque mínimo é de R$ 50,00</li>
                  <li>Taxa de saque: R$ 3,00 por transferência PIX</li>
                  <li>Os saques são processados em até 48 horas úteis</li>
                  <li>É necessário informar uma chave PIX válida para recebimento</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Condições de Manutenção</h2>
                <p>
                  Para continuar recebendo comissões, o revendedor deve:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Manter seu plano de internet Y-TECH ativo e adimplente</li>
                  <li>Não violar os Termos de Uso ou este regulamento</li>
                  <li>Não praticar condutas antiéticas ou que prejudiquem a imagem da Y-TECH</li>
                </ul>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                  <p className="text-red-400 font-medium">
                    ❌ A suspensão ou cancelamento do plano resulta na perda do direito às comissões pendentes e futuras, bem como da rede de indicados.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Condutas Proibidas</h2>
                <p>
                  É expressamente vedado ao revendedor:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Fazer promessas de ganhos garantidos ou enriquecimento rápido</li>
                  <li>Utilizar práticas de spam ou mensagens em massa não autorizadas</li>
                  <li>Criar contas falsas ou utilizar dados de terceiros sem autorização</li>
                  <li>Denegrir a imagem de concorrentes ou da própria Y-TECH</li>
                  <li>Oferecer descontos ou benefícios não autorizados oficialmente</li>
                  <li>Utilizar a marca Y-TECH em materiais não aprovados</li>
                  <li>Praticar qualquer forma de fraude ou manipulação do sistema</li>
                  <li>Pressionar ou coagir pessoas para efetuar cadastros</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Materiais de Divulgação</h2>
                <p>
                  A Y-TECH disponibiliza materiais oficiais de marketing através do painel do revendedor:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Link personalizado de indicação</li>
                  <li>Artes para redes sociais</li>
                  <li>Textos prontos para WhatsApp</li>
                  <li>QR Codes personalizados</li>
                </ul>
                <p className="mt-4">
                  O uso de materiais não oficiais é de responsabilidade exclusiva do revendedor.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Responsabilidades Fiscais</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O revendedor é responsável pela declaração de seus ganhos junto à Receita Federal</li>
                  <li>Comissões acima de R$ 1.903,98/mês podem estar sujeitas à tributação de Imposto de Renda</li>
                  <li>A Y-TECH fornece relatório anual de rendimentos para fins de declaração</li>
                  <li>Recomenda-se consultar um contador para orientação fiscal adequada</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">10. Penalidades</h2>
                <p>
                  O descumprimento deste regulamento pode resultar em:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li><strong>Advertência:</strong> Comunicação formal sobre a infração</li>
                  <li><strong>Suspensão temporária:</strong> Bloqueio do programa de indicação por prazo determinado</li>
                  <li><strong>Cancelamento:</strong> Exclusão definitiva do programa com perda de comissões pendentes</li>
                  <li><strong>Ação judicial:</strong> Em casos de fraude ou danos à Y-TECH</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">11. Alterações no Programa</h2>
                <p>
                  A Y-TECH reserva-se o direito de:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Alterar valores de comissões com aviso prévio de 30 dias</li>
                  <li>Modificar regras do programa mediante comunicação prévia</li>
                  <li>Encerrar o programa de indicação a qualquer momento, respeitando comissões já adquiridas</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">12. Independência</h2>
                <p>
                  O revendedor atua como parceiro independente, não havendo qualquer vínculo empregatício com a Y-TECH. O revendedor:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Não é funcionário, representante comercial ou franqueado da Y-TECH</li>
                  <li>Não possui poderes para assumir compromissos em nome da Y-TECH</li>
                  <li>É responsável por seus próprios custos operacionais e impostos</li>
                  <li>Define seus próprios horários e métodos de trabalho</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">13. Suporte</h2>
                <p>
                  Para dúvidas sobre o programa de indicação:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>WhatsApp: +55 11 99486-9948</li>
                  <li>Painel do revendedor: https://ytech.yrwentechnology.com.br</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mt-8 mb-4">14. Disposições Finais</h2>
                <p>
                  Este regulamento é complementar aos Termos de Uso e à Política de Privacidade da Y-TECH. Em caso de conflito, prevalecerão as disposições mais específicas deste regulamento para assuntos relacionados ao programa de indicação.
                </p>
                <p className="mt-4">
                  Ao participar do programa, o revendedor declara estar ciente e de acordo com todas as condições aqui estabelecidas.
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

export default RegulamentoMMN;
