import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, UserPlus, Loader2, TrendingUp } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const sendMagicLink = trpc.auth.sendMagicLink.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
      } else if (data.message) {
        setMagicLinkSent(true);
        toast.success(data.message);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        window.location.href = "/";
      } else if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const requestAccount = trpc.auth.requestAccount.useMutation({
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
      } else if (data.message) {
        toast.success(data.message);
        setRequestName("");
        setRequestEmail("");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">Vérifiez votre boîte mail</CardTitle>
            <CardDescription className="text-base">
              Un lien de connexion a été envoyé à <strong>{email}</strong>. 
              Cliquez sur le lien dans l'email pour vous connecter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMagicLinkSent(false)}
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Funnel Commercial</CardTitle>
          <CardDescription className="text-base">
            Pilotage de l'atterrissage CA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="magic-link" className="text-xs sm:text-sm">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Magic Link
              </TabsTrigger>
              <TabsTrigger value="password" className="text-xs sm:text-sm">
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Mot de passe
              </TabsTrigger>
              <TabsTrigger value="request" className="text-xs sm:text-sm">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Inscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="magic-link" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Adresse email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="prenom.nom@rubix-consulting.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMagicLink.mutate({ email })}
                />
                <p className="text-xs text-muted-foreground">
                  Les adresses @rubix-consulting.com sont automatiquement approuvées.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => sendMagicLink.mutate({ email })}
                disabled={!email || sendMagicLink.isPending}
              >
                {sendMagicLink.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Envoyer le lien de connexion
              </Button>
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Adresse email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && login.mutate({ email, password })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => login.mutate({ email, password })}
                disabled={!email || !password || login.isPending}
              >
                {login.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Se connecter
              </Button>
            </TabsContent>

            <TabsContent value="request" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="req-name">Nom complet</Label>
                <Input
                  id="req-name"
                  placeholder="Prénom Nom"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-email">Adresse email</Label>
                <Input
                  id="req-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => requestAccount.mutate({ email: requestEmail, name: requestName })}
                disabled={!requestEmail || !requestName || requestAccount.isPending}
              >
                {requestAccount.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Demander un accès
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Votre demande sera examinée par un administrateur.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
