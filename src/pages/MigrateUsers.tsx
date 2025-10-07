import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function MigrateUsers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resendingPasswords, setResendingPasswords] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [passwordResult, setPasswordResult] = useState<any>(null);

  const executeMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🔄 Iniciando migração de usuários...');
      
      const { data, error } = await supabase.functions.invoke('migrate-users-to-auth', {
        body: {}
      });

      if (error) {
        console.error('❌ Erro na migração:', error);
        throw error;
      }

      console.log('✅ Migração concluída:', data);
      setResult(data);

      toast({
        title: "Migração concluída!",
        description: `${data.results.success} usuários migrados com sucesso`,
      });

    } catch (error: any) {
      console.error('Erro ao executar migração:', error);
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resendPasswords = async () => {
    setResendingPasswords(true);
    setPasswordResult(null);

    try {
      console.log('📱 Reenviando senhas temporárias...');
      
      const { data, error } = await supabase.functions.invoke('resend-temp-passwords', {
        body: {}
      });

      if (error) {
        console.error('❌ Erro ao reenviar senhas:', error);
        throw error;
      }

      console.log('✅ Senhas reenviadas:', data);
      setPasswordResult(data);

      toast({
        title: "Senhas enviadas!",
        description: `${data.results.success} senhas enviadas com sucesso`,
      });

    } catch (error: any) {
      console.error('Erro ao reenviar senhas:', error);
      toast({
        title: "Erro ao enviar senhas",
        description: error.message,
        variant: "destructive",
      });
      setPasswordResult({ error: error.message });
    } finally {
      setResendingPasswords(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Migração de Usuários para Supabase Auth</CardTitle>
          <CardDescription>
            Esta ferramenta irá migrar os usuários existentes da tabela antiga para o novo sistema de autenticação seguro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avisos */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  ⚠️ Importante - Leia antes de executar:
                </p>
                <ul className="space-y-1 text-amber-800 dark:text-amber-200 list-disc list-inside">
                  <li>Esta migração só pode ser executada UMA VEZ</li>
                  <li>Os usuários receberão senhas temporárias via WhatsApp</li>
                  <li>Após a migração, os usuários deverão fazer login novamente</li>
                  <li>A tabela antiga será mantida como backup</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botão de execução */}
          <div className="flex justify-center">
            <Button
              onClick={executeMigration}
              disabled={loading || (result?.results?.success > 0)}
              size="lg"
              className="w-full max-w-md"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {result?.results?.success > 0 ? "Migração já executada" : "Executar Migração"}
            </Button>
          </div>

          {/* Resultado */}
          {result && !result.error && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      ✅ Migração concluída com sucesso!
                    </p>
                    <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                      <p>✓ {result.results.success} usuários migrados</p>
                      <p>✗ {result.results.failed} falhas</p>
                    </div>
                  </div>
                </div>
              </div>

              {result.results.errors && result.results.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        Erros na migração:
                      </p>
                      <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                        {result.results.errors.map((err: any, idx: number) => (
                          <li key={idx} className="font-mono text-xs">
                            {err.user}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {result?.error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    ❌ Erro na migração
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                    {result.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reenviar senhas */}
          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">🔑 Reenviar Senhas Temporárias</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Se os usuários não receberam as senhas via WhatsApp, clique no botão abaixo para reenviar.
                  Novas senhas temporárias serão geradas e enviadas.
                </p>
              </div>

              <Button
                onClick={resendPasswords}
                disabled={resendingPasswords}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                {resendingPasswords && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Reenviar Senhas via WhatsApp
              </Button>

              {/* Resultado do reenvio */}
              {passwordResult && !passwordResult.error && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        ✅ Senhas reenviadas com sucesso!
                      </p>
                      <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                        <p>✓ {passwordResult.results.success} senhas enviadas</p>
                        <p>✗ {passwordResult.results.failed} falhas</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {passwordResult?.results?.errors && passwordResult.results.errors.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                        Alguns erros ocorreram:
                      </p>
                      <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                        {passwordResult.results.errors.map((err: any, idx: number) => (
                          <li key={idx} className="font-mono text-xs">
                            {err.email}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {passwordResult?.error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        ❌ Erro ao reenviar senhas
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                        {passwordResult.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Próximos passos */}
          {result?.results?.success > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📋 Próximos passos:
              </p>
              <ol className="space-y-1 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
                <li>Verifique os usuários migrados em Cloud → Users</li>
                <li>Teste o login com as novas credenciais</li>
                <li>Os usuários devem ter recebido senha temporária no WhatsApp</li>
                <li>Após confirmar que tudo funciona, você pode deletar a tabela antiga</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
