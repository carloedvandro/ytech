import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const FixCommissions = () => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState("e7d1f677-4289-44c6-8ecc-3f6823f57d13");

  const handleFix = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-commission-status', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Corrigir Status de Comissões</CardTitle>
          <CardDescription>
            Restaura comissões marcadas incorretamente como "sacadas" para "disponíveis"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleFix} 
            disabled={processing}
            className="w-full"
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Corrigir Comissões do Admin
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default FixCommissions;
