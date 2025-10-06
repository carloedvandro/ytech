import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Edit2 } from "lucide-react";

interface UsernameManagerProps {
  userId: string;
  currentUsername: string | null;
  onUsernameUpdate: (username: string) => void;
}

export const UsernameManager = ({ userId, currentUsername, onUsernameUpdate }: UsernameManagerProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(!currentUsername);
  const [username, setUsername] = useState(currentUsername || "");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setUsername(currentUsername || "");
    setIsEditing(!currentUsername);
  }, [currentUsername]);

  const checkAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }

    // Validar formato (apenas letras, números e underscore)
    if (!/^[a-z0-9_]+$/.test(value)) {
      setAvailable(false);
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", value)
        .maybeSingle();

      if (error) throw error;

      // Disponível se não existir ou se for o username atual do usuário
      setAvailable(!data || data.id === userId);
    } catch (error) {
      console.error("Erro ao verificar disponibilidade:", error);
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Converter para minúsculas e remover caracteres inválidos
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(sanitized);
    setAvailable(null);

    // Debounce para verificar disponibilidade
    if (sanitized.length >= 3) {
      const timer = setTimeout(() => checkAvailability(sanitized), 500);
      return () => clearTimeout(timer);
    }
  };

  const saveUsername = async () => {
    if (!username || username.length < 3) {
      toast({
        title: "Username inválido",
        description: "O username deve ter no mínimo 3 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      toast({
        title: "Username inválido",
        description: "Use apenas letras minúsculas, números e underscore (_)",
        variant: "destructive",
      });
      return;
    }

    if (available === false) {
      toast({
        title: "Username indisponível",
        description: "Este username já está sendo usado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ username })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Username salvo!",
        description: "Seu link de indicação foi atualizado",
      });

      onUsernameUpdate(username);
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar username",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isEditing && currentUsername) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-2 border rounded-md bg-muted">
          <span className="text-sm text-muted-foreground">@</span>
          <span className="font-medium">{currentUsername}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="username">
          {currentUsername ? "Editar Username" : "Escolha seu Username"}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
            <Input
              id="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="seuusername"
              className="pl-7"
              maxLength={30}
            />
          </div>
          {checking && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />}
          {available === true && <Check className="h-5 w-5 text-green-500 mt-2" />}
          {available === false && <span className="text-destructive text-sm mt-2">✕</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          Apenas letras minúsculas, números e underscore (_). Mínimo 3 caracteres.
        </p>
        {available === false && (
          <p className="text-xs text-destructive">Este username já está em uso</p>
        )}
        {available === true && (
          <p className="text-xs text-green-600">Username disponível!</p>
        )}
      </div>

      <div className="flex gap-2">
        {currentUsername && (
          <Button
            variant="outline"
            onClick={() => {
              setUsername(currentUsername);
              setIsEditing(false);
              setAvailable(null);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
        )}
        <Button
          onClick={saveUsername}
          disabled={loading || !available || checking}
          className="flex-1"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Username
        </Button>
      </div>
    </div>
  );
};
