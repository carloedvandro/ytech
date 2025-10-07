import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Loader2, Users, TrendingUp, CheckCircle, Clock, XCircle, Calendar, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast as sonnerToast } from "sonner";

interface NetworkUser {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  level: number;
  next_renewal_date?: string | null;
  subscription_id?: string | null;
}

const Network = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<NetworkUser[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<NetworkUser | null>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [newRenewalDate, setNewRenewalDate] = useState("");
  const [updatingRenewal, setUpdatingRenewal] = useState(false);
  const [stats, setStats] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
  });

  // Verificar se é admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!profile?.id,
  });

  const handleUpdateRenewalDate = async () => {
    if (!selectedUser || !newRenewalDate) {
      sonnerToast.error("Selecione uma data válida");
      return;
    }

    setUpdatingRenewal(true);
    try {
      const { error } = await supabase.functions.invoke('admin-update-renewal-date', {
        body: { 
          userId: selectedUser.id,
          newRenewalDate: new Date(newRenewalDate).toISOString(),
          subscriptionId: selectedUser.subscription_id
        },
      });

      if (error) throw error;

      sonnerToast.success("Data de renovação atualizada com sucesso!");
      setShowRenewalDialog(false);
      setNewRenewalDate("");
      loadNetwork();
    } catch (error) {
      console.error("Error updating renewal date:", error);
      sonnerToast.error(error instanceof Error ? error.message : "Erro ao atualizar data");
    } finally {
      setUpdatingRenewal(false);
    }
  };

  const isOverdue = (renewalDate: string | null | undefined) => {
    if (!renewalDate) return false;
    return new Date(renewalDate) < new Date();
  };

  const formatRenewalDate = (renewalDate: string | null | undefined) => {
    if (!renewalDate) return "Sem data";
    try {
      return format(new Date(renewalDate), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  // Buscar perfil do usuário impersonado se necessário
  const { data: impersonatedProfile } = useQuery({
    queryKey: ["impersonated-profile", impersonatedUser?.id],
    queryFn: async () => {
      if (!impersonatedUser) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", impersonatedUser.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isImpersonating && !!impersonatedUser,
  });

  // Usar perfil impersonado ou perfil real
  const activeProfile = isImpersonating && impersonatedProfile ? impersonatedProfile : profile;

  useEffect(() => {
    if (!activeProfile?.id) return;
    loadNetwork();
  }, [activeProfile?.id]);

  const loadNetwork = async () => {
    try {
      if (!activeProfile?.id) return;

      // Buscar TODA a rede do usuário (não só indicados diretos)
      const { data: networkData, error: networkError } = await supabase
        .from("user_network")
        .select(`
          level,
          user_id,
          path,
          profiles!user_network_user_id_fkey (
            id,
            full_name,
            email,
            cpf,
            whatsapp,
            status,
            created_at
          )
        `)
        .contains("path", [activeProfile.id])
        .neq("user_id", activeProfile.id)
        .order("level", { ascending: true });

      if (networkError) throw networkError;

      // Buscar o nível do usuário logado para calcular níveis relativos
      const { data: myLevel } = await supabase
        .from("user_network")
        .select("level")
        .eq("user_id", activeProfile.id)
        .maybeSingle();

      const userLevel = myLevel?.level || 1;

      // Buscar datas de renovação para cada usuário
      const userIds = networkData?.map((item: any) => item.user_id) || [];
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("user_id, next_renewal_date, subscription_id")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      // Criar mapa de pagamentos (pegar o mais recente de cada usuário)
      const paymentMap = new Map();
      paymentsData?.forEach((payment) => {
        if (!paymentMap.has(payment.user_id)) {
          paymentMap.set(payment.user_id, payment);
        }
      });

      const formattedNetwork = networkData?.map((item: any) => {
        const payment = paymentMap.get(item.user_id);
        return {
          ...item.profiles,
          level: item.level - userLevel,
          next_renewal_date: payment?.next_renewal_date,
          subscription_id: payment?.subscription_id,
        };
      }) || [];

      setNetwork(formattedNetwork);

      // Calcular estatísticas
      const statsData = {
        level1: formattedNetwork.filter((u: NetworkUser) => u.level === 1).length,
        level2: formattedNetwork.filter((u: NetworkUser) => u.level === 2).length,
        level3: formattedNetwork.filter((u: NetworkUser) => u.level === 3).length,
        level4: formattedNetwork.filter((u: NetworkUser) => u.level === 4).length,
        total: formattedNetwork.length,
        active: formattedNetwork.filter((u: NetworkUser) => u.status === 'active').length,
        pending: formattedNetwork.filter((u: NetworkUser) => u.status === 'pending_payment').length,
        suspended: formattedNetwork.filter((u: NetworkUser) => u.status === 'suspended').length,
      };

      setStats(statsData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar rede",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "text-[hsl(var(--glass-yellow-foreground))]";
      case 2: return "text-[hsl(var(--glass-blue-foreground))]";
      case 3: return "text-[hsl(var(--glass-green-foreground))]";
      case 4: return "text-[hsl(var(--glass-purple-foreground))]";
      default: return "text-foreground";
    }
  };

  const getLevelBg = (level: number) => {
    switch (level) {
      case 1: return "backdrop-blur-xl bg-[hsl(var(--glass-yellow))]/20 border-[hsl(var(--glass-yellow))]/30";
      case 2: return "backdrop-blur-xl bg-[hsl(var(--glass-blue))]/20 border-[hsl(var(--glass-blue))]/30";
      case 3: return "backdrop-blur-xl bg-[hsl(var(--glass-green))]/20 border-[hsl(var(--glass-green))]/30";
      case 4: return "backdrop-blur-xl bg-[hsl(var(--glass-purple))]/20 border-[hsl(var(--glass-purple))]/30";
      default: return "";
    }
  };

  const filteredNetwork = network.filter(user => {
    if (selectedLevel && user.level !== selectedLevel) return false;
    if (selectedStatus && user.status !== selectedStatus) return false;
    return true;
  });

  const chartData = [
    { name: 'Ativos', value: stats.active, color: '#10b981' },
    { name: 'Pendentes', value: stats.pending, color: '#f59e0b' },
    { name: 'Suspensos', value: stats.suspended, color: '#ef4444' },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minha Rede MMN</h1>
          <p className="text-muted-foreground">
            Visualize todos os usuários da sua rede em 4 níveis
          </p>
        </div>

        {/* Estatísticas por Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className={`backdrop-blur-xl bg-[hsl(var(--glass-green))]/20 border-[hsl(var(--glass-green))]/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedStatus === 'active' ? 'ring-2 ring-[hsl(var(--glass-green-foreground))]' : ''}`}
            onClick={() => setSelectedStatus(selectedStatus === 'active' ? null : 'active')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-green-foreground))]">Usuários Ativos</CardTitle>
              <CheckCircle className="h-5 w-5 text-[hsl(var(--glass-green-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--glass-green-foreground))]">{stats.active}</div>
              <p className="text-xs text-[hsl(var(--glass-green-foreground))]/70 mt-1">
                {stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}% da rede` : 'Nenhum usuário'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`backdrop-blur-xl bg-[hsl(var(--glass-yellow))]/20 border-[hsl(var(--glass-yellow))]/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedStatus === 'pending_payment' ? 'ring-2 ring-[hsl(var(--glass-yellow-foreground))]' : ''}`}
            onClick={() => setSelectedStatus(selectedStatus === 'pending_payment' ? null : 'pending_payment')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-yellow-foreground))]">Pendentes de Pagamento</CardTitle>
              <Clock className="h-5 w-5 text-[hsl(var(--glass-yellow-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--glass-yellow-foreground))]">{stats.pending}</div>
              <p className="text-xs text-[hsl(var(--glass-yellow-foreground))]/70 mt-1">
                {stats.total > 0 ? `${((stats.pending / stats.total) * 100).toFixed(1)}% da rede` : 'Nenhum usuário'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`backdrop-blur-xl bg-red-500/20 border-red-500/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedStatus === 'suspended' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setSelectedStatus(selectedStatus === 'suspended' ? null : 'suspended')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Suspensos</CardTitle>
              <XCircle className="h-5 w-5 text-red-700/70 dark:text-red-400/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">{stats.suspended}</div>
              <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-1">
                {stats.total > 0 ? `${((stats.suspended / stats.total) * 100).toFixed(1)}% da rede` : 'Nenhum usuário'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Status */}
        {stats.total > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>
                Visualização gráfica do status dos usuários na sua rede
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros Ativos */}
        {(selectedLevel || selectedStatus) && (
          <div className="flex gap-2 flex-wrap">
            {selectedLevel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLevel(null)}
              >
                Nível {selectedLevel} ✕
              </Button>
            )}
            {selectedStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStatus(null)}
              >
                {selectedStatus === 'active' ? 'Ativos' : selectedStatus === 'pending_payment' ? 'Pendentes' : 'Suspensos'} ✕
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLevel(null);
                setSelectedStatus(null);
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        {/* Estatísticas por Nível */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card 
            className={`${getLevelBg(1)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 1 ? 'ring-2 ring-[hsl(var(--glass-yellow-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 1 ? null : 1)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-yellow-foreground))]">Nível 1</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-yellow-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-yellow-foreground))]">{stats.level1}</div>
            </CardContent>
          </Card>

          <Card 
            className={`${getLevelBg(2)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 2 ? 'ring-2 ring-[hsl(var(--glass-blue-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 2 ? null : 2)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-blue-foreground))]">Nível 2</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-blue-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-blue-foreground))]">{stats.level2}</div>
            </CardContent>
          </Card>

          <Card 
            className={`${getLevelBg(3)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 3 ? 'ring-2 ring-[hsl(var(--glass-green-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 3 ? null : 3)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-green-foreground))]">Nível 3</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-green-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-green-foreground))]">{stats.level3}</div>
            </CardContent>
          </Card>

          <Card 
            className={`${getLevelBg(4)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 4 ? 'ring-2 ring-[hsl(var(--glass-purple-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 4 ? null : 4)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-purple-foreground))]">Nível 4</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-purple-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-purple-foreground))]">{stats.level4}</div>
            </CardContent>
          </Card>

          <Card 
            className="backdrop-blur-xl bg-background/50 border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedLevel(null)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedLevel || selectedStatus 
                ? `Usuários Filtrados (${filteredNetwork.length})` 
                : `Todos os Usuários da Rede (${filteredNetwork.length})`}
            </CardTitle>
            <CardDescription>
              {selectedLevel && selectedStatus 
                ? `Mostrando usuários do nível ${selectedLevel} com status ${selectedStatus === 'active' ? 'ativo' : selectedStatus === 'pending_payment' ? 'pendente' : 'suspenso'}. Clique nos cards acima para filtrar.`
                : selectedLevel 
                  ? `Mostrando apenas os usuários do nível ${selectedLevel}. Clique no card novamente para ver todos.`
                  : selectedStatus
                    ? `Mostrando apenas usuários ${selectedStatus === 'active' ? 'ativos' : selectedStatus === 'pending_payment' ? 'pendentes' : 'suspensos'}. Clique no card novamente para ver todos.`
                    : "Todos os usuários indicados direta ou indiretamente por você. Clique nos cards acima para filtrar."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredNetwork.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {selectedLevel || selectedStatus
                  ? `Nenhum usuário encontrado com os filtros selecionados`
                  : "Você ainda não possui usuários na sua rede"
                }
              </p>
            ) : (
              <div className="space-y-4">
                {filteredNetwork.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${getLevelBg(user.level)} transition-all duration-300`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">{user.full_name}</h3>
                        {user.status === 'active' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Ativo
                          </span>
                        )}
                        {user.status === 'pending_payment' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Pendente
                          </span>
                        )}
                        {user.status === 'suspended' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Suspenso
                          </span>
                        )}
                        {user.next_renewal_date && isOverdue(user.next_renewal_date) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <AlertTriangle className="h-3 w-3" />
                            Em Atraso
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.next_renewal_date && (
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className={`text-xs ${isOverdue(user.next_renewal_date) ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                            Renovação: {formatRenewalDate(user.next_renewal_date)}
                          </p>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRenewalDate(user.next_renewal_date ? format(new Date(user.next_renewal_date), "yyyy-MM-dd") : "");
                                setShowRenewalDialog(true);
                              }}
                            >
                              Alterar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getLevelColor(user.level)}`}>
                        Nível {user.level}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para alterar data de renovação */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Data de Renovação</DialogTitle>
            <DialogDescription>
              Usuário: {selectedUser?.full_name}
              <br />
              Data atual: {formatRenewalDate(selectedUser?.next_renewal_date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="renewal-date">Nova Data de Renovação</Label>
              <Input
                id="renewal-date"
                type="date"
                value={newRenewalDate}
                onChange={(e) => setNewRenewalDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewalDialog(false)} disabled={updatingRenewal}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRenewalDate} disabled={updatingRenewal || !newRenewalDate}>
              {updatingRenewal ? "Atualizando..." : "Atualizar Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Network;
