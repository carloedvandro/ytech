import { createContext, useContext, useState, ReactNode } from "react";

interface ImpersonatedUser {
  id: string;
  full_name: string;
  email: string;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  setImpersonatedUser: (user: ImpersonatedUser | null) => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUser,
        setImpersonatedUser,
        isImpersonating: !!impersonatedUser,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}
