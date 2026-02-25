import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export default function VerifyMagicLink() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const verify = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Erreur de vérification.");
      }
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (token) {
      verify.mutate({ token });
    } else {
      setStatus("error");
      setErrorMsg("Token manquant dans l'URL.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Vérification en cours</CardTitle>
              <CardDescription>Validation de votre lien de connexion...</CardDescription>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">Connexion réussie</CardTitle>
              <CardDescription>Redirection vers le dashboard...</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-700">Erreur</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </>
          )}
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/auth/login")}>
              Retour à la connexion
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
