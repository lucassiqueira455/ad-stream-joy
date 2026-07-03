import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session }, error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        if (!session) {
          setError("Sessão não encontrada. Tente fazer login novamente.");
        }
      });
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-destructive">{error}</p>
          <a href="/auth" className="mt-4 inline-block text-sm text-primary hover:underline">
            Voltar para o login
          </a>
        </div>
      </div>
    );
  }

  return <Navigate to="/app" />;
}
