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
  ArrowRight,
  Building2,
  MapPin,
  Quote,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/Footer";
import { VideoBackground } from "@/components/ui/video-background";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ceoPhoto from "@/assets/ceo-photo.jpeg";

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
        { text: "2 planos: 160GB ou 250GB Rural", positive: true },
        { text: "Redes sociais ilimitadas", positive: true },
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
      description: "Escolha o plano 160GB ou Rural 250GB e receba seu eSIM em até 48h.",
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
    { icon: Smartphone, title: "Redes Sociais Ilimitadas", description: "WhatsApp, Instagram, Facebook, YouTube e mais sem gastar dados" },
    { icon: Zap, title: "2 Opções de Plano", description: "160GB Smartphone ou 250GB Rural Acumulativo - ambos por R$129,99" },
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

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">160GB</div>
              <div className="text-sm text-gray-400">Plano Smartphone</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-400">250GB</div>
              <div className="text-sm text-gray-400">Plano Rural</div>
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

          <div className="mt-12">
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-primary/50">
                <CardContent className="p-6 text-center">
                  <Badge className="mb-3 bg-primary/30 text-primary border-primary/50">Mais Popular</Badge>
                  <div className="text-4xl font-bold text-white mb-2">R$129,99<span className="text-lg text-gray-400">/mês</span></div>
                  <p className="text-gray-300 font-semibold">Plano Smartphone 160GB</p>
                  <p className="text-gray-400 text-sm mt-2">Ideal para uso urbano e residencial</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  ACUMULATIVO
                </div>
                <CardContent className="p-6 text-center">
                  <Badge className="mb-3 bg-green-500/30 text-green-400 border-green-500/50">Área Rural</Badge>
                  <div className="text-4xl font-bold text-white mb-2">R$129,99<span className="text-lg text-gray-400">/mês</span></div>
                  <p className="text-gray-300 font-semibold">Plano Rural 250GB</p>
                  <p className="text-green-400 text-sm mt-2 font-medium">GB acumulam se não usar!</p>
                  <p className="text-gray-500 text-xs mt-1">Os dados não utilizados somam ao próximo mês</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-center text-gray-500 text-sm mt-6">
              Ambos os planos dão direito a participar do programa de indicações e ganhar comissões
            </p>
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

          <div className="max-w-4xl mx-auto px-4 sm:px-2">
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <CardContent className="p-4 sm:p-6 md:p-8 overflow-hidden">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                  {/* Controls */}
                  <div className="space-y-6 sm:space-y-8 overflow-hidden">
                    <div className="overflow-hidden">
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <label className="text-white font-medium text-sm sm:text-base leading-tight flex-1 min-w-0">Suas indicações diretas (Nível 1)</label>
                        <span className="text-primary font-bold text-lg sm:text-xl flex-shrink-0 min-w-[32px] text-right">{directReferrals[0]}</span>
                      </div>
                      <Slider
                        value={directReferrals}
                        onValueChange={setDirectReferrals}
                        max={50}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-gray-500 text-xs sm:text-sm mt-2">Pessoas que você indica diretamente</p>
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex justify-between items-start mb-4 gap-3">
                        <label className="text-white font-medium text-sm sm:text-base leading-tight flex-1 min-w-0">Indicações por pessoa (Níveis 2-4)</label>
                        <span className="text-primary font-bold text-lg sm:text-xl flex-shrink-0 min-w-[32px] text-right">{indirectPerDirect[0]}</span>
                      </div>
                      <Slider
                        value={indirectPerDirect}
                        onValueChange={setIndirectPerDirect}
                        max={20}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-gray-500 text-xs sm:text-sm mt-2">Média de indicações de cada pessoa</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 sm:p-4 space-y-3 overflow-hidden">
                      <div className="flex flex-col xs:flex-row xs:justify-between text-xs sm:text-sm gap-1">
                        <span className="text-gray-400 break-words">Nível 1 ({directReferrals[0]} pessoas × R$26)</span>
                        <span className="text-white font-medium">R${level1Earnings.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col xs:flex-row xs:justify-between text-xs sm:text-sm gap-1">
                        <span className="text-gray-400 break-words">Níveis 2-4 ({level2to4Referrals} pessoas × R$5)</span>
                        <span className="text-white font-medium">R${level2to4Earnings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex flex-col justify-center overflow-hidden">
                    <div className="text-center bg-gradient-to-br from-primary/20 to-green-500/20 rounded-2xl p-5 sm:p-8 border border-primary/30 overflow-hidden">
                      <p className="text-gray-400 mb-2 text-sm sm:text-base">Ganho Mensal Estimado</p>
                      <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 break-words">
                        R${totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="border-t border-white/20 pt-4 mt-4">
                        <p className="text-gray-400 text-xs sm:text-sm">Projeção Anual</p>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary break-words">
                          R${totalAnnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-500 text-xs text-center mt-4 px-2">
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

      {/* Video Presentation Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/85 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Rocket className="w-4 h-4 mr-2 inline" />
              Apresentação
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Conheça a Y-TECH</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Assista ao vídeo e entenda como funciona nossa oportunidade de negócio e sistema de internet 5G.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20">
              <video 
                controls 
                className="w-full aspect-video bg-black"
                poster=""
                preload="metadata"
              >
                <source 
                  src="https://fkdaaxaybuynohmnatdv.supabase.co/storage/v1/object/public/videos//video1ytech.mp4" 
                  type="video/mp4" 
                />
                Seu navegador não suporta vídeos HTML5.
              </video>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm">Internet 5G Vivo</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm">Ganhos Recorrentes</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-300 text-sm">Sem Fidelidade</span>
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

      {/* Testimonials Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-primary/10 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
              <Users className="w-4 h-4 mr-2 inline" />
              Depoimentos Reais
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Quem Usa, Recomenda</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Clientes e parceiros que estão conosco há anos e transformaram suas vidas com a Y-TECH.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Testimonial 1 - Rural Client */}
            <Card className="bg-white/5 border-green-500/30 hover:border-green-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-green-500/30 mb-3" />
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "Moro em uma fazenda no interior de Minas Gerais e há <span className="text-green-400 font-semibold">7 anos</span> uso a internet da Y-TECH. 
                  Antes, não tinha como acompanhar o mercado de gado nem fazer transferências bancárias. 
                  Hoje, administro tudo pelo celular. <span className="text-white font-semibold">Mudou minha vida!</span>"
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold">José Antônio M.</p>
                  <p className="text-green-400 text-sm">Produtor Rural • Araxá, MG</p>
                  <p className="text-gray-500 text-xs mt-1">Cliente desde 2018</p>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 2 - Rural Client */}
            <Card className="bg-white/5 border-green-500/30 hover:border-green-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-green-500/30 mb-3" />
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "No sítio da família, nenhuma operadora chegava. A Y-TECH foi a <span className="text-green-400 font-semibold">única solução</span> que funcionou. 
                  Uso há <span className="text-green-400 font-semibold">quase 8 anos</span> e nunca me deixou na mão. 
                  Meus filhos conseguem estudar online e eu monitoro a irrigação pelo app. <span className="text-white font-semibold">Recomendo demais!</span>"
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold">Maria das Graças S.</p>
                  <p className="text-green-400 text-sm">Agricultora • Itapeva, SP</p>
                  <p className="text-gray-500 text-xs mt-1">Cliente desde 2017</p>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 3 - MLM Partner */}
            <Card className="bg-white/5 border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-primary/30 mb-3" />
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "Comecei indicando para a família na roça e hoje tenho uma <span className="text-primary font-semibold">rede com mais de 200 pessoas</span>. 
                  A renda extra todo mês me ajudou a realizar o sonho de comprar meu carro. 
                  <span className="text-white font-semibold">O produto se vende sozinho porque funciona de verdade!</span>"
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold">Carlos Eduardo F.</p>
                  <p className="text-primary text-sm">Parceiro MMN • Ribeirão Preto, SP</p>
                  <p className="text-gray-500 text-xs mt-1">Parceiro desde 2019</p>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 4 - Rural Client */}
            <Card className="bg-white/5 border-green-500/30 hover:border-green-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-green-500/30 mb-3" />
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "Tenho uma pousada rural e a internet era o maior problema. 
                  Com a Y-TECH, ofereço <span className="text-green-400 font-semibold">Wi-Fi de qualidade</span> para os hóspedes. 
                  São <span className="text-green-400 font-semibold">6 anos</span> de parceria e minhas avaliações no Booking subiram muito!"
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold">Fernanda C.</p>
                  <p className="text-green-400 text-sm">Proprietária de Pousada • Serra Negra, SP</p>
                  <p className="text-gray-500 text-xs mt-1">Cliente desde 2019</p>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 5 - Rural Community */}
            <Card className="bg-white/5 border-green-500/30 hover:border-green-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-green-500/30 mb-3" />
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "Sou presidente da associação de moradores e trouxemos a Y-TECH para nossa comunidade rural. 
                  Hoje, <span className="text-green-400 font-semibold">mais de 50 famílias</span> têm internet pela primeira vez. 
                  <span className="text-white font-semibold">A Y-TECH leva conexão onde ninguém mais chega!</span>"
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold">Antônio Roberto L.</p>
                  <p className="text-green-400 text-sm">Líder Comunitário • Formosa, GO</p>
                  <p className="text-gray-500 text-xs mt-1">Comunidade conectada desde 2020</p>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 6 - MLM Success */}
            <Card className="bg-white/5 border-primary/30 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-primary/30 mb-3" />
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "Trabalhava em escritório e hoje <span className="text-primary font-semibold">vivo das comissões da Y-TECH</span>. 
                  Minha rede cresceu porque o produto é sério e a empresa tem <span className="text-primary font-semibold">quase 8 anos de história</span>. 
                  <span className="text-white font-semibold">Não é promessa, é realidade!</span>"
                </p>
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white font-semibold">Patrícia M.</p>
                  <p className="text-primary text-sm">Top Líder MMN • São Paulo, SP</p>
                  <p className="text-gray-500 text-xs mt-1">Parceira desde 2020</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Banner */}
          <div className="mt-12 bg-gradient-to-r from-green-500/20 to-primary/20 rounded-2xl p-8 border border-white/10 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-white">8</div>
                <div className="text-gray-400 text-sm">Anos de Mercado</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-green-400">5.000+</div>
                <div className="text-gray-400 text-sm">Clientes Rurais</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
                <div className="text-gray-400 text-sm">Satisfação</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-yellow-400">4.9</div>
                <div className="text-gray-400 text-sm">Nota Média</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CEO & Company Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/90 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Building2 className="w-4 h-4 mr-2 inline" />
              Quem Somos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">A Empresa por Trás da Y-TECH</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Conheça a história de sucesso que construiu a maior operadora virtual do Brasil.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* CEO Photo */}
              <div className="relative">
                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 shadow-2xl shadow-primary/20">
                  <img 
                    src={ceoPhoto} 
                    alt="Carlo Edvandro Camera Gonçalves - CEO da Yrwen Technology"
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white">Carlo Edvandro Camera Gonçalves</h3>
                    <p className="text-primary font-semibold">CEO & Fundador - Yrwen Technology</p>
                  </div>
                </div>
              </div>

              {/* CEO Story */}
              <div className="space-y-6">
                <div className="relative">
                  <Quote className="w-12 h-12 text-primary/30 absolute -top-2 -left-4" />
                  <div className="space-y-4 text-gray-300 leading-relaxed pl-8">
                    <p>
                      A <span className="text-primary font-semibold">Y-TECH</span> é um produto da{" "}
                      <span className="text-white font-semibold">Yrwen Technology</span>, empresa com{" "}
                      <span className="text-primary font-semibold">quase 8 anos de experiência</span> no mercado de telecomunicações.
                    </p>
                    <p>
                      Nosso CEO, <span className="text-white font-semibold">Carlo Edvandro</span>, foi o{" "}
                      <span className="text-primary font-semibold">segundo maior executivo da Chip Livre</span> e{" "}
                      <span className="text-white font-semibold">proprietário do centro de distribuição da região Sudeste inteira</span> — 
                      tornando-se o <span className="text-primary font-semibold">maior distribuidor de chips da Chip Livre em todo o Brasil</span>.
                    </p>
                    <p>
                      Desde então, Carlo tem <span className="text-white font-semibold">liderado o mercado de planos rurais</span>, 
                      conectando milhares de famílias em áreas remotas do país. Agora, com o{" "}
                      <span className="text-primary font-semibold">Marketing Multinível</span>, a Y-TECH veio para ficar, 
                      oferecendo uma oportunidade real de renda para todos.
                    </p>
                  </div>
                </div>

                {/* Company Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">CNPJ</p>
                          <p className="text-white font-mono text-sm">30.266.458/0001-58</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">Localização</p>
                          <p className="text-white text-sm">Guarulhos, SP</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Full Address */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">Endereço Comercial</p>
                      <p className="text-white">Rua Imperial, 183 - Parque das Nações</p>
                      <p className="text-gray-300">Guarulhos - São Paulo, Brasil</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 bg-black/80 z-0" />
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
              <HelpCircle className="w-4 h-4 mr-2 inline" />
              Dúvidas Frequentes
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Tire suas dúvidas sobre os planos, sistema de indicação e como funciona a Y-TECH.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Qual a diferença entre o Plano 160GB e o Plano Rural 250GB?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  O <span className="text-primary font-semibold">Plano 160GB</span> é ideal para uso urbano e residencial, com 160GB mensais. 
                  Já o <span className="text-green-400 font-semibold">Plano Rural 250GB</span> é voltado para áreas rurais e possui uma vantagem especial: 
                  os GB são <span className="text-white font-semibold">acumulativos</span> — se você não usar toda a franquia, ela soma ao próximo mês! 
                  Ambos custam R$129,99/mês e dão direito a participar do programa de indicações.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Preciso pagar para me cadastrar?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <span className="text-green-400 font-semibold">Não!</span> O cadastro é 100% gratuito. 
                  Você só paga quando ativar seu plano de internet (R$129,99/mês). 
                  O cadastro serve apenas para reservar seu lugar na rede e gerar seu link de indicação após a ativação.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Posso indicar pessoas sem ter um plano ativo?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <span className="text-red-400 font-semibold">Não.</span> Para indicar pessoas e gerar comissões, você precisa estar com o plano ativo. 
                  Isso porque seu <span className="text-white font-semibold">link de indicação só é gerado após a ativação</span> do plano. 
                  Você pode se cadastrar gratuitamente, mas para começar a construir sua rede, precisa ativar o plano primeiro.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Como funcionam as comissões?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Você ganha comissões em <span className="text-primary font-semibold">4 níveis</span>:
                  <ul className="mt-2 space-y-1">
                    <li>• <span className="text-white font-semibold">Nível 1 (indicação direta):</span> R$26,00 por pessoa</li>
                    <li>• <span className="text-white font-semibold">Nível 2:</span> R$5,00 por pessoa</li>
                    <li>• <span className="text-white font-semibold">Nível 3:</span> R$5,00 por pessoa</li>
                    <li>• <span className="text-white font-semibold">Nível 4:</span> R$5,00 por pessoa</li>
                  </ul>
                  <p className="mt-2">As comissões são recorrentes — você ganha toda vez que seus indicados renovam o plano!</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Como faço para sacar minhas comissões?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Os saques são feitos via <span className="text-primary font-semibold">PIX</span> para conta de mesma titularidade. 
                  <ul className="mt-2 space-y-1">
                    <li>• <span className="text-white font-semibold">Valor mínimo:</span> R$200,00</li>
                    <li>• <span className="text-white font-semibold">Taxa:</span> 3% do valor</li>
                    <li>• <span className="text-white font-semibold">Solicitação:</span> toda sexta-feira pelo escritório virtual</li>
                    <li>• <span className="text-white font-semibold">Crédito:</span> até a terça-feira seguinte</li>
                  </ul>
                  <p className="mt-2">Você também pode usar o saldo para pagar a mensalidade de qualquer associado da sua rede!</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Como é feita a ativação do chip/eSIM?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  A ativação é <span className="text-green-400 font-semibold">100% remota, automatizada</span> e feita em até 48 horas:
                  <ul className="mt-2 space-y-1">
                    <li>• <span className="text-white font-semibold">Chip físico:</span> Compre um chip Vivo em qualquer loja, tire foto do código de barras (com embalagem fechada).</li>
                    <li>• <span className="text-white font-semibold">eSIM:</span> Digite *#06# no celular, tire print do código EID (32 números).</li>
                  </ul>
                  <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                    <p className="text-primary font-semibold mb-2">📤 Como enviar?</p>
                    <p>Envie a foto ou print pelo <span className="text-white font-semibold">Escritório Virtual</span>, no menu lateral <span className="text-white font-semibold">"SIM CARD e eSIM"</span>.</p>
                    <p className="mt-2 text-sm text-gray-400">
                      ✨ <span className="text-primary">Sistema 100% automatizado com Inteligência Artificial</span> — 
                      nossa IA lê os dados da imagem automaticamente e entrega o pedido de ativação diretamente para o setor responsável!
                    </p>
                  </div>
                  <p className="mt-3 text-yellow-400">⚠️ Importante: Nunca insira o chip antes da ativação pela Y-TECH!</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Qual operadora a Y-TECH utiliza?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  Utilizamos a infraestrutura da <span className="text-primary font-semibold">operadora Vivo</span>, 
                  garantindo a melhor cobertura 5G nacional. Você terá acesso à mesma qualidade de rede da Vivo, 
                  com planos mais acessíveis e a oportunidade de ganhar indicando.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  Tem fidelidade ou multa para cancelar?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <span className="text-green-400 font-semibold">Não!</span> Nossos planos são pré-pagos e <span className="text-white font-semibold">sem fidelidade</span>. 
                  Você pode cancelar quando quiser, sem multas ou taxas. 
                  Se não renovar, o plano simplesmente não é renovado no próximo mês.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  As redes sociais realmente não consomem dados?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <span className="text-green-400 font-semibold">Sim!</span> As seguintes redes sociais são <span className="text-white font-semibold">ilimitadas</span> e não consomem sua franquia:
                  <ul className="mt-2 space-y-1">
                    <li>• WhatsApp, Telegram</li>
                    <li>• Instagram, Facebook, TikTok</li>
                    <li>• YouTube, Spotify</li>
                  </ul>
                  <p className="mt-2 text-gray-400">Obs: Streaming como Netflix, HBO e IPTV consomem a franquia normalmente.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10" className="bg-white/5 border border-white/10 rounded-xl px-6">
                <AccordionTrigger className="text-white hover:text-primary text-left">
                  A Y-TECH é uma empresa confiável?
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <span className="text-green-400 font-semibold">Sim!</span> A Y-TECH é um produto da <span className="text-white font-semibold">Yrwen Technology</span>, 
                  empresa com <span className="text-primary font-semibold">quase 8 anos de experiência</span> no mercado de telecomunicações. 
                  Nosso CEO, Carlo Edvandro, foi o maior distribuidor da Chip Livre no Brasil e lidera o mercado de planos rurais há anos. 
                  CNPJ: 30.266.458/0001-58 | Sede: Guarulhos, SP.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-black/90 z-0" />
        <div className="container mx-auto relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto para Fazer Parte?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de pessoas que já estão economizando e ganhando com a Y-TECH.
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Como se cadastrar?</h3>
            <p className="text-gray-300 mb-6">
              O cadastro na Y-TECH é feito através de um <span className="text-primary font-semibold">link de indicação</span>. 
              Se você conhece alguém que já é parceiro Y-TECH, peça o link de indicação para essa pessoa.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Ainda não conhece ninguém? Sem problemas! Você pode se cadastrar diretamente com a Y-TECH:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-2">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-10 py-6 bg-white text-black hover:bg-gray-100 whitespace-nowrap" asChild>
                <a href="https://ytech.yrwentechnology.com.br/cadastro?ref=ytech" target="_blank" rel="noopener noreferrer">
                  Cadastrar com Y-TECH
                  <ArrowRight className="ml-2 h-5 w-5 flex-shrink-0" />
                </a>
              </Button>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            Cadastro 100% gratuito. Sem compromisso.
          </p>
          <p className="text-gray-600 text-xs mt-4">
            Utilizamos a infraestrutura de rede da operadora Vivo para garantir a melhor cobertura 5G nacional.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default APN;
