import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, Clock, Smartphone, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface SimActivation {
  id: string;
  user_id: string;
  activation_type: string;
  barcode: string | null;
  imei: string | null;
  eid: string | null;
  screenshot_url: string | null;
  status: string;
  qr_code_url: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    whatsapp: string;
    email: string | null;
  };
}

export default function AdminActivations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivation, setSelectedActivation] = useState<SimActivation | null>(null);
  const [qrCodeData, setQrCodeData] = useState("");
  const queryClient = useQueryClient();

  const { data: activations, isLoading } = useQuery({
    queryKey: ["admin-activations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sim_activations")
        .select(`
          *,
          profiles!sim_activations_user_id_fkey(full_name, whatsapp, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as SimActivation[];
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ activationId, qrCodeUrl }: { activationId: string; qrCodeUrl?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("sim_activations")
        .update({
          status: "activated",
          qr_code_url: qrCodeUrl || null,
          activated_by: user.id,
          activated_at: new Date().toISOString(),
        })
        .eq("id", activationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-activations"] });
      toast.success("Ativação confirmada com sucesso!");
      setSelectedActivation(null);
      setQrCodeData("");
    },
    onError: (error) => {
      console.error("Erro ao ativar:", error);
      toast.error("Erro ao confirmar ativação");
    },
  });

  const handleActivate = (activation: SimActivation) => {
    if (activation.activation_type === "chip") {
      // Chip físico - ativar direto
      activateMutation.mutate({ activationId: activation.id });
    } else {
      // eSIM - abrir dialog para QR code
      setSelectedActivation(activation);
    }
  };

  const handleEsimActivation = () => {
    if (!selectedActivation || !qrCodeData.trim()) {
      toast.error("Por favor, preencha o link ou código do QR code");
      return;
    }

    activateMutation.mutate({
      activationId: selectedActivation.id,
      qrCodeUrl: qrCodeData,
    });
  };

  const filteredActivations = activations?.filter((activation) =>
    activation.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activation.profiles.whatsapp.includes(searchTerm) ||
    activation.barcode?.includes(searchTerm) ||
    activation.imei?.includes(searchTerm) ||
    activation.eid?.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Ativações</h1>
          <p className="text-muted-foreground">
            Confirme as ativações de chip e eSIM dos clientes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscar Ativações</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por nome, WhatsApp, código de barras, IMEI ou EID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filteredActivations?.map((activation) => (
            <Card key={activation.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{activation.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {activation.profiles.whatsapp}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tipo:</p>
                        <Badge variant={activation.activation_type === "chip" ? "default" : "secondary"}>
                          {activation.activation_type === "chip" ? "Chip SIM" : "eSIM"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status:</p>
                        <Badge variant={activation.status === "activated" ? "default" : "outline"}>
                          {activation.status === "activated" ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Ativado</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                          )}
                        </Badge>
                      </div>
                      {activation.barcode && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Código de Barras:</p>
                          <p className="font-mono text-xs break-all">{activation.barcode}</p>
                        </div>
                      )}
                      {activation.imei && (
                        <div>
                          <p className="text-muted-foreground">IMEI:</p>
                          <p className="font-mono text-xs">{activation.imei}</p>
                        </div>
                      )}
                      {activation.eid && (
                        <div>
                          <p className="text-muted-foreground">EID:</p>
                          <p className="font-mono text-xs break-all">{activation.eid}</p>
                        </div>
                      )}
                      {activation.screenshot_url && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground mb-1">Print *#06#:</p>
                          <a 
                            href={activation.screenshot_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs"
                          >
                            Ver imagem
                          </a>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Data:</p>
                        <p className="text-xs">
                          {new Date(activation.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    {activation.status === "pending" && (
                      <Button onClick={() => handleActivate(activation)}>
                        Confirmar Ativação
                      </Button>
                    )}
                    {activation.status === "activated" && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Confirmado
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredActivations?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma ativação encontrada
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!selectedActivation} onOpenChange={(open) => !open && setSelectedActivation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ativar eSIM - {selectedActivation?.profiles.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-code">Link ou código do QR Code do eSIM</Label>
              <Textarea
                id="qr-code"
                placeholder="Cole aqui o link do QR code ou os dados de ativação do eSIM..."
                value={qrCodeData}
                onChange={(e) => setQrCodeData(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Este QR code ou link será exibido para o cliente fazer a ativação do eSIM
              </p>
            </div>

            {qrCodeData && (
              <div className="p-4 bg-muted rounded-lg flex justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Preview do QR Code:</p>
                  <QRCodeSVG value={qrCodeData} size={200} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedActivation(null);
                  setQrCodeData("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEsimActivation}
                disabled={!qrCodeData.trim() || activateMutation.isPending}
                className="flex-1"
              >
                {activateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Ativação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
