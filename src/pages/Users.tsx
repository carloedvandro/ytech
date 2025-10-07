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
import { toast } from "sonner";
import { UserCog, DollarSign, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface User {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string;
  status: string;
  created_at: string;
}

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const navigate = useNavigate();
  const { setImpersonatedUser } = useImpersonation();

  // Buscar todos os usuários
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as User[];
    },
  });

  // Buscar saldo disponível do usuário
  const { data: userBalance } = useQuery({
    queryKey: ["user-balance", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return 0;

      const { data, error } = await supabase
        .from("commissions")
        .select("amount")
        .eq("user_id", selectedUser.id)
        .eq("status", "available");

      if (error) throw error;
      
      const total = data?.reduce((sum, comm) => sum + Number(comm.amount), 0) || 0;
      return total;
    },
    enabled: !!selectedUser,
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

  const handleBalanceAdjustment = async () => {
    if (!selectedUser || !adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      toast.error("Preencha o valor corretamente");
      return;
    }

    try {
      const amount = parseFloat(adjustmentAmount);
      const balanceBefore = userBalance || 0;
      const balanceAfter = adjustmentType === "add" 
        ? balanceBefore + amount 
        : balanceBefore - amount;

      if (adjustmentType === "remove" && balanceAfter < 0) {
        toast.error("Saldo insuficiente para remoção");
        return;
      }

      // Buscar admin atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Admin não autenticado");

      // Registrar ajuste
      const { error: adjustmentError } = await supabase
        .from("admin_balance_adjustments")
        .insert({
          user_id: selectedUser.id,
          admin_id: currentUser.id,
          amount,
          type: adjustmentType,
          reason: adjustmentReason,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        });

      if (adjustmentError) throw adjustmentError;

      // Se for adicionar saldo, criar uma comissão fictícia
      if (adjustmentType === "add") {
        const { error: commError } = await supabase
          .from("commissions")
          .insert({
            user_id: selectedUser.id,
            referred_user_id: selectedUser.id,
            payment_id: `admin_adjustment_${Date.now()}`,
            amount,
            level: 0,
            status: "available",
            released_at: new Date().toISOString(),
          });

        if (commError) throw commError;
      }

      // Se for remover, atualizar comissões disponíveis
      if (adjustmentType === "remove") {
        // Buscar comissões disponíveis ordenadas por data
        const { data: availableComms, error: fetchError } = await supabase
          .from("commissions")
          .select("*")
          .eq("user_id", selectedUser.id)
          .eq("status", "available")
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        let remaining = amount;
        for (const comm of availableComms || []) {
          if (remaining <= 0) break;

          const commAmount = Number(comm.amount);
          if (commAmount <= remaining) {
            // Marcar como retirada
            await supabase
              .from("commissions")
              .update({ 
                status: "withdrawn",
                withdrawn_at: new Date().toISOString() 
              })
              .eq("id", comm.id);
            remaining -= commAmount;
          }
        }
      }

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
      toast.error("Erro ao ajustar saldo");
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
    </DashboardLayout>
  );
};

export default Users;
