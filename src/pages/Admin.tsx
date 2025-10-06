import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield, UserX, UserCheck, Trash2, Ban } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  status: string;
  created_at: string;
  deleted_at: string | null;
  direct_referrals: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // Verificar se é admin
      const { data: adminCheck } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (!adminCheck) {
        toast.error("Acesso negado. Apenas administradores.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error) {
      console.error("Error checking admin:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/dashboard");
    }
  };

  const loadUsers = async () => {
    try {
      // Buscar todos os usuários com contagem de indicados diretos
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          email,
          whatsapp,
          cpf,
          status,
          created_at,
          deleted_at
        `)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // Buscar contagem de indicados diretos para cada usuário
      const usersWithReferrals = await Promise.all(
        (usersData || []).map(async (user) => {
          const { count } = await supabase
            .from("user_network")
            .select("id", { count: "exact", head: true })
            .eq("parent_id", user.id);

          return {
            ...user,
            direct_referrals: count || 0,
          };
        })
      );

      setUsers(usersWithReferrals);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: {
          action: actionType,
          userId: selectedUser.id,
          reason: reason || undefined,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Ação executada com sucesso");
      setShowDialog(false);
      setSelectedUser(null);
      setReason("");
      await loadUsers();
    } catch (error: any) {
      console.error("Error executing action:", error);
      toast.error(error.message || "Erro ao executar ação");
    }
  };

  const openActionDialog = (user: User, action: string) => {
    setSelectedUser(user);
    setActionType(action);
    setShowDialog(true);
  };

  const getStatusBadge = (status: string, deletedAt: string | null) => {
    if (deletedAt) {
      return <Badge variant="destructive">Deletado</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge variant="default">Ativo</Badge>;
      case "suspended":
        return <Badge variant="secondary">Suspenso</Badge>;
      case "pending_payment":
        return <Badge variant="outline">Pagamento Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getActionLabel = () => {
    switch (actionType) {
      case "suspend":
        return "Suspender Usuário";
      case "reactivate":
        return "Reativar Usuário";
      case "soft_delete":
        return "Exclusão Lógica";
      case "hard_delete":
        return "Exclusão Permanente";
      default:
        return "Ação";
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case "suspend":
        return "O usuário será suspenso e não poderá fazer login. Esta ação é reversível.";
      case "reactivate":
        return "O usuário será reativado e poderá fazer login novamente.";
      case "soft_delete":
        return "O usuário será marcado como deletado mas seus dados permanecerão no sistema. Esta ação é reversível.";
      case "hard_delete":
        return "ATENÇÃO: O usuário e todos os seus dados serão PERMANENTEMENTE deletados. Esta ação NÃO é reversível.";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Indicados</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email || "-"}</TableCell>
                <TableCell>{user.whatsapp}</TableCell>
                <TableCell>{getStatusBadge(user.status, user.deleted_at)}</TableCell>
                <TableCell>{user.direct_referrals}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.status === "active" && !user.deleted_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, "suspend")}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspender
                      </Button>
                    )}

                    {user.status === "suspended" && !user.deleted_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, "reactivate")}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Reativar
                      </Button>
                    )}

                    {!user.deleted_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, "soft_delete")}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Excl. Lógica
                      </Button>
                    )}

                    {user.deleted_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, "reactivate")}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={user.direct_referrals > 0}
                      onClick={() => openActionDialog(user, "hard_delete")}
                      title={
                        user.direct_referrals > 0
                          ? "Não é possível deletar usuário com indicados"
                          : "Excluir permanentemente"
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionLabel()}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>{getActionDescription()}</p>
              {selectedUser && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email || selectedUser.whatsapp}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Descreva o motivo desta ação..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReason("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={
                actionType === "hard_delete" ? "bg-destructive hover:bg-destructive/90" : ""
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}