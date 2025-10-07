import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";

export default function SimActivation() {
  const [activeTab, setActiveTab] = useState<"chip" | "esim">("chip");
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [imei, setImei] = useState("");
  const [eid, setEid] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startScanning = async () => {
    setScanning(true);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 400, height: 200 },
          aspectRatio: 2.0
        },
        (decodedText) => {
          // Aceitar apenas códigos maiores (mais de 10 caracteres)
          if (decodedText.length > 10) {
            setBarcode(decodedText);
            html5QrCode.stop();
            setScanning(false);
            toast.success(`Código de barras lido: ${decodedText}`);
          }
        },
        (errorMessage) => {
          // Silenciar erros de leitura durante o scan
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao acessar câmera");
      setScanning(false);
    }
  };

  const handleChipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) {
      toast.error("Por favor, leia o código de barras primeiro");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-sim-activation', {
        body: {
          activationType: 'chip',
          barcode: barcode,
        },
      });

      if (error) throw error;

      toast.success("Dados do chip enviados com sucesso! Você receberá a confirmação em breve.");
      // Manter o código visível após envio
      setScanning(false);
    } catch (error) {
      console.error('Erro ao enviar ativação:', error);
      toast.error("Erro ao enviar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEsimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || !eid) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sim-activation-screenshots')
          .upload(fileName, screenshot);

        if (uploadError) {
          console.error('Erro ao fazer upload do arquivo:', uploadError);
          toast.error("Erro ao fazer upload do arquivo. Continuando sem ele...");
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('sim-activation-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }

      const { data, error } = await supabase.functions.invoke('process-sim-activation', {
        body: {
          activationType: 'esim',
          imei: imei,
          eid: eid,
          screenshotUrl: screenshotUrl,
        },
      });

      if (error) throw error;

      toast.success("Dados do eSIM enviados com sucesso! Você receberá a confirmação em breve.");
      // Manter os dados visíveis após envio para conferência
    } catch (error) {
      console.error('Erro ao enviar ativação:', error);
      toast.error("Erro ao enviar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">SIM CARD e eSIM</h1>
        <p className="text-muted-foreground mt-2">
          Ative seu chip ou eSIM de forma rápida e segura
        </p>
      </div>

      <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50">
        <AnimatedGradient colors={["#8b5cf6", "#a78bfa", "#c4b5fd"]} speed={0.05} blur="medium" />
        <CardHeader className="relative z-10">
          <CardTitle>Ativação</CardTitle>
          <CardDescription>
            Escolha o tipo de ativação que deseja realizar
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chip" | "esim")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chip">
                <Smartphone className="mr-2 h-4 w-4" />
                Chip SIM
              </TabsTrigger>
              <TabsTrigger value="esim">
                <Camera className="mr-2 h-4 w-4" />
                eSIM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chip" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>⚠️ Instruções Importantes</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p>• <strong>NÃO ABRA</strong> o pacote do chip</p>
                  <p>• <strong>NÃO TIRE</strong> o chip do pacote até ser ativado</p>
                  <p>• <strong>LEIA SOMENTE</strong> o código de barras</p>
                  <p>• <strong>AGUARDE</strong> a ativação antes de usar</p>
                </AlertDescription>
              </Alert>

              <form onSubmit={handleChipSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código de Barras do Chip</Label>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Posicione a câmera sobre o <strong>código de barras maior</strong> (o de baixo da etiqueta)
                    </AlertDescription>
                  </Alert>
                  {!scanning && !barcode && (
                    <Button
                      type="button"
                      onClick={startScanning}
                      className="w-full"
                      variant="outline"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Iniciar Leitura do Código de Barras
                    </Button>
                  )}
                  <div id="reader" className={scanning ? "w-full border-2 border-primary rounded-lg" : "hidden"}></div>
                  {barcode && (
                    <div className="p-6 bg-primary/10 border-2 border-primary rounded-lg space-y-2">
                      <p className="text-sm font-bold text-primary">✓ Código lido com sucesso:</p>
                      <p className="font-mono text-xl font-bold break-all">{barcode}</p>
                      <Button
                        type="button"
                        onClick={() => {
                          setBarcode("");
                          setScanning(false);
                        }}
                        className="w-full mt-2"
                        variant="outline"
                        size="sm"
                      >
                        Ler novamente
                      </Button>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={!barcode || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Dados do Chip
                </Button>
                
                {barcode && !isSubmitting && (
                  <Button 
                    type="button"
                    onClick={() => setBarcode("")}
                    className="w-full"
                    variant="outline"
                  >
                    Nova Ativação
                  </Button>
                )}
              </form>
            </TabsContent>

            <TabsContent value="esim" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>📱 Como encontrar IMEI e EID</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p className="font-bold">1. Digite <code className="bg-primary/20 px-2 py-1 rounded">*#06#</code> no seu telefone</p>
                  <p>2. Anote ou tire um print dos códigos <strong>IMEI</strong> e <strong>EID</strong></p>
                  <p>3. Preencha os campos abaixo ou faça upload do print</p>
                  <p className="text-xs mt-2">💡 Certifique-se de que seu dispositivo suporta eSIM</p>
                </AlertDescription>
              </Alert>

              <form onSubmit={handleEsimSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="screenshot">Print da tela *#06# (Opcional)</Label>
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se preferir, tire um print após digitar *#06# e faça o upload
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imei">IMEI</Label>
                  <Input
                    id="imei"
                    placeholder="Digite o IMEI do dispositivo"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    15 dígitos numéricos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eid">EID</Label>
                  <Input
                    id="eid"
                    placeholder="Digite o EID do eSIM"
                    value={eid}
                    onChange={(e) => setEid(e.target.value)}
                    maxLength={32}
                  />
                  <p className="text-xs text-muted-foreground">
                    32 dígitos alfanuméricos
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Dados do eSIM
                </Button>
                
                {(imei || eid) && !isSubmitting && (
                  <Button 
                    type="button"
                    onClick={() => {
                      setImei("");
                      setEid("");
                      setScreenshot(null);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    Nova Ativação
                  </Button>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
