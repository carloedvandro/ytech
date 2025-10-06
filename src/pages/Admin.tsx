import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserX, UserCheck, Trash2, Archive, RotateCcw } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string;
  status: string;
  deleted_at: string | null;
  created_at: string;
  referred_by: string | null;
}

interface UserWithReferrals extends User {
  direct_referrals: number;
}

const Admin = () => {
  const [selectedUser, setSelectedUser] = useState<UserWithReferrals | null>(null);
  const [action, setAction] = useState<string>("");
  const [reason, setReason] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  // Verificar se o usuário atual é admin
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) throw new Error("Not authenticated");

      const user = JSON.parse(storedUser);
      
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (!isAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }

      return user;
    },
  });

  // Buscar todos os usuários com contagem de indicados
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: allUsers, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar contagem de indicados diretos para cada usuário
      const usersWithReferrals = await Promise.all(
        allUsers.map(async (user) => {
          const { count } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("referred_by", user.id)
            .is("deleted_at", null);

          return {
            ...user,
            direct_referrals: count || 0,
          };
        })
      );

      return usersWithReferrals;
    },
    enabled: !!currentUser,
  });

  // Mutation para gerenciar usuários
  const manageUserMutation = useMutation({
    mutationFn: async ({
      action,
      userId,
      reason,
    }: {
      action: string;
      userId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action, userId, reason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowDialog(false);
      setSelectedUser(null);
      setReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAction = (user: UserWithReferrals, actionType: string) => {
    setSelectedUser(user);
    setAction(actionType);
    setShowDialog(true);
  };

  const confirmAction = () => {
    if (!selectedUser) return;
    manageUserMutation.mutate({
      action,
      userId: selectedUser.id,
      reason,
    });
  };

  const getStatusBadge = (status: string, deletedAt: string | null) => {
    if (deletedAt) {
      return <Badge variant="destructive">Deletado</Badge>;
    }
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

  const getActionButtons = (user: UserWithReferrals) => {
    const isDeleted = !!user.deleted_at;
    const isSuspended = user.status === "suspended";
    const canHardDelete = user.direct_referrals === 0;

    return (
      <div className="flex gap-2 flex-wrap">
        {!isDeleted && !isSuspended && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(user, "suspend")}
            className="text-yellow-600"
          >
            <UserX className="w-4 h-4 mr-1" />
            Suspender
          </Button>
        )}

        {!isDeleted && isSuspended && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(user, "reactivate")}
            className="text-green-600"
          >
            <UserCheck className="w-4 h-4 mr-1" />
            Reativar
          </Button>
        )}

        {!isDeleted && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(user, "soft_delete")}
            className="text-orange-600"
          >
            <Archive className="w-4 h-4 mr-1" />
            Exclusão Lógica
          </Button>
        )}

        {isDeleted && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(user, "reactivate")}
            className="text-blue-600"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Restaurar
          </Button>
        )}

        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleAction(user, "hard_delete")}
          disabled={!canHardDelete}
          title={
            !canHardDelete
              ? "Não é possível deletar usuário com indicados"
              : "Exclusão permanente"
          }
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Deletar
        </Button>
      </div>
    );
  };

  const getActionDescription = () => {
    switch (action) {
      case "suspend":
        return "O usuário será suspenso e não poderá fazer login. Esta ação é reversível.";
      case "reactivate":
        return "O usuário será reativado e poderá fazer login novamente.";
      case "soft_delete":
        return "O usuário será marcado como deletado mas seus dados serão mantidos. Esta ação é reversível.";
      case "hard_delete":
        return "ATENÇÃO: Esta ação é IRREVERSÍVEL! Todos os dados do usuário serão permanentemente deletados do sistema.";
      default:
        return "";
    }
  };

  if (!currentUser) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Usuários</CardTitle>
            <CardDescription>
              Gerencie usuários do sistema: suspender, deletar ou reativar contas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Carregando usuários...</p>
            ) : (
              <div className="space-y-4">
                {users?.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{user.full_name}</h3>
                            {getStatusBadge(user.status, user.deleted_at)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Email: {user.email || "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            WhatsApp: {user.whatsapp}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Indicados Diretos: {user.direct_referrals}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Criado em: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getActionButtons(user)}
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

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "hard_delete" && "⚠️ "} Confirmar Ação
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
              <br />
              <br />
              Usuário: <strong>{selectedUser?.full_name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Motivo (opcional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo desta ação..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReason("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={action === "hard_delete" ? "bg-destructive" : ""}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Admin;
