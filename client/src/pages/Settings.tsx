import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function SettingsContent() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration générale de l'application</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Informations du compte
          </CardTitle>
          <CardDescription>Détails de votre compte administrateur</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Nom</Label>
              <p className="font-medium">{user?.name || "-"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Email</Label>
              <p className="font-medium">{user?.email || "-"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Rôle</Label>
              <p className="font-medium capitalize">{user?.role || "user"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Année fiscale en cours</Label>
              <p className="font-medium">{currentYear}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" /> Intégration Nicoka
          </CardTitle>
          <CardDescription>Paramètres de connexion à l'API Nicoka</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Sous-domaine</Label>
              <p className="font-medium font-mono text-sm">rubix-consulting</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Statut API</Label>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Connecté
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Domaines auto-approuvés</CardTitle>
          <CardDescription>Les adresses email de ces domaines sont automatiquement approuvées lors de l'inscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-mono">@rubix-consulting.com</span>
            <span className="ml-auto text-xs text-muted-foreground">Auto-approbation active</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}
