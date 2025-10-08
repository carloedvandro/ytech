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
import { CheckCircle, Clock, Smartphone, Loader2, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [qrCodeImage, setQrCodeImage] = useState<File | null>(null);
  const [qrCodeImagePreview, setQrCodeImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const queryClient = useQueryClient();

  const { data: activations, isLoading, error: queryError } = useQuery({
    queryKey: ["admin-activations"],
    queryFn: async () => {
      console.log('🔍 Buscando ativações...');
      
      // Buscar ativações
      const { data: activationsData, error: activationsError } = await supabase
        .from("sim_activations")
        .select("*")
        .order("created_at", { ascending: false });

      if (activationsError) {
        console.error('❌ Erro ao buscar ativações:', activationsError);
        throw activationsError;
      }

      console.log('✅ Ativações encontradas:', activationsData?.length || 0);

      // Buscar perfis dos usuários
      const userIds = [...new Set(activationsData?.map(a => a.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp, email")
        .in("id", userIds);

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      // Combinar dados
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const result = activationsData?.map(activation => ({
        ...activation,
        profiles: profilesMap.get(activation.user_id) || {
          full_name: 'Desconhecido',
          whatsapp: 'N/A',
          email: null
        }
      }));

      console.log('✅ Dados combinados:', result);
      return result as unknown as SimActivation[];
    },
  });

  // Log de erro se houver
  if (queryError) {
    console.error('❌ Erro na query:', queryError);
    toast.error(`Erro ao carregar ativações: ${queryError.message}`);
  }

  const activateMutation = useMutation({
    mutationFn: async ({ activationId, qrCodeUrl, activation }: { 
      activationId: string; 
      qrCodeUrl?: string;
      activation: SimActivation;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error("❌ Sessão não encontrada");
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      console.log("✅ Usuário autenticado:", session.user.id);

      // Atualizar status da ativação
      const { error } = await supabase
        .from("sim_activations")
        .update({
          status: "activated",
          qr_code_url: qrCodeUrl || null,
          activated_by: session.user.id,
          activated_at: new Date().toISOString(),
        })
        .eq("id", activationId);

      if (error) {
        console.error("❌ Erro ao atualizar ativação:", error);
        throw error;
      }

      console.log("✅ Ativação confirmada com sucesso!");

      // Enviar mensagem via WhatsApp
      try {
        const tipoProduto = activation.activation_type === "chip" ? "Chip SIM" : "eSIM";
        const mensagem = `🎉 *Seu ${tipoProduto} foi ATIVADO!*

Olá ${activation.profiles.full_name}! 

✅ Ótimas notícias! Seu ${tipoProduto} já está ativo e pronto para uso.

📱 *O que fazer agora:*
${activation.activation_type === "chip" 
  ? "1️⃣ Insira o chip no seu aparelho\n2️⃣ Aguarde alguns segundos para conectar à rede\n3️⃣ Teste acessando a internet" 
  : "1️⃣ Escaneie o QR code que enviamos\n2️⃣ Configure o eSIM no seu aparelho\n3️⃣ Aguarde a conexão com a rede\n4️⃣ Teste acessando a internet"
}

🌐 *Teste sua conexão:*
• Abra o navegador
• Acesse qualquer site
• Faça uma chamada de teste

💡 Se tiver qualquer dúvida, estamos à disposição!

_Y-TECH Internet 5G_`;

        console.log("📤 Enviando WhatsApp para:", activation.profiles.whatsapp);

        const { error: whatsappError } = await supabase.functions.invoke(
          'send-whatsapp-notification',
          {
            body: {
              to: activation.profiles.whatsapp,
              message: mensagem,
            },
          }
        );

        if (whatsappError) {
          console.error("⚠️ Erro ao enviar WhatsApp:", whatsappError);
          // Não falhar a operação se o WhatsApp falhar
        } else {
          console.log("✅ WhatsApp enviado com sucesso!");
        }
      } catch (whatsappError) {
        console.error("⚠️ Erro ao enviar WhatsApp:", whatsappError);
        // Não falhar a operação se o WhatsApp falhar
      }
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

  const deleteMutation = useMutation({
    mutationFn: async (activationId: string) => {
      const { error } = await supabase
        .from("sim_activations")
        .delete()
        .eq("id", activationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-activations"] });
      toast.success("Ativação deletada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar ativação");
    },
  });

  const handleActivate = (activation: SimActivation) => {
    if (activation.activation_type === "chip") {
      // Chip físico - ativar direto
      activateMutation.mutate({ 
        activationId: activation.id,
        activation: activation
      });
    } else {
      // eSIM - abrir dialog para QR code
      setSelectedActivation(activation);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setQrCodeImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEsimActivation = async () => {
    if (!selectedActivation) return;
    
    if (!qrCodeImage && !qrCodeData.trim()) {
      toast.error("Por favor, envie uma imagem do QR Code ou cole os dados");
      return;
    }

    setIsUploadingImage(true);

    try {
      let qrCodeUrl = qrCodeData;

      // Se houver imagem, fazer upload
      if (qrCodeImage) {
        const fileExt = qrCodeImage.name.split('.').pop();
        const fileName = `${selectedActivation.user_id}-qrcode-${Date.now()}.${fileExt}`;
        const filePath = `qr-codes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sim-activation-screenshots')
          .upload(filePath, qrCodeImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('sim-activation-screenshots')
          .getPublicUrl(filePath);

        qrCodeUrl = publicUrl;

        // Enviar imagem via WhatsApp
        await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            to: selectedActivation.profiles.whatsapp,
            message: `🎉 *Seu eSIM foi ATIVADO!*\n\nOlá ${selectedActivation.profiles.full_name}!\n\n✅ Escaneie o QR Code abaixo para ativar seu eSIM:\n\n📱 Acesse: Configurações > Celular > Adicionar eSIM > Escanear QR Code\n\n_Y-TECH Internet 5G_`,
            imageUrl: publicUrl,
          },
        });
      }

      activateMutation.mutate({
        activationId: selectedActivation.id,
        qrCodeUrl,
        activation: selectedActivation,
      });

      setQrCodeImage(null);
      setQrCodeImagePreview("");
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem do QR Code');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const filteredActivations = activations?.filter((activation) => {
    if (!searchTerm.trim()) return true; // Mostrar todos se não houver busca
    
    return (
      activation.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activation.profiles.whatsapp.includes(searchTerm) ||
      activation.barcode?.includes(searchTerm) ||
      activation.imei?.includes(searchTerm) ||
      activation.eid?.includes(searchTerm)
    );
  });

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

                  <div className="flex flex-col gap-2">
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
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja deletar esta ativação?`)) {
                          deleteMutation.mutate(activation.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Deletar
                        </>
                      )}
                    </Button>
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

      <Dialog open={!!selectedActivation} onOpenChange={(open) => {
        if (!open) {
          setSelectedActivation(null);
          setQrCodeData("");
          setQrCodeImage(null);
          setQrCodeImagePreview("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ativar eSIM - {selectedActivation?.profiles.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <ImageIcon className="h-4 w-4" />
              <AlertDescription>
                Envie a imagem do QR Code do eSIM. Ela será enviada automaticamente para o WhatsApp do cliente.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="qr-image">Imagem do QR Code (Recomendado)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="qr-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isUploadingImage}
                />
              </div>
              
              {qrCodeImagePreview && (
                <div className="p-4 bg-muted rounded-lg flex justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Preview:</p>
                    <img 
                      src={qrCodeImagePreview} 
                      alt="QR Code Preview" 
                      className="max-w-[200px] mx-auto rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou cole os dados
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-code">Link ou código do QR Code</Label>
              <Textarea
                id="qr-code"
                placeholder="Cole aqui os dados de ativação do eSIM..."
                value={qrCodeData}
                onChange={(e) => setQrCodeData(e.target.value)}
                rows={3}
                disabled={!!qrCodeImage}
              />
            </div>

            {qrCodeData && !qrCodeImage && (
              <div className="p-4 bg-muted rounded-lg flex justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Preview do QR Code:</p>
                  <QRCode value={qrCodeData} size={150} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedActivation(null);
                  setQrCodeData("");
                  setQrCodeImage(null);
                  setQrCodeImagePreview("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEsimActivation}
                disabled={(!qrCodeImage && !qrCodeData.trim()) || activateMutation.isPending || isUploadingImage}
                className="flex-1"
              >
                {(activateMutation.isPending || isUploadingImage) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Ativação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
