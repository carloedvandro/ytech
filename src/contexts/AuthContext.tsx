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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Se não tem email, buscar do session
        const email = data.email || session?.user?.email;
        
        // Atualizar email se necessário
        if (!data.email && session?.user?.email) {
          await supabase
            .from('profiles')
            .update({ email: session.user.email })
            .eq('id', userId);
        }
        
        setProfile({
          ...data,
          email
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      });
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
      
      // Limpar localStorage manualmente
      localStorage.removeItem('sb-fkdaaxaybuynohmnatdv-auth-token');
      
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid blocking auth callback
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
