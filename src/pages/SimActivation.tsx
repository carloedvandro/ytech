import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Smartphone, AlertCircle } from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function SimActivation() {
  const [activeTab, setActiveTab] = useState<"chip" | "esim">("chip");
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [imei, setImei] = useState("");
  const [eid, setEid] = useState("");

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

  const handleChipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) {
      toast.error("Por favor, leia o código de barras primeiro");
      return;
    }
    // Aqui você implementará a lógica de envio para o backend
    toast.success("Dados do chip enviados com sucesso!");
  };

  const handleEsimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || !eid) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    // Aqui você implementará a lógica de envio para o backend
    toast.success("Dados do eSIM enviados com sucesso!");
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

                <Button type="submit" className="w-full" disabled={!barcode}>
                  Enviar Dados do Chip
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="esim" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>📱 Informações Importantes</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p>• Localize o <strong>IMEI</strong> nas configurações do seu dispositivo</p>
                  <p>• O <strong>EID</strong> está disponível nas configurações de eSIM</p>
                  <p>• Certifique-se de que seu dispositivo suporta eSIM</p>
                  <p>• Após o envio, aguarde a confirmação de ativação</p>
                </AlertDescription>
              </Alert>

              <form onSubmit={handleEsimSubmit} className="space-y-4">
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

                <Button type="submit" className="w-full">
                  Enviar Dados do eSIM
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
