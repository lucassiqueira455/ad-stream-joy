import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate({ from: "/auth/callback" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session?.user) {
        navigate({ to: "/app", replace: true });
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_IN" && session) {
          navigate({ to: "/app", replace: true });
        }
      });

      setTimeout(() => {
        if (!mounted) return;
        subscription.unsubscribe();
        setError("Sessão não encontrada. Tente fazer login novamente.");
      }, 5000);

      return () => {
        subscription.unsubscribe();
      };
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

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

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Conectando sua conta…</p>
      </div>
    </div>
  );
}
