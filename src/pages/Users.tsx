import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCog, DollarSign, Search, CheckCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface User {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string;
  status: string;
  created_at: string;
  next_renewal_date?: string | null;
}

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showRenewalDateDialog, setShowRenewalDateDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [newRenewalDate, setNewRenewalDate] = useState("");
  const [activating, setActivating] = useState(false);
  const [updatingRenewal, setUpdatingRenewal] = useState(false);
  const navigate = useNavigate();
  const { setImpersonatedUser } = useImpersonation();

  // Buscar todos os usuários
  // Buscar planos
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar a data de renovação de cada usuário
      const usersWithRenewal = await Promise.all(
        profiles.map(async (profile) => {
          const { data: payment } = await supabase
            .from("payments")
            .select("next_renewal_date")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...profile,
            next_renewal_date: payment?.next_renewal_date || null,
          } as User;
        })
      );

      return usersWithRenewal;
    },
  });

  // Buscar saldo disponível do usuário
  const { data: userBalance } = useQuery({
    queryKey: ["user-balance", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return 0;

      // Buscar comissões disponíveis
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select("amount")
        .eq("user_id", selectedUser.id)
        .eq("status", "available");

      if (commissionsError) throw commissionsError;
      
      const commissionsAvailable = commissionsData?.reduce((sum, comm) => sum + Number(comm.amount), 0) || 0;

      // Buscar ajustes de saldo (adições e remoções)
      const { data: adjustmentsData, error: adjustmentsError } = await supabase
        .from("admin_balance_adjustments")
        .select("amount, type")
        .eq("user_id", selectedUser.id);

      if (adjustmentsError) throw adjustmentsError;

      // Calcular adições e remoções manuais
      const additionsTotal = adjustmentsData
        ?.filter(a => a.type === 'add')
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

      const deductionsTotal = adjustmentsData
        ?.filter(a => a.type === 'remove')
        .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

      // Saldo disponível = comissões available + adições - remoções manuais
      return commissionsAvailable + additionsTotal - deductionsTotal;
    },
    enabled: !!selectedUser,
  });

  // Buscar última renovação do usuário
  const { data: userLastPayment } = useQuery({
    queryKey: ["user-last-payment", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;

      const { data, error } = await supabase
        .from("payments")
        .select("next_renewal_date, subscription_id")
        .eq("user_id", selectedUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser && showRenewalDateDialog,
  });

  const handleImpersonate = (user: User) => {
    setImpersonatedUser({
      id: user.id,
      full_name: user.full_name,
      email: user.email || "",
    });
    toast.success(`Agora você está acessando como ${user.full_name}`);
    navigate("/dashboard");
  };

  const handleActivateUser = async () => {
    if (!selectedUser || !selectedPlanId) {
      toast.error("Selecione um plano");
      return;
    }

    setActivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const { data, error } = await supabase.functions.invoke('admin-activate-user', {
        body: { userId: selectedUser.id, planId: selectedPlanId },
      });

      if (error) throw error;

      toast.success(`Usuário ${selectedUser.full_name} ativado com sucesso!`);
      setShowActivateDialog(false);
      setSelectedPlanId("");
      refetch();
    } catch (error) {
      console.error("Error activating user:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao ativar usuário");
    } finally {
      setActivating(false);
    }
  };

  const handleBalanceAdjustment = async () => {
    if (!selectedUser || !adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      toast.error("Preencha o valor corretamente");
      return;
    }

    try {
      const amount = parseFloat(adjustmentAmount);

      // Chamar edge function para ajustar saldo
      const { data, error } = await supabase.functions.invoke('admin-adjust-balance', {
        body: {
          userId: selectedUser.id,
          amount,
          type: adjustmentType,
          reason: adjustmentReason
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao ajustar saldo');

      toast.success(
        adjustmentType === "add" 
          ? `R$ ${amount.toFixed(2)} adicionado ao saldo` 
          : `R$ ${amount.toFixed(2)} removido do saldo`
      );

      setShowBalanceDialog(false);
      setAdjustmentAmount("");
      setAdjustmentReason("");
      refetch();
    } catch (error) {
      console.error("Error adjusting balance:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao ajustar saldo");
    }
  };

  const handleUpdateRenewalDate = async () => {
    if (!selectedUser || !newRenewalDate) {
      toast.error("Selecione uma nova data de renovação");
      return;
    }

    if (!userLastPayment) {
      toast.error("Não foi encontrado registro de pagamento para este usuário");
      return;
    }

    setUpdatingRenewal(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-renewal-date', {
        body: {
          userId: selectedUser.id,
          newRenewalDate: newRenewalDate, // Envia formato YYYY-MM-DD direto
          subscriptionId: userLastPayment.subscription_id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar data de renovação');

      if (data.warning) {
        toast.warning(data.message);
      } else {
        toast.success("Data de renovação atualizada com sucesso!");
      }

      setShowRenewalDateDialog(false);
      setNewRenewalDate("");
      refetch();
    } catch (error) {
      console.error("Error updating renewal date:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar data de renovação");
    } finally {
      setUpdatingRenewal(false);
    }
  };

  const filteredUsers = users?.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.whatsapp.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Ativo</Badge>;
      case "suspended":
        return <Badge variant="secondary">Suspenso</Badge>;
      case "pending_payment":
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <p>Carregando usuários...</p>
            ) : (
              <div className="space-y-4">
                {filteredUsers?.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{user.full_name}</h3>
                            {getStatusBadge(user.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Email: {user.email || "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            WhatsApp: {user.whatsapp}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cadastrado em: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                          </p>
                          {user.next_renewal_date && (
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                              Próximo vencimento: {new Date(user.next_renewal_date).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImpersonate(user)}
                            className="text-blue-600"
                          >
                            <UserCog className="w-4 h-4 mr-1" />
                            Acessar Como
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBalanceDialog(true);
                            }}
                            className="text-green-600"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Ajustar Saldo
                          </Button>
                          {user.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRenewalDateDialog(true);
                              }}
                              className="text-orange-600"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Alterar Data
                            </Button>
                          )}
                          {user.status === "pending_payment" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowActivateDialog(true);
                              }}
                              className="text-purple-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Ativar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de ativação de usuário */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar Usuário</DialogTitle>
            <DialogDescription>
              Ative manualmente o usuário {selectedUser?.full_name} escolhendo um plano.
              As comissões serão geradas automaticamente para toda a rede.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Selecione o Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {Number(plan.price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)} disabled={activating}>
              Cancelar
            </Button>
            <Button onClick={handleActivateUser} disabled={activating || !selectedPlanId}>
              {activating ? "Ativando..." : "Ativar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de ajuste de saldo */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
            <DialogDescription>
              Usuário: {selectedUser?.full_name}
              <br />
              Saldo Atual: R$ {(userBalance || 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <RadioGroup value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as "add" | "remove")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="cursor-pointer">Adicionar Saldo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remove" id="remove" />
                  <Label htmlFor="remove" className="cursor-pointer">Remover Saldo</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo do ajuste..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBalanceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBalanceAdjustment}>
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de alteração de data de renovação */}
      <Dialog open={showRenewalDateDialog} onOpenChange={setShowRenewalDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Data de Renovação</DialogTitle>
            <DialogDescription>
              Usuário: {selectedUser?.full_name}
              <br />
              {userLastPayment?.next_renewal_date && (
                <>
                  Data Atual: {new Date(userLastPayment.next_renewal_date).toLocaleDateString("pt-BR")}
                </>
              )}
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
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-sm text-muted-foreground">
                Esta data será atualizada tanto no banco de dados quanto no Asaas.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRenewalDateDialog(false);
                setNewRenewalDate("");
              }}
              disabled={updatingRenewal}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateRenewalDate} 
              disabled={updatingRenewal || !newRenewalDate}
            >
              {updatingRenewal ? "Atualizando..." : "Confirmar Alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Users;
