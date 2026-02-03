import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, MessageCircle, Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SettingsAuditLog {
  id: string;
  setting_key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

export function NotificationChannelToggle() {
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [auditLogs, setAuditLogs] = useState<SettingsAuditLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchCurrentSetting();
  }, []);

  const fetchCurrentSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('notification_channel')
        .eq('id', 'main')
        .single();

      if (error) throw error;
      setChannel((data?.notification_channel as 'email' | 'whatsapp') || 'email');
    } catch (err) {
      console.error('Erro ao buscar configuração:', err);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('settings_audit_log')
        .select('*')
        .eq('setting_key', 'notification_channel')
        .order('changed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const handleToggle = async (checked: boolean) => {
    const newChannel = checked ? 'whatsapp' : 'email';
    const oldChannel = channel;
    
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar configuração
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({
          notification_channel: newChannel,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', 'main');

      if (updateError) throw updateError;

      // Registrar no log de auditoria
      const { error: logError } = await supabase
        .from('settings_audit_log')
        .insert({
          setting_key: 'notification_channel',
          old_value: oldChannel,
          new_value: newChannel,
          changed_by: user.id
        });

      if (logError) {
        console.error('Erro ao registrar log:', logError);
      }

      setChannel(newChannel);
      toast.success(
        newChannel === 'whatsapp' 
          ? '📱 Notificações via WhatsApp ativadas!' 
          : '📧 Notificações via Email ativadas!'
      );
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {channel === 'whatsapp' ? (
            <MessageCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Mail className="h-5 w-5 text-blue-500" />
          )}
          Canal de Notificações
        </CardTitle>
        <CardDescription>
          Escolha como o sistema envia notificações (códigos de verificação, alertas, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3">
            <Mail className={`h-5 w-5 ${channel === 'email' ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <span className={channel === 'email' ? 'font-medium' : 'text-muted-foreground'}>
              Email
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Switch
              checked={channel === 'whatsapp'}
              onCheckedChange={handleToggle}
              disabled={updating}
            />
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          
          <div className="flex items-center gap-3">
            <span className={channel === 'whatsapp' ? 'font-medium' : 'text-muted-foreground'}>
              WhatsApp
            </span>
            <MessageCircle className={`h-5 w-5 ${channel === 'whatsapp' ? 'text-green-500' : 'text-muted-foreground'}`} />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {channel === 'whatsapp' ? (
              <span>🟢 WhatsApp ativo via Mega API</span>
            ) : (
              <span>🔵 Email ativo via Resend</span>
            )}
          </div>
          
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowHistory(true);
                  fetchAuditLogs();
                }}
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Histórico de Alterações</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma alteração registrada
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-3 rounded-lg border text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {log.old_value === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MessageCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span>→</span>
                        {log.new_value === 'whatsapp' ? (
                          <MessageCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Mail className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(log.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {channel === 'whatsapp' && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-sm">
            <p className="text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Atenção:</strong> Certifique-se de que a Mega API está funcionando e não está bloqueada antes de ativar o WhatsApp.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
