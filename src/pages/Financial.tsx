import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface Commission {
  id: string;
  amount: number;
  level: number;
  status: string;
  created_at: string;
  referred_user_id: string;
}

interface UserPlan {
  status: string;
  plan_end_date: string | null;
  next_renewal_date: string | null;
}

const Financial = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
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

  useEffect(() => {
    if (!user?.id) return;
    
    loadFinancialData();
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
          filter: `user_id=eq.${user.id}`
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
  }, [user]);

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

  const loadFinancialData = async () => {
    try {
      if (!user?.id) return;

      // Buscar dados atualizados do usuário
      const { data: userInfo } = await supabase
        .from("profiles")
        .select("status, metadata")
        .eq("id", user.id)
        .maybeSingle();

      // Buscar último pagamento com assinatura ativa do usuário
      const { data: lastPayment } = await supabase
        .from("payments")
        .select("next_renewal_date, subscription_id, status")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("subscription_id", "is", null)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userInfo) {
        const metadata = userInfo.metadata as { plan_end_date?: string } | null;
        setUserPlan({
          status: userInfo.status,
          plan_end_date: metadata?.plan_end_date || null,
          next_renewal_date: lastPayment?.next_renewal_date || null,
        });
      }

      // Buscar comissões
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (commissionsError) throw commissionsError;

      setCommissions(commissionsData || []);

      // Calcular saldos
      const total = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const available = commissionsData?.filter(c => c.status === "available").reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pending = commissionsData?.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.amount), 0) || 0;

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {balance.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Todas as comissões</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponível</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">R$ {balance.available.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Pronto para saque</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {balance.pending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Aguardando liberação</p>
            </CardContent>
          </Card>
        </div>


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
                        Comissão Nível {commission.level}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(commission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Financial;
