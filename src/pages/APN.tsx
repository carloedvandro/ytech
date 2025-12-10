import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Wifi, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ChevronRight, 
  CheckCircle2, 
  Zap,
  Shield,
  Clock,
  Smartphone,
  Globe,
  Award,
  Target,
  Rocket,
  Star,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { VideoBackground } from "@/components/ui/video-background";

const APN = () => {
  const [directReferrals, setDirectReferrals] = useState([10]);
  const [indirectPerDirect, setIndirectPerDirect] = useState([5]);

  // Cálculo de ganhos
  const level1Earnings = directReferrals[0] * 26; // R$26 por indicação direta
  const level2to4Referrals = directReferrals[0] * indirectPerDirect[0] * 3; // 3 níveis indiretos
  const level2to4Earnings = level2to4Referrals * 5; // R$5 por indicação indireta
  const totalMonthly = level1Earnings + level2to4Earnings;
  const totalAnnual = totalMonthly * 12;

  const competitors = [
    {
      name: "Operadoras Tradicionais",
      features: [
        { text: "Chip físico enviado pelos Correios", negative: true },
        { text: "Ativação em até 15 dias úteis", negative: true },
        { text: "Sem programa de indicação", negative: true },
        { text: "Planos a partir de R$50", neutral: true },
        { text: "Suporte via 0800", neutral: true },
      ]
    },
    {
      name: "Y-TECH 5G",
      features: [
        { text: "eSIM ativado remotamente", positive: true },
        { text: "Ativação em até 48 horas", positive: true },
        { text: "Ganhos em 4 níveis de indicação", positive: true },
        { text: "160GB por R$129,99/mês", positive: true },
        { text: "Suporte via WhatsApp 24/7", positive: true },
      ]
    }
  ];

  const journey = [
    {
      step: 1,
      title: "Cadastro Gratuito",
      description: "Faça seu cadastro em menos de 2 minutos. Sem burocracia.",
      icon: Smartphone
    },
    {
      step: 2,
      title: "Ative seu Plano",
      description: "Escolha o plano 160GB e receba seu eSIM em até 48h.",
      icon: Zap
    },
    {
      step: 3,
      title: "Comece a Indicar",
      description: "Compartilhe seu link exclusivo e ganhe por cada indicação.",
      icon: Users
    },
    {
      step: 4,
      title: "Construa sua Rede",
      description: "Seus indicados também indicam, e você ganha até o 4º nível.",
      icon: TrendingUp
    },
    {
      step: 5,
      title: "Saques Semanais",
      description: "Receba suas comissões via PIX toda semana.",
      icon: DollarSign
    }
  ];

  const productBenefits = [
    { icon: Wifi, title: "Internet 5G", description: "Velocidade ultrarrápida para streaming, jogos e trabalho" },
    { icon: Globe, title: "Cobertura Nacional", description: "Conectado em todo o Brasil com a melhor tecnologia" },
    { icon: Shield, title: "Sem Fidelidade", description: "Cancele quando quiser, sem multas ou taxas" },
    { icon: Clock, title: "Ativação Rápida", description: "eSIM ativado em até 48 horas úteis" },
  ];

  const opportunityBenefits = [
    { icon: DollarSign, title: "R$26 por Indicação", description: "Ganhe a cada pessoa que ativar pelo seu link" },
    { icon: Users, title: "4 Níveis de Comissão", description: "Ganhe R$5 por pessoa nos níveis 2, 3 e 4" },
    { icon: Award, title: "Renda Recorrente", description: "Ganhe mensalmente enquanto seus indicados estiverem ativos" },
    { icon: Target, title: "Sem Estoque", description: "Não precisa comprar produtos, apenas indicar" },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative">
      <VideoBackground videoUrl="https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//videooficialytech.mp4" />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 z-0" />
        
        <div className="container mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 text-sm px-4 py-2">
            <Star className="w-4 h-4 mr-2 inline" />
            Oportunidade Exclusiva
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
              Internet 5G
            </span>
            <br />
            <span className="text-white">+ Renda Extra</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Use a melhor internet do Brasil e ganhe dinheiro indicando para amigos e família. 
            <span className="text-primary font-semibold"> Até R$26 por indicação!</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90" asChild>
              <Link to="/cadastro">
                Quero Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white/30 hover:bg-white/10" asChild>
              <a href="#simulador">
                Simular Ganhos
                <TrendingUp className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">160GB</div>
              <div className="text-sm text-gray-400">de internet</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">R$26</div>
              <div className="text-sm text-gray-400">por indicação</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">4</div>
              <div className="text-sm text-gray-400">níveis de ganho</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Benefits Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/80 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
              <Wifi className="w-4 h-4 mr-2 inline" />
              O Produto
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Internet 5G de Verdade</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Tecnologia eSIM de última geração, sem chip físico, sem espera.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {productBenefits.map((benefit, index) => (
              <Card key={index} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Card className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-primary/30 inline-block">
              <CardContent className="p-8">
                <div className="text-5xl font-bold text-white mb-2">R$129,99<span className="text-xl text-gray-400">/mês</span></div>
                <p className="text-gray-300">Plano Smartphone 160GB</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Opportunity Benefits Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-primary/10 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
              <TrendingUp className="w-4 h-4 mr-2 inline" />
              A Oportunidade
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ganhe Indicando</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Transforme sua rede de contatos em uma fonte de renda recorrente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {opportunityBenefits.map((benefit, index) => (
              <Card key={index} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Income Simulator Section */}
      <section id="simulador" className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/90 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <DollarSign className="w-4 h-4 mr-2 inline" />
              Simulador de Ganhos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Calcule seu Potencial</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Arraste os controles e veja quanto você pode ganhar.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-12">
                  {/* Controls */}
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between mb-4">
                        <label className="text-white font-medium">Suas indicações diretas (Nível 1)</label>
                        <span className="text-primary font-bold text-xl">{directReferrals[0]}</span>
                      </div>
                      <Slider
                        value={directReferrals}
                        onValueChange={setDirectReferrals}
                        max={50}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-gray-500 text-sm mt-2">Pessoas que você indica diretamente</p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-4">
                        <label className="text-white font-medium">Indicações por pessoa (Níveis 2-4)</label>
                        <span className="text-primary font-bold text-xl">{indirectPerDirect[0]}</span>
                      </div>
                      <Slider
                        value={indirectPerDirect}
                        onValueChange={setIndirectPerDirect}
                        max={20}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-gray-500 text-sm mt-2">Média de indicações de cada pessoa</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Nível 1 ({directReferrals[0]} pessoas × R$26)</span>
                        <span className="text-white">R${level1Earnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Níveis 2-4 ({level2to4Referrals} pessoas × R$5)</span>
                        <span className="text-white">R${level2to4Earnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex flex-col justify-center">
                    <div className="text-center bg-gradient-to-br from-primary/20 to-green-500/20 rounded-2xl p-8 border border-primary/30">
                      <p className="text-gray-400 mb-2">Ganho Mensal Estimado</p>
                      <div className="text-5xl md:text-6xl font-bold text-white mb-4">
                        R${totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="border-t border-white/20 pt-4 mt-4">
                        <p className="text-gray-400 text-sm">Projeção Anual</p>
                        <div className="text-2xl font-bold text-primary">
                          R${totalAnnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-500 text-xs text-center mt-4">
                      *Valores estimados baseados em indicações ativas. Resultados podem variar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/80 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Rocket className="w-4 h-4 mr-2 inline" />
              Sua Jornada
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Começar</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Em 5 passos simples, você começa a construir sua renda extra.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-green-500 transform -translate-y-1/2" />
              
              <div className="grid md:grid-cols-5 gap-6">
                {journey.map((item, index) => (
                  <div key={index} className="relative text-center group">
                    <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-primary/30">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 group-hover:border-primary/50 transition-colors">
                      <div className="text-primary font-bold text-sm mb-1">Passo {item.step}</div>
                      <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                      <p className="text-gray-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-primary/10 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-red-500/20 text-red-400 border-red-500/30">
              <Target className="w-4 h-4 mr-2 inline" />
              Comparativo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que Y-TECH?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Veja a diferença entre as operadoras tradicionais e a Y-TECH.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {competitors.map((competitor, index) => (
              <Card 
                key={index} 
                className={`${index === 1 ? 'bg-gradient-to-br from-primary/20 to-blue-500/10 border-primary/50' : 'bg-white/5 border-white/10'}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    {index === 1 && <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />}
                    <h3 className="text-xl font-bold text-white">{competitor.name}</h3>
                  </div>
                  <ul className="space-y-4">
                    {competitor.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-3">
                        {feature.positive ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : feature.negative ? (
                          <ChevronRight className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`${feature.positive ? 'text-white' : feature.negative ? 'text-gray-400' : 'text-gray-300'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-black/90 z-0" />
        <div className="container mx-auto relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para Começar?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já estão economizando e ganhando com a Y-TECH.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-10 py-6 bg-white text-black hover:bg-gray-100" asChild>
              <Link to="/cadastro">
                Criar Minha Conta Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            Cadastro 100% gratuito. Sem compromisso.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default APN;
