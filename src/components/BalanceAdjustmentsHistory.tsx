import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BalanceAdjustmentsHistoryProps {
  userId: string;
}

export function BalanceAdjustmentsHistory({ userId }: BalanceAdjustmentsHistoryProps) {
  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["balance-adjustments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_balance_adjustments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar informações dos admins
      const adminIds = [...new Set(data.map(a => a.admin_id))];
      const { data: admins } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);

      // Combinar dados
      return data.map(adj => ({
        ...adj,
        admin_name: admins?.find(a => a.id === adj.admin_id)?.full_name || "Admin"
      }));
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }

  if (!adjustments || adjustments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustes de Saldo pelo Administrador</CardTitle>
        <CardDescription>
          Histórico de ajustes manuais realizados pela administração
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {adjustments.map((adjustment) => (
            <div
              key={adjustment.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  adjustment.type === "add" ? "bg-green-100" : "bg-red-100"
                }`}>
                  {adjustment.type === "add" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {adjustment.type === "add" ? "Adição" : "Remoção"} de Saldo
                    </p>
                    <Badge variant={adjustment.type === "add" ? "default" : "destructive"}>
                      {adjustment.type === "add" ? "+" : "-"} R$ {Number(adjustment.amount).toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Por: {adjustment.admin_name}
                  </p>
                  {adjustment.reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Motivo: {adjustment.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(adjustment.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo Anterior</p>
                <p className="text-sm font-medium">
                  R$ {Number(adjustment.balance_before).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Saldo Após</p>
                <p className="text-sm font-medium">
                  R$ {Number(adjustment.balance_after).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
