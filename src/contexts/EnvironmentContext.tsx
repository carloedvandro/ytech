import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Environment = "sandbox" | "production";

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isSandbox: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironmentState] = useState<Environment>(() => {
    const stored = localStorage.getItem("app_environment");
    return (stored === "sandbox" ? "sandbox" : "production") as Environment;
  });

  const setEnvironment = (env: Environment) => {
    localStorage.setItem("app_environment", env);
    setEnvironmentState(env);
  };

  useEffect(() => {
    // Sincronizar com localStorage
    const stored = localStorage.getItem("app_environment");
    if (stored && stored !== environment) {
      setEnvironmentState(stored as Environment);
    }
  }, []);

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        setEnvironment,
        isSandbox: environment === "sandbox",
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
}
