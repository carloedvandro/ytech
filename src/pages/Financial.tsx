import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Loader2, DollarSign, TrendingUp, Clock, CheckCircle2, Settings, AlertCircle, Calendar, Wallet, Info } from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BalanceAdjustmentsHistory } from "@/components/BalanceAdjustmentsHistory";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Commission {
  id: string;
  amount: number;
  level: number;
  status: string;
  created_at: string;
  referred_user_id: string;
  referred_user_name?: string;
}

interface UserPlan {
  status: string;
  plan_end_date: string | null;
  next_renewal_date: string | null;
  amount?: number;
  metadata?: {
    discount_applied?: number;
    original_amount?: number;
    asaas_payment_id?: string;
  };
}

const Financial = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [balance, setBalance] = useState({
    total: 0,
    available: 0,
    pending: 0,
  });
  const [pixKey, setPixKey] = useState("");
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fixingCommissions, setFixingCommissions] = useState(false);
  const [useBalanceForRenewal, setUseBalanceForRenewal] = useState(false);
  const [minimumBalanceToKeep, setMinimumBalanceToKeep] = useState("0");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [commissionToDelete, setCommissionToDelete] = useState<string | null>(null);
  const [deletingCommission, setDeletingCommission] = useState(false);

  // ID do usuário ativo (impersonado ou real)
  const activeUserId = isImpersonating && impersonatedUser ? impersonatedUser.id : user?.id;

  useEffect(() => {
    if (!activeUserId) return;
    
    loadFinancialData();
    loadRenewalPreferences();
    checkAdminRole();

    // Escutar por novas comissões em tempo real
    const channel = supabase
      .channel('financial-commissions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commissions',
          filter: `user_id=eq.${activeUserId}`
        },
        (payload) => {
          console.log('Nova comissão recebida no financeiro!', payload);
          loadFinancialData(); // Recarregar dados
          toast({
            title: "Nova comissão!",
            description: `Você recebeu R$ ${Number(payload.new.amount).toFixed(2)}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId]);

  const checkAdminRole = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Erro ao verificar role:", error);
    }
  };

  const loadRenewalPreferences = async () => {
    try {
      if (!activeUserId) return;

      const { data, error } = await supabase
        .from("user_renewal_preferences")
        .select("*")
        .eq("user_id", activeUserId)
        .maybeSingle();

      if (!error && data) {
        setUseBalanceForRenewal(data.use_balance_for_renewal);
        setMinimumBalanceToKeep(data.minimum_balance_to_keep?.toString() || "0");
      }
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
    }
  };

  const saveRenewalPreferences = async () => {
    setSavingPreferences(true);
    try {
      if (!activeUserId) return;

      const { error } = await supabase
        .from("user_renewal_preferences")
        .upsert({
          user_id: activeUserId,
          use_balance_for_renewal: useBalanceForRenewal,
          minimum_balance_to_keep: parseFloat(minimumBalanceToKeep) || 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Se ativou o uso de saldo, aplicar desconto na fatura pendente
      if (useBalanceForRenewal) {
        console.log('🔄 Aplicando desconto na fatura pendente...');
        const { data: applyData, error: applyError } = await supabase.functions.invoke(
          'apply-renewal-discount',
          {
            body: { userId: activeUserId }
          }
        );

        if (applyError) {
          console.error('Erro ao aplicar desconto:', applyError);
          toast({
            title: "Preferências salvas!",
            description: "Configurações salvas, mas não foi possível aplicar o desconto automaticamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sucesso!",
            description: applyData?.message || "Preferências salvas e desconto aplicado!",
          });
        }
      } else {
        toast({
          title: "Preferências salvas!",
          description: "Suas configurações de renovação foram atualizadas.",
        });
      }

      // Recarregar dados financeiros
      await loadFinancialData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const loadFinancialData = async () => {
    try {
      if (!activeUserId) return;

      // Buscar dados atualizados do usuário
      const { data: userInfo } = await supabase
        .from("profiles")
        .select("status, metadata")
        .eq("id", activeUserId)
        .maybeSingle();

      // Buscar último pagamento (completed ou cancelled com metadata de desconto)
      const { data: payments } = await supabase
        .from("payments")
        .select("next_renewal_date, subscription_id, status, amount, metadata")
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Priorizar payment completed com subscription, depois qualquer um com desconto aplicado
      const lastPayment = payments?.find(p => p.status === 'completed' && p.subscription_id) || 
                         payments?.find(p => (p.metadata as any)?.discount_applied) ||
                         payments?.[0];

      if (userInfo) {
        const metadata = userInfo.metadata as { plan_end_date?: string } | null;
        setUserPlan({
          status: userInfo.status,
          plan_end_date: metadata?.plan_end_date || null,
          next_renewal_date: lastPayment?.next_renewal_date || null,
          amount: lastPayment?.amount,
          metadata: lastPayment?.metadata as any,
        });
      }

      // Buscar comissões com nome do indicado
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select(`
          *,
          referred_user:profiles!commissions_referred_user_id_fkey(full_name)
        `)
        .eq("user_id", activeUserId)
        .order("created_at", { ascending: false});

      if (commissionsError) throw commissionsError;

      // Mapear dados para incluir o nome do usuário indicado
      const mappedCommissions = (commissionsData || []).map((c: any) => ({
        ...c,
        referred_user_name: c.referred_user?.full_name || 'Usuário não encontrado'
      }));

      setCommissions(mappedCommissions);

      // Buscar ajustes de saldo (adições e descontos)
      const { data: adjustmentsData } = await supabase
        .from("admin_balance_adjustments")
        .select("amount, type")
        .eq("user_id", activeUserId);

      // Calcular saldos - garantir conversão para número
      const total = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const commissionsAvailable = commissionsData?.filter(c => c.status === "available").reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pending = commissionsData?.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Calcular adições e remoções manuais - garantir conversão para número
      const additionsTotal = Number(adjustmentsData
        ?.filter(a => a.type === 'add')
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0);

      const deductionsTotal = Number(adjustmentsData
        ?.filter(a => a.type === 'remove')
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0);

      console.log('💰 Cálculo de saldo:', {
        commissionsAvailable,
        additionsTotal,
        deductionsTotal,
        formula: `${commissionsAvailable} + ${additionsTotal} - ${deductionsTotal}`
      });

      // Saldo disponível = comissões available + adições - remoções manuais
      const available = Number(commissionsAvailable) + Number(additionsTotal) - Number(deductionsTotal);
      
      console.log('✅ Saldo disponível calculado:', available);

      setBalance({ total, available, pending });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleEarlyRenewal = async () => {
    try {
      setIsWithdrawing(true);

      const { data, error } = await supabase.functions.invoke('create-renewal-payment', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Pagamento criado!",
        description: "Você será redirecionado para a página de pagamento",
      });

      // Redirecionar para página de pagamento
      setTimeout(() => {
        window.location.href = `/payment/${data.payment.id}`;
      }, 1000);
    } catch (error) {
      console.error('Error creating early renewal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar pagamento de renovação",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleWithdraw = async () => {
    // Verificar se é sexta-feira (5 = Friday)
    const today = new Date();
    const isFriday = today.getDay() === 5;

    if (!isFriday) {
      toast({
        title: "Saque não disponível",
        description: "Saques só podem ser realizados às sextas-feiras",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey) {
      toast({
        title: "Chave PIX obrigatória",
        description: "Informe sua chave PIX para saque",
        variant: "destructive",
      });
      return;
    }

    if (balance.available < 200) {
      toast({
        title: "Saldo insuficiente",
        description: "Saldo mínimo para saque é R$ 200,00",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      if (!user?.id) return;

      // Criar solicitação de saque
      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "withdrawal",
          amount: balance.available,
          net_amount: balance.available * 0.97,
          fee: balance.available * 0.03,
          pix_key: pixKey,
          pix_key_type: "unknown",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Processar transferência no Asaas
      const { error: asaasError } = await supabase.functions.invoke('create-asaas-transfer', {
        body: { transactionId: transaction.id },
      });

      if (asaasError) {
        toast({
          title: "Saque em processamento",
          description: "Sua solicitação será processada em até 48h",
        });
      } else {
        toast({
          title: "Saque processado!",
          description: "O pagamento será processado até terça-feira",
        });
      }

      setPixKey("");
      loadFinancialData();
    } catch (error: any) {
      toast({
        title: "Erro ao solicitar saque",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFixCommissions = async () => {
    if (!user?.id) return;
    
    setFixingCommissions(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-commission-status', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: data.message || "Comissões corrigidas",
      });

      // Recarregar dados
      await loadFinancialData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFixingCommissions(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const today = new Date();
  const isFriday = today.getDay() === 5;
  const canWithdraw = isFriday && balance.available >= 200;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">
            Gerencie suas comissões e saques
          </p>
        </div>

        {/* Renovação Antecipada */}
        {userPlan && userPlan.status === 'active' && userPlan.next_renewal_date && (
          <Card className="bg-gradient-to-br from-green-500/5 to-green-600/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Renovação Antecipada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                  <p className="text-lg font-semibold">
                    {new Date(userPlan.next_renewal_date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <Button
                  onClick={handleEarlyRenewal}
                  disabled={isWithdrawing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isWithdrawing ? "Processando..." : "Renovar Agora"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Antecipe sua renovação e estenda seu plano por mais 30 dias! 
                Sua assinatura automática continuará normalmente após a nova data.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Desconto na Próxima Fatura */}
        {userPlan && userPlan.metadata?.discount_applied && Number(userPlan.metadata.discount_applied) > 0 && (
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Desconto Aplicado na Próxima Fatura
              </CardTitle>
              <CardDescription>
                Seu saldo foi usado como desconto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor Original</p>
                  <p className="text-2xl font-bold">
                    R$ {Number(userPlan.metadata.original_amount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-muted-foreground">Desconto Aplicado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    - R$ {Number(userPlan.metadata.discount_applied).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-muted-foreground">Valor a Pagar</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {Number(userPlan.amount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Vencimento</p>
                  <p className="text-lg font-semibold">
                    {userPlan.next_renewal_date && new Date(userPlan.next_renewal_date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <Alert className="bg-blue-500/5 border-blue-500/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  Este valor foi descontado automaticamente do seu saldo disponível. 
                  Por isso você vê uma diferença entre "Total Recebido" e "Disponível".
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {userPlan && (
          <Card className="border-secondary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Plano</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {userPlan.status === "active" ? "Ativo" : "Pendente"}
              </div>
              {userPlan.plan_end_date && (
                <p className="text-xs text-muted-foreground">
                  Válido até: {new Date(userPlan.plan_end_date).toLocaleDateString('pt-BR')}
                </p>
              )}
              {userPlan.next_renewal_date && userPlan.status === "active" && (
                <p className="text-xs text-secondary font-medium mt-1">
                  📅 Próxima renovação: {new Date(userPlan.next_renewal_date).toLocaleDateString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50 border-[hsl(var(--glass-blue))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <AnimatedGradient colors={["#3b82f6", "#60a5fa", "#93c5fd"]} speed={0.05} blur="medium" />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold">R$ {balance.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Todas as comissões</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50 border-[hsl(var(--glass-green))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <AnimatedGradient colors={["#10b981", "#34d399", "#6ee7b7"]} speed={0.05} blur="medium" />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponível</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold text-secondary">R$ {balance.available.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Pronto para saque</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50 border-[hsl(var(--glass-yellow))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <AnimatedGradient colors={["#fbbf24", "#f59e0b", "#d97706"]} speed={0.05} blur="medium" />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold">R$ {balance.pending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Aguardando liberação</p>
            </CardContent>
          </Card>
        </div>

        {/* Preferências de Renovação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferências de Renovação
            </CardTitle>
            <CardDescription>
              Configure como seu saldo será usado nas renovações mensais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-balance">Usar saldo nas renovações</Label>
                <p className="text-sm text-muted-foreground">
                  Descontar automaticamente do saldo ao renovar
                </p>
              </div>
              <Switch
                id="use-balance"
                checked={useBalanceForRenewal}
                onCheckedChange={setUseBalanceForRenewal}
              />
            </div>

            {useBalanceForRenewal && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="minimum-balance">
                    Manter saldo mínimo de (R$)
                  </Label>
                  <Input
                    id="minimum-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumBalanceToKeep}
                    onChange={(e) => setMinimumBalanceToKeep(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor que será preservado no seu saldo
                  </p>
                </div>

                {/* Simulador */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>📊 Simulação da próxima renovação:</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>• Mensalidade: R$ 129,99</p>
                      <p>• Saldo disponível: R$ {balance.available.toFixed(2)}</p>
                      <p>• Saldo mínimo: R$ {parseFloat(minimumBalanceToKeep || "0").toFixed(2)}</p>
                      {(() => {
                        const minBalance = parseFloat(minimumBalanceToKeep || "0");
                        const availableForDiscount = Math.max(0, balance.available - minBalance);
                        
                        if (availableForDiscount >= 129.99) {
                          return (
                            <>
                              <p className="font-bold text-green-600 mt-2">
                                ✅ Pagamento será feito com seu saldo!
                              </p>
                              <p>• Você pagará: R$ 0,00</p>
                              <p>• Saldo após renovação: R$ {(balance.available - 129.99).toFixed(2)}</p>
                            </>
                          );
                        } else if (availableForDiscount >= 5) {
                          const discount = Math.min(availableForDiscount, 124.99);
                          return (
                            <>
                              <p className="font-bold text-blue-600 mt-2">
                                💰 Desconto: R$ {discount.toFixed(2)}
                              </p>
                              <p>• Você pagará: R$ {(129.99 - discount).toFixed(2)}</p>
                              <p>• Saldo após renovação: R$ {(balance.available - discount).toFixed(2)}</p>
                            </>
                          );
                        } else {
                          return (
                            <p className="text-amber-600 mt-2">
                              ⚠️ Saldo insuficiente para desconto (mínimo R$ 5,00)
                            </p>
                          );
                        }
                      })()}
                      {balance.available - parseFloat(minimumBalanceToKeep || "0") > 124.99 && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Por limitação do banco Asaas, o desconto máximo é de R$ 124,99 (valor mínimo de cobrança: R$ 5,00).
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={saveRenewalPreferences} 
                  disabled={savingPreferences}
                  className="w-full"
                >
                  {savingPreferences ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Preferências"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Ajustes de Saldo pelo Admin */}
        {activeUserId && (
          <BalanceAdjustmentsHistory userId={activeUserId} />
        )}

        {/* Botão Admin para corrigir comissões */}
        {isAdmin && balance.available === 0 && commissions.some(c => c.status === 'withdrawn') && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-yellow-700 dark:text-yellow-400">⚠️ Correção Necessária</CardTitle>
              <CardDescription className="text-yellow-600 dark:text-yellow-500">
                Detectamos comissões marcadas incorretamente como "sacadas". Clique para restaurar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleFixCommissions} 
                disabled={fixingCommissions}
                variant="outline"
                className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-950/50"
              >
                {fixingCommissions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Restaurar Status das Comissões
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Solicitar Saque</CardTitle>
            <CardDescription>
              Saque mínimo: R$ 200,00 | Disponível: Sextas-feiras | Taxa: 3%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isFriday && (
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                ⚠️ Saques só podem ser realizados às sextas-feiras
              </div>
            )}
            {isFriday && balance.available < 200 && (
              <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                ⚠️ Saldo insuficiente. Mínimo: R$ 200,00
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input
                id="pixKey"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                disabled={!canWithdraw}
              />
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={processing || !canWithdraw}
              className="w-full"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar Saque de R$ {balance.available.toFixed(2)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              💡 O pagamento será processado até, no máximo, terça-feira
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Comissões</CardTitle>
            <CardDescription>
              Suas comissões por indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Você ainda não possui comissões
              </p>
            ) : (
              <div className="space-y-4">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">
                        Comissão Nível {commission.level} - {commission.referred_user_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <div className="text-lg font-bold text-secondary">
                          R$ {Number(commission.amount).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {commission.status === "available" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-secondary" />
                              <span className="text-secondary">Disponível</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Pendente</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setCommissionToDelete(commission.id)}
                          disabled={deletingCommission}
                          className="ml-2"
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmação para deletar comissão */}
        <Dialog open={!!commissionToDelete} onOpenChange={(open) => !open && setCommissionToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover Comissão Duplicada</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover esta comissão? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!commissionToDelete) return;
                setDeletingCommission(true);
                try {
                  const { error } = await supabase.functions.invoke('remove-duplicate-commission', {
                    body: { commissionId: commissionToDelete },
                  });

                  if (error) throw error;

                  toast({
                    title: "Comissão removida",
                    description: "A comissão duplicada foi removida com sucesso.",
                  });
                  
                  setCommissionToDelete(null);
                  await loadFinancialData();
                } catch (error) {
                  console.error('Erro ao remover comissão:', error);
                  toast({
                    title: "Erro",
                    description: error instanceof Error ? error.message : "Erro ao remover comissão",
                    variant: "destructive",
                  });
                } finally {
                  setDeletingCommission(false);
                }
              }}
              disabled={deletingCommission}
            >
              {deletingCommission ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Confirmar Remoção"
              )}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Financial;
