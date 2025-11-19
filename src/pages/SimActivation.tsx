import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Smartphone, AlertCircle, Loader2, CheckCircle, ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG as QRCode } from "qrcode.react";

export default function SimActivation() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"chip" | "esim">("chip");
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [imei, setImei] = useState("");
  const [eid, setEid] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showTypeSelectionDialog, setShowTypeSelectionDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [showDeviceTypeDialog, setShowDeviceTypeDialog] = useState(false);
  const [deviceType, setDeviceType] = useState<"iOS" | "Android" | null>(null);
  const [userConfirmedActivation, setUserConfirmedActivation] = useState(false);

  // Verificar se o usuário tem fatura em dia (status = active)
  const canActivate = profile?.status === 'active';

  // Recuperar dados salvos do localStorage ao carregar (específico do usuário)
  useEffect(() => {
    if (!user?.id) return;
    
    const storageKey = `sim-activation-data-${user.id}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.barcode) setBarcode(data.barcode);
        if (data.imei) setImei(data.imei);
        if (data.eid) setEid(data.eid);
        if (data.activeTab) setActiveTab(data.activeTab);
        if (data.deviceType) setDeviceType(data.deviceType);
      } catch (error) {
        console.error('Erro ao recuperar dados salvos:', error);
      }
    }
  }, [user?.id]);

  // Salvar dados no localStorage sempre que mudarem (específico do usuário)
  useEffect(() => {
    if (!user?.id) return;
    
    const storageKey = `sim-activation-data-${user.id}`;
    const dataToSave = {
      barcode,
      imei,
      eid,
      activeTab,
      deviceType,
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [barcode, imei, eid, activeTab, deviceType, user?.id]);

  // Mostrar modal de seleção de tipo de dispositivo quando IMEI e EID forem preenchidos
  useEffect(() => {
    if (activeTab === "esim" && imei && eid && !deviceType) {
      setShowDeviceTypeDialog(true);
    }
  }, [imei, eid, activeTab, deviceType]);

  // Reset showDeviceTypeDialog quando deviceType for resetado ou valores mudarem
  useEffect(() => {
    if (!deviceType || !imei || !eid) {
      setShowDeviceTypeDialog(false);
    }
  }, [deviceType, imei, eid]);

  // Buscar ativações do usuário (excluindo canceladas)
  const { data: activations, refetch } = useQuery({
    queryKey: ["user-activations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("sim_activations")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      console.log('📊 Ativações carregadas:', data);
      return data;
    },
    enabled: !!user?.id,
  });

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
          // Aceitar apenas códigos que começam com 8955 (código de baixo do chip Vivo)
          if (decodedText.startsWith('8955') && decodedText.length >= 18) {
            setBarcode(decodedText);
            html5QrCode.stop();
            setScanning(false);
            toast.success(`Código de barras lido: ${decodedText}`);
          } else if (decodedText.length > 10 && !decodedText.startsWith('8955')) {
            // Ignorar silenciosamente códigos que não são o correto
            console.log('Código ignorado (não começa com 8955):', decodedText);
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

      console.log('📤 Enviando ativação de chip:', { barcode });
      
      const { data, error } = await supabase.functions.invoke('process-sim-activation', {
        body: {
          activationType: 'chip',
          barcode: barcode,
        },
      });

      if (error) {
        console.error('❌ Erro do edge function:', error);
        throw error;
      }

      console.log('✅ Resposta do edge function:', data);
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

  const handleImageUpload = async (file: File) => {
    setIsProcessingImage(true);
    
    try {
      // Verificar limite de uploads nas últimas 24 horas
      console.log('🔍 Verificando limite de uploads de anexos...');
      
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      // Buscar uploads salvos no banco
      const { data: recentUploads, error: countError } = await supabase
        .from('sim_activations')
        .select('id, screenshot_url, created_at')
        .eq('user_id', user?.id)
        .not('screenshot_url', 'is', null)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (countError) {
        console.error('❌ Erro ao verificar uploads:', countError);
        throw countError;
      }

      // Buscar uploads temporários do localStorage
      const uploadTrackingKey = `upload-tracking-${user?.id}`;
      const trackingData = localStorage.getItem(uploadTrackingKey);
      let temporaryUploads: { timestamp: number }[] = [];
      
      if (trackingData) {
        try {
          const allUploads = JSON.parse(trackingData);
          // Filtrar apenas uploads das últimas 24 horas
          temporaryUploads = allUploads.filter((upload: { timestamp: number }) => 
            upload.timestamp > twentyFourHoursAgo.getTime()
          );
        } catch (e) {
          console.error('Erro ao ler tracking de uploads:', e);
        }
      }

      const totalUploads = (recentUploads?.length || 0) + temporaryUploads.length;
      
      console.log('📊 Uploads de anexos encontrados nas últimas 24h:');
      console.log('   - Salvos no banco:', recentUploads?.length || 0);
      console.log('   - Temporários:', temporaryUploads.length);
      console.log('   - Total:', totalUploads);

      // Se já fez 3 ou mais uploads nas últimas 24 horas, verificar saldo
      if (totalUploads >= 3) {
        console.log('⚠️ Limite de 3 anexos atingido. Verificando saldo...');
        
        // Buscar saldo disponível do usuário (comissões + adições - descontos)
        const { data: commissionsData } = await supabase
          .from('commissions')
          .select('amount, status')
          .eq('user_id', user?.id)
          .eq('status', 'available');

        const commissionsTotal = commissionsData
          ?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // Buscar ajustes de saldo (adições e descontos)
        const { data: adjustmentsData } = await supabase
          .from('admin_balance_adjustments')
          .select('amount, type')
          .eq('user_id', user?.id);

        const additionsTotal = adjustmentsData
          ?.filter(a => a.type === 'add')
          .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

        const deductionsTotal = adjustmentsData
          ?.filter(a => a.type === 'remove')
          .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

        // Saldo disponível = comissões + adições - descontos
        const currentBalance = commissionsTotal + additionsTotal - deductionsTotal;

        console.log('💰 Saldo disponível:', {
          commissionsTotal,
          additionsTotal,
          deductionsTotal,
          currentBalance
        });

        // Se não tiver saldo suficiente (R$ 3,00)
        if (currentBalance < 3) {
          toast.error(
            "Você atingiu o limite de 3 anexos gratuitos por dia e não possui saldo suficiente. " +
            "O envio de anexos extras está bloqueado por 24 horas. " +
            "Saldo necessário: R$ 3,00 | Seu saldo: R$ " + currentBalance.toFixed(2),
            { duration: 10000 }
          );
          setIsProcessingImage(false);
          return;
        }

        // Tem saldo suficiente - descontar R$ 3,00
        console.log('✅ Saldo suficiente. Descontando R$ 3,00...');
        
        const { data: deductionData, error: deductionError } = await supabase.functions.invoke(
          'deduct-attachment-fee',
          { body: {} }
        );

        if (deductionError || !deductionData?.success) {
          console.error('❌ Erro ao descontar taxa:', deductionError || deductionData);
          toast.error(
            "Erro ao processar o desconto da taxa de anexo extra. Tente novamente.",
            { duration: 5000 }
          );
          setIsProcessingImage(false);
          return;
        }

        console.log('✅ Taxa descontada com sucesso:', deductionData);
        toast.success(
          `Taxa de R$ 3,00 descontada do seu saldo. Saldo restante: R$ ${deductionData.balance_after.toFixed(2)}`,
          { duration: 5000 }
        );
      }

      // Registrar upload temporário no localStorage
      const uploadTrackingKeyForSave = `upload-tracking-${user?.id}`;
      const trackingDataForSave = localStorage.getItem(uploadTrackingKeyForSave);
      let uploadsToSave: { timestamp: number }[] = [];
      
      if (trackingDataForSave) {
        try {
          uploadsToSave = JSON.parse(trackingDataForSave);
          // Manter apenas uploads das últimas 24 horas
          const twentyFourHoursAgoForSave = new Date();
          twentyFourHoursAgoForSave.setHours(twentyFourHoursAgoForSave.getHours() - 24);
          uploadsToSave = uploadsToSave.filter(upload => upload.timestamp > twentyFourHoursAgoForSave.getTime());
        } catch (e) {
          console.error('Erro ao ler tracking:', e);
          uploadsToSave = [];
        }
      }
      
      uploadsToSave.push({ timestamp: Date.now() });
      localStorage.setItem(uploadTrackingKeyForSave, JSON.stringify(uploadsToSave));
      console.log('📝 Upload temporário registrado. Total de uploads nas últimas 24h:', uploadsToSave.length + (recentUploads?.length || 0));
      
      setScreenshot(file);
      
      // Converter imagem para base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Image = reader.result as string;
            
            console.log('📤 Enviando imagem para processamento...');
            
            // Chamar edge function para extrair dados
            const { data, error } = await supabase.functions.invoke('extract-esim-data', {
              body: { imageBase64: base64Image },
            });
            
            if (error) {
              console.error('❌ Erro ao processar imagem:', error);
              toast.error("Não conseguimos processar a imagem. Preencha os campos manualmente.");
              resolve();
              return;
            }
            
            console.log('✅ Dados extraídos:', data);
            
            if (!data.success) {
              toast.error(data.error || "Erro ao processar imagem");
              resolve();
              return;
            }
            
            // Preencher campos automaticamente
            if (data.eid) {
              setEid(data.eid);
              toast.success("EID extraído automaticamente! ✓");
            }
            
            if (data.imei) {
              setImei(data.imei);
              toast.success("IMEI extraído automaticamente! ✓");
            }
            
            if (!data.eid && !data.imei) {
              toast.warning("Não conseguimos extrair os dados. Por favor, preencha manualmente.");
            } else {
              toast.success("✅ Dados extraídos! Revise antes de enviar.");
            }
            
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      });
      
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error("Erro ao processar imagem. Tente novamente ou preencha manualmente.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleEsimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || !eid) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!deviceType) {
      toast.error("Por favor, selecione o tipo de dispositivo (iOS ou Android)");
      setShowDeviceTypeDialog(true);
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
          deviceType: deviceType,
        },
      });

      if (error) throw error;

      toast.success("Dados do eSIM enviados com sucesso! Você receberá a confirmação em breve.");
      
      // Redirecionar para dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Erro ao enviar ativação:', error);
      toast.error("Erro ao enviar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Encontrar última ativação ativa
  const activeActivation = activations?.find(a => a.status === 'activated');
  
  // Encontrar ativação pendente
  const pendingActivation = activations?.find(a => a.status === 'pending');

  // Carregar confirmação do localStorage (DEPOIS de activeActivation ser definido)
  useEffect(() => {
    if (activeActivation?.id) {
      const confirmed = localStorage.getItem(`activation-confirmed-${activeActivation.id}`);
      setUserConfirmedActivation(confirmed === 'true');
    } else {
      setUserConfirmedActivation(false);
    }
  }, [activeActivation?.id]);

  const handleConfirmActivation = async () => {
    if (!activeActivation) return;

    try {
      // Enviar notificação WhatsApp para administradores
      const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          messageType: 'chip_activated_by_user',
          userId: user?.id,
          userName: profile?.full_name || 'Cliente',
          userWhatsapp: profile?.whatsapp
        }
      });

      if (error) {
        console.error('Erro ao enviar notificação:', error);
        toast.error("Erro ao enviar notificação, mas continuaremos o processo.");
      }

      // Marcar como confirmado
      if (activeActivation?.id) {
        localStorage.setItem(`activation-confirmed-${activeActivation.id}`, 'true');
        setUserConfirmedActivation(true);
      }

      toast.success("Confirmação enviada com sucesso! Nossa equipe foi notificada.");
      setShowConfirmDialog(false);
      
      // Recarregar dados
      refetch();
    } catch (error) {
      console.error('Erro ao confirmar ativação:', error);
      toast.error("Erro ao enviar confirmação. Tente novamente.");
    }
  };

  const handleDeleteActivation = async () => {
    if (!activeActivation) return;

    try {
      const { error } = await supabase
        .from('sim_activations')
        .delete()
        .eq('id', activeActivation.id);

      if (error) throw error;

      toast.success("Ativação deletada com sucesso!");
      setShowReactivateDialog(false);
      setShowTypeSelectionDialog(true);
      refetch();
    } catch (error) {
      console.error('Erro ao deletar ativação:', error);
      toast.error("Erro ao deletar ativação. Tente novamente.");
    }
  };

  const handleSelectActivationType = (type: 'sim' | 'esim') => {
    setShowTypeSelectionDialog(false);
    setActiveTab(type === 'sim' ? 'chip' : 'esim');
    // Limpar estados
    setBarcode("");
    setImei("");
    setEid("");
    setScreenshot(null);
    
    // Limpar localStorage específico do usuário
    if (user?.id) {
      localStorage.removeItem(`sim-activation-data-${user.id}`);
    }
    
    toast.info("Preencha os dados para sua nova ativação");
  };

  const handleClearData = async () => {
    try {
      setShowClearDataDialog(false);
      
      // Se houver ativação pendente, verificar limite de cancelamentos
      if (pendingActivation) {
        // Verificar quantos cancelamentos o usuário já fez nas últimas 24 horas
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        console.log('🔍 Verificando cancelamentos nas últimas 24h...');
        
        const { data: recentCancellations, error: countError } = await supabase
          .from('sim_activations')
          .select('id, updated_at')
          .eq('user_id', user?.id)
          .eq('status', 'cancelled')
          .gte('updated_at', twentyFourHoursAgo.toISOString());

        if (countError) {
          console.error('❌ Erro ao verificar cancelamentos:', countError);
          throw countError;
        }

        console.log('📊 Cancelamentos encontrados:', recentCancellations);

        // Se já cancelou 2 vezes nas últimas 24 horas
        if (recentCancellations && recentCancellations.length >= 2) {
          toast.error("Você atingiu o limite de 2 cancelamentos em 24 horas. Por favor, aguarde para poder cancelar novamente.");
          return;
        }
        
        // Enviar código de verificação via WhatsApp
        console.log('📱 Enviando código de verificação...');
        toast.info("Enviando código de verificação no WhatsApp...");
        
        const { data: verificationData, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-verification', {
          body: {
            whatsapp: profile?.whatsapp,
            type: 'activation_cancel'
          }
        });

        if (whatsappError) {
          console.error('❌ Erro ao enviar verificação:', whatsappError);
          toast.error("Erro ao enviar código de verificação. Tente novamente.");
          return;
        }

        // Solicitar código do usuário
        const code = prompt("Digite o código de 6 dígitos que você recebeu no WhatsApp:");
        
        if (!code) {
          toast.error("Cancelamento abortado.");
          return;
        }

        // Verificar código
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-whatsapp-code', {
          body: {
            whatsapp: profile?.whatsapp,
            code: code
          }
        });

        if (verifyError || !verifyData?.verified) {
          toast.error("Código inválido ou expirado. Tente novamente.");
          return;
        }
        
        console.log('🔄 Cancelando ativação:', pendingActivation.id);
        
        const { error } = await supabase
          .from('sim_activations')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', pendingActivation.id);

        if (error) {
          console.error('❌ Erro ao cancelar:', error);
          throw error;
        }
        
        console.log('✅ Ativação cancelada com sucesso');
        
        // Invalidar ambas as queries para forçar atualização
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user-activations", user?.id] }),
          queryClient.invalidateQueries({ queryKey: ["sim-activation-status", user?.id] })
        ]);
        
        // Aguardar um momento para garantir que as queries foram recarregadas
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('🔄 Queries invalidadas, estado deve estar atualizado');
      }

      // Limpar dados locais
      setBarcode("");
      setImei("");
      setEid("");
      setScreenshot(null);
      setDeviceType(null);
      
      // Limpar localStorage específico do usuário
      if (user?.id) {
        localStorage.removeItem(`sim-activation-data-${user.id}`);
      }
      
      toast.success("Dados limpos com sucesso! Você pode enviar uma nova ativação.");
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error("Erro ao limpar dados. Tente novamente.");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SIM CARD e eSIM</h1>
          <p className="text-muted-foreground mt-2">
            Ative seu chip ou eSIM de forma rápida e segura
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </div>

      {!canActivate && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Esta área está disponível apenas para clientes com fatura em dia. 
            Por favor, regularize sua situação para ativar seu chip ou eSIM.
          </AlertDescription>
        </Alert>
      )}

      {pendingActivation && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>⏳ Ativação em Processamento</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Seus dados de {pendingActivation.activation_type === 'chip' ? 'Chip SIM' : 'eSIM'} já foram enviados e estão sendo processados pela nossa equipe.</p>
            <p className="font-semibold">Por favor, aguarde a confirmação. Você receberá uma notificação em breve.</p>
            <p className="text-sm text-muted-foreground mt-2">
              ⏱️ <strong>Prazo de ativação:</strong> até 48 horas úteis (geralmente ativado em menor tempo)
            </p>
          </AlertDescription>
        </Alert>
      )}

      {activeActivation && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-700 dark:text-green-400">
                {activeActivation.activation_type === 'chip' ? 'Chip Ativado!' : 'eSIM Ativado!'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeActivation.activation_type === 'chip' ? (
              <Alert className="bg-white dark:bg-slate-900">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>✅ Chip pronto para uso!</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p>• Agora você pode <strong>ABRIR o pacote</strong></p>
                  <p>• <strong>REMOVER</strong> o chip do plástico</p>
                  <p>• <strong>INSERIR</strong> no seu aparelho</p>
                  <p>• O chip está pronto para funcionar!</p>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-white dark:bg-slate-900">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle>📱 Leia o QR Code para ativar seu eSIM</AlertTitle>
                  <AlertDescription className="mt-2">
                    Use a câmera do seu dispositivo para ler o QR Code abaixo e completar a ativação do eSIM
                  </AlertDescription>
                </Alert>
                
                {activeActivation.qr_code_url && (
                  <div className="space-y-4">
                    <div className="flex justify-center p-6 bg-white rounded-lg relative">
                      <div className="text-center space-y-3">
                        <div className="relative">
                          <img 
                            src={activeActivation.qr_code_url} 
                            alt="QR Code do eSIM" 
                            className="max-w-[250px] w-full h-auto mx-auto"
                          />
                          {userConfirmedActivation && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 rounded-lg">
                              <div className="text-center">
                                <CheckCircle className="h-16 w-16 text-white mx-auto mb-2" />
                                <p className="text-2xl font-bold text-white">eSIM ATIVO</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Aponte a câmera do seu aparelho para este QR Code
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="font-medium">📱 Como configurar:</p>
                        <ol className="space-y-1 text-muted-foreground">
                          <li>1️⃣ Vá em Configurações → Celular → Adicionar eSIM</li>
                          <li>2️⃣ Escolha "Usar QR Code"</li>
                          <li>3️⃣ Escaneie o código acima</li>
                          <li>4️⃣ Aguarde a ativação (pode levar alguns minutos)</li>
                        </ol>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => window.open(activeActivation.qr_code_url, '_blank')}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir imagem em nova aba
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            className="w-full" 
                            variant="default"
                            disabled={userConfirmedActivation}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {userConfirmedActivation ? "Confirmação já enviada ✓" : "Já li o QR Code e meu chip foi ativado"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Ativação do Chip</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>Tem certeza que deseja enviar a confirmação?</p>
                              <p className="font-semibold">Você já fez os testes de conexão?</p>
                              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                                <li>Abriu o navegador</li>
                                <li>Acessou qualquer site</li>
                                <li>Fez uma chamada de teste (Se tiver contratado)</li>
                              </ul>
                              <p className="text-sm mt-2">Se sim, aperte em continuar para notificar nossa equipe.</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
                                    body: {
                                      messageType: 'chip_activated_by_user',
                                      data: {
                                        fullName: profile?.full_name,
                                        whatsapp: profile?.whatsapp,
                                        activationType: activeActivation.activation_type,
                                      },
                                    },
                                  });

                                  if (error) throw error;

                                  // Marcar como confirmado e salvar no localStorage
                                  localStorage.setItem(`activation-confirmed-${activeActivation.id}`, 'true');
                                  setUserConfirmedActivation(true);

                                  toast.success("Confirmação enviada! Nossa equipe foi notificada sobre a ativação do seu chip.");
                                } catch (error) {
                                  console.error('Erro ao enviar confirmação:', error);
                                  toast.error("Erro ao enviar confirmação. Tente novamente mais tarde.");
                                }
                              }}
                            >
                              Continuar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full mt-4">
                            Perdi meu aparelho ou troquei de aparelho - Preciso ativar novamente
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reativar Chip</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3">
                              <p className="font-semibold">Atenção! Esta ação irá:</p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                <li>Deletar sua ativação atual (QR Code)</li>
                                <li>Permitir que você solicite uma nova ativação</li>
                              </ul>
                              <p className="text-sm mt-3 font-semibold text-orange-600 dark:text-orange-400">
                                ⚠️ Importante:
                              </p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                <li>Se perdeu o celular, certifique-se de desabilitar o eSIM antigo se possível</li>
                                <li>Se trocou de aparelho, remova o eSIM do aparelho antigo antes de ativar no novo</li>
                                <li>Cada eSIM só pode estar ativo em um aparelho por vez</li>
                              </ul>
                              <p className="text-sm mt-2">Tem certeza que deseja continuar?</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteActivation}>
                              Sim, deletar e reativar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Dialog open={showTypeSelectionDialog} onOpenChange={setShowTypeSelectionDialog}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Como você quer solicitar novamente a ativação?</DialogTitle>
                            <DialogDescription>
                              Escolha o tipo de ativação e siga o processo como se fosse sua primeira ativação.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="p-4 border rounded-lg">
                              <h3 className="font-semibold mb-2">📱 Via eSIM (Digital)</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Receba um QR Code para ativar diretamente no seu aparelho. Ideal para aparelhos compatíveis com eSIM.
                              </p>
                              <Button onClick={() => handleSelectActivationType('esim')} className="w-full">
                                Ativar via eSIM
                              </Button>
                            </div>
                            <div className="p-4 border rounded-lg">
                              <h3 className="font-semibold mb-2">💳 Via Chip Físico (SIM Card)</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Tire uma foto do seu chip físico para ativação. Escolha esta opção se seu aparelho não suporta eSIM.
                              </p>
                              <Button onClick={() => handleSelectActivationType('sim')} variant="outline" className="w-full">
                                Ativar via Chip Físico
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50">
        <AnimatedGradient colors={["#8b5cf6", "#a78bfa", "#c4b5fd"]} speed={0.05} blur="medium" />
        <CardHeader className="relative z-10">
          <CardTitle>Solicitar Ativação</CardTitle>
          <CardDescription>
            Escolha o tipo de ativação que deseja realizar
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          {!canActivate && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Regularize sua situação para ter acesso à ativação de chip e eSIM
              </p>
            </div>
          )}
          {canActivate && (
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

                <Button type="submit" className="w-full" disabled={!barcode || isSubmitting || !!pendingActivation}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {pendingActivation ? "Ativação já enviada - Aguarde" : "Enviar Dados do Chip"}
                </Button>
                
                {barcode && !isSubmitting && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      onClick={() => {
                        setBarcode("");
                        if (user?.id) {
                          localStorage.removeItem(`sim-activation-data-${user.id}`);
                        }
                      }}
                      variant="outline"
                    >
                      Nova Ativação
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleClearData}
                      variant="destructive"
                    >
                      Limpar Tudo
                    </Button>
                  </div>
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
                <div className="space-y-3">
                  <Alert className="bg-gradient-to-r from-blue-500 to-purple-600 border-0">
                    <div className="text-white space-y-2">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        <AlertTitle className="text-white text-lg font-bold m-0">📸 PASSO 1: Envie o Print da Tela *#06#</AlertTitle>
                      </div>
                      <AlertDescription className="text-white/90">
                        🤖 <strong>IA Automática!</strong> Envie o print e preencheremos o IMEI e EID automaticamente
                      </AlertDescription>
                    </div>
                  </Alert>
                  
                  <Alert className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>⚠️ Limite de Anexos:</strong> Você pode enviar até <strong>3 anexos por dia</strong> gratuitamente. 
                      Após esse limite, será cobrada uma taxa de <strong>R$ 3,00</strong> por envio adicional.
                    </AlertDescription>
                  </Alert>

                  <div className="relative">
                    <Label 
                      htmlFor="screenshot" 
                      className={`block ${!pendingActivation ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                    >
                      <div className={`border-4 border-dashed border-primary rounded-lg p-8 bg-primary/5 ${!pendingActivation ? 'hover:bg-primary/10' : ''} transition-colors relative group`}>
                        <div className="absolute -top-3 -left-3 bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold animate-pulse shadow-lg">
                          👈 CLIQUE AQUI!
                        </div>
                        
                        <div className="text-center space-y-3">
                          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera className="h-8 w-8 text-primary-foreground" />
                          </div>
                          
                          <div>
                            <p className="text-xl font-bold text-primary">
                              Clique para anexar seu print
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              ou arraste o arquivo aqui
                            </p>
                          </div>

                          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-sm space-y-1">
                            <p className="font-semibold">✨ Como fazer:</p>
                            <p>1. Digite <code className="bg-primary/20 px-2 py-0.5 rounded">*#06#</code> no seu telefone</p>
                            <p>2. Tire um print da tela</p>
                            <p>3. Envie aqui que a IA extrai tudo!</p>
                          </div>
                        </div>
                      </div>
                    </Label>
                    
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                      disabled={isProcessingImage || !!pendingActivation}
                      className="hidden"
                    />
                  </div>

                  {isProcessingImage && (
                    <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        <strong>Processando imagem com IA...</strong> Aguarde enquanto extraímos os dados automaticamente
                      </AlertDescription>
                    </Alert>
                  )}

                  {screenshot && !isProcessingImage && (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        <strong>✅ Print recebido!</strong> Revise os dados abaixo antes de enviar
                      </AlertDescription>
                    </Alert>
                  )}
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

                <Button type="submit" className="w-full" disabled={isSubmitting || !!pendingActivation}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {pendingActivation ? "Ativação já enviada - Aguarde" : "Enviar Dados do eSIM"}
                </Button>
                
                {(imei || eid) && !isSubmitting && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      onClick={() => {
                        setImei("");
                        setEid("");
                        setScreenshot(null);
                        if (user?.id) {
                          localStorage.removeItem(`sim-activation-data-${user.id}`);
                        }
                      }}
                      variant="outline"
                      disabled={!!pendingActivation}
                    >
                      Nova Ativação
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setShowClearDataDialog(true)}
                      variant="destructive"
                    >
                      Limpar Tudo
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação para limpar dados */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                Isto cancelará a ativação que está em andamento.
              </p>
              <p>Todos os dados preenchidos serão perdidos e você precisará iniciar o processo novamente.</p>
              <div className="space-y-2 text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-blue-700 dark:text-blue-400">🔐 Verificação de Segurança:</p>
                <p className="text-blue-600 dark:text-blue-300">Você receberá um código de 6 dígitos no WhatsApp para confirmar o cancelamento.</p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                ⚠️ <strong>Atenção:</strong> Você só pode cancelar <strong>2 ativações por dia</strong>. Após atingir o limite, será necessário aguardar 24 horas.
              </p>
              <p className="text-sm">Deseja realmente continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de seleção de tipo de dispositivo */}
      <Dialog open={showDeviceTypeDialog} onOpenChange={setShowDeviceTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione o tipo de dispositivo</DialogTitle>
            <DialogDescription>
              Para prosseguir com a ativação do eSIM, precisamos saber qual é o sistema operacional do seu dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/10"
              onClick={() => {
                setDeviceType("iOS");
                setShowDeviceTypeDialog(false);
                toast.success("Dispositivo iOS selecionado");
              }}
            >
              <Smartphone className="w-12 h-12" />
              <span className="text-lg font-semibold">iPhone (iOS)</span>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/10"
              onClick={() => {
                setDeviceType("Android");
                setShowDeviceTypeDialog(false);
                toast.success("Dispositivo Android selecionado");
              }}
            >
              <Smartphone className="w-12 h-12" />
              <span className="text-lg font-semibold">Android</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
