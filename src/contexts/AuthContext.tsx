import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  email?: string;
  cpf: string;
  whatsapp: string;
  username?: string;
  status: string;
  referred_by?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Se não tem email, usar o email passado como parâmetro
        const email = data.email || userEmail;
        
        // Atualizar email se necessário
        if (!data.email && userEmail) {
          await supabase
            .from('profiles')
            .update({ email: userEmail })
            .eq('id', userId);
        }
        
        setProfile({
          ...data,
          email
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Não mostrar toast de erro no profile fetch para não confundir o usuário
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      // Limpar estado local primeiro
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Tentar fazer logout no Supabase
      // Se falhar (ex: sessão já expirada), não é um erro crítico
      const { error } = await supabase.auth.signOut();
      
      // Só mostrar erro se não for "session_not_found"
      if (error && error.message !== 'Session from session_id claim in JWT does not exist') {
        console.error('Erro ao fazer logout:', error);
        // Não bloquear o logout por este erro
      }
      
      // Limpar todos os dados sensíveis do localStorage
      localStorage.removeItem('sb-fkdaaxaybuynohmnatdv-auth-token');
      // Limpar dados de ativação de SIM de todos os usuários
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sim-activation-data-')) {
          localStorage.removeItem(key);
        }
      });
      
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
    } catch (error: any) {
      console.error('Erro inesperado no logout:', error);
      // Ainda assim limpar o estado local
      setUser(null);
      setSession(null);
      setProfile(null);
      
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    // Clean potentially corrupted auth state on mount
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('temp-') || 
          key.startsWith('pending-')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      if (keysToRemove.length > 0) {
        console.log('🧹 AuthContext: Cleaned corrupted data on mount');
      }
    } catch (e) {
      console.error('Error cleaning auth state:', e);
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', event, 'User:', session?.user?.id);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid blocking auth callback
        if (session?.user) {
          console.log('📝 Fetching profile for:', session.user.id);
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user.id, session.user.email);
            }
          }, 0);
        } else {
          console.log('❌ No session, clearing profile');
          setProfile(null);
        }
        
        // Only set loading false if initial check is done
        if (initialCheckDone && mounted) {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log('🔍 Initial session check:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: error?.message 
        });
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('📝 Initial profile fetch for:', session.user.id);
          fetchProfile(session.user.id, session.user.email).finally(() => {
            if (mounted) {
              initialCheckDone = true;
              setLoading(false);
            }
          });
        } else {
          initialCheckDone = true;
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('❌ Error getting session:', err);
        if (mounted) {
          initialCheckDone = true;
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
