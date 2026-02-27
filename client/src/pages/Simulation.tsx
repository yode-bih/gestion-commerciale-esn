import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Play, RotateCcw, Save, History, Trash2, Upload, Calendar, User } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function SimulationContent() {
  const { data, isLoading } = trpc.funnel.getData.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const savedSimulations = trpc.simulation.list.useQuery(undefined, { staleTime: 30 * 1000 });
  const utils = trpc.useUtils();

  // Collect unique statuses from data
  const quotationStatuses = useMemo(() => {
    if (!data?.allQuotations) return [];
    const map = new Map<string, string>();
    data.allQuotations.forEach((q: any) => {
      if (q.status && !map.has(String(q.status))) {
        map.set(String(q.status), q.statusLabel || `Statut ${q.status}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [data?.allQuotations]);

  const opportunityStatuses = useMemo(() => {
    if (!data?.allOpportunities) return [];
    const map = new Map<string, string>();
    data.allOpportunities.forEach((o: any) => {
      if (o.stage && !map.has(String(o.stage))) {
        map.set(String(o.stage), o.stageLabel || `\u00c9tape ${o.stage}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [data?.allOpportunities]);

  const [qWeights, setQWeights] = useState<Record<string, number>>({});
  const [oWeights, setOWeights] = useState<Record<string, number>>({});
  const [simResult, setSimResult] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");

  const simulate = trpc.funnel.simulate.useMutation({
    onSuccess: (result) => {
      setSimResult(result);
      toast.success("Simulation termin\u00e9e");
    },
    onError: (err) => toast.error(err.message),
  });

  const saveSimulation = trpc.simulation.save.useMutation({
    onSuccess: () => {
      toast.success("Simulation sauvegard\u00e9e");
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveNotes("");
      utils.simulation.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSimulation = trpc.simulation.delete.useMutation({
    onSuccess: () => {
      toast.success("Simulation supprim\u00e9e");
      utils.simulation.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleRunSimulation = () => {
    simulate.mutate({
      quotationWeights: qWeights,
      opportunityWeights: oWeights,
    });
  };

  const handleReset = () => {
    setQWeights({});
    setOWeights({});
    setSimResult(null);
  };

  const handleSave = () => {
    if (!simResult || !saveName.trim()) return;
    saveSimulation.mutate({
      name: saveName.trim(),
      year: new Date().getFullYear(),
      quotationWeights: qWeights,
      opportunityWeights: oWeights,
      totalAtterrissage: simResult.landingTotal,
      totalCommandes: simResult.ordersTotal,
      totalDevisPondere: simResult.quotationsWeightedTotal,
      totalOpportunitePondere: simResult.opportunitiesWeightedTotal,
      totalDevisBrut: simResult.quotationsBrutTotal,
      totalOpportuniteBrut: simResult.opportunitiesBrutTotal,
      nbCommandes: simResult.ordersCount || 0,
      nbDevis: simResult.quotationsCount || 0,
      nbOpportunites: simResult.opportunitiesCount || 0,
      notes: saveNotes.trim() || undefined,
    });
  };

  const handleRestore = (sim: any) => {
    const qw = sim.quotationWeights as Record<string, number>;
    const ow = sim.opportunityWeights as Record<string, number>;
    setQWeights(qw || {});
    setOWeights(ow || {});
    setSimResult(null);
    toast.info(`Param\u00e8tres de "${sim.name}" restaur\u00e9s. Lancez la simulation pour recalculer.`);
  };

  const comparisonData = simResult ? [
    {
      name: "Actuel",
      commandes: data.ordersTotal,
      devis: data.quotationsWeightedTotal,
      opportunites: data.opportunitiesWeightedTotal,
      total: data.landingTotal,
    },
    {
      name: "Simulation",
      commandes: simResult.ordersTotal,
      devis: simResult.quotationsWeightedTotal,
      opportunites: simResult.opportunitiesWeightedTotal,
      total: simResult.landingTotal,
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Simulation</h1>
        <p className="text-muted-foreground mt-1">Testez diff\u00e9rents sc\u00e9narios de pond\u00e9ration et sauvegardez-les</p>
      </div>

      <Tabs defaultValue="simulate" className="w-full">
        <TabsList>
          <TabsTrigger value="simulate" className="gap-2">
            <Play className="h-4 w-4" />
            Simuler
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <History className="h-4 w-4" />
            Historique ({savedSimulations.data?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulate" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quotation weights */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Pond\u00e9ration des devis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quotationStatuses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun statut de devis trouv\u00e9</p>
                )}
                {quotationStatuses.map((s) => (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{s.label}</Label>
                      <span className="text-sm font-mono text-primary">{((qWeights[s.id] ?? 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[(qWeights[s.id] ?? 0.5) * 100]}
                      onValueChange={([v]) => setQWeights((prev) => ({ ...prev, [s.id]: v / 100 }))}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Opportunity weights */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Pond\u00e9ration des opportunit\u00e9s</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {opportunityStatuses.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun statut d'opportunit\u00e9 trouv\u00e9</p>
                )}
                {opportunityStatuses.map((s) => (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{s.label}</Label>
                      <span className="text-sm font-mono text-primary">{((oWeights[s.id] ?? 0.3) * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[(oWeights[s.id] ?? 0.3) * 100]}
                      onValueChange={([v]) => setOWeights((prev) => ({ ...prev, [s.id]: v / 100 }))}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleRunSimulation} disabled={simulate.isPending}>
              {simulate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Lancer la simulation
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              R\u00e9initialiser
            </Button>
            {simResult && (
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sauvegarder la simulation</DialogTitle>
                    <DialogDescription>
                      Donnez un nom \u00e0 cette simulation pour la retrouver facilement.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nom de la simulation</Label>
                      <Input
                        placeholder="Ex: Sc\u00e9nario optimiste Q1 2026"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (optionnel)</Label>
                      <Textarea
                        placeholder="D\u00e9crivez les hypoth\u00e8ses de cette simulation..."
                        value={saveNotes}
                        onChange={(e) => setSaveNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Card className="border bg-muted/50">
                      <CardContent className="pt-4 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Atterrissage</span>
                          <span className="font-semibold text-primary">{formatCurrency(simResult.landingTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Commandes</span>
                          <span>{formatCurrency(simResult.ordersTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Devis pond\u00e9r\u00e9</span>
                          <span>{formatCurrency(simResult.quotationsWeightedTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Opportunit\u00e9s pond\u00e9r\u00e9</span>
                          <span>{formatCurrency(simResult.opportunitiesWeightedTotal)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleSave} disabled={!saveName.trim() || saveSimulation.isPending}>
                      {saveSimulation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Sauvegarder
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Results */}
          {simResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Atterrissage simul\u00e9</p>
                    <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(simResult.landingTotal)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {simResult.landingTotal > data.landingTotal ? "+" : ""}{formatCurrency(simResult.landingTotal - data.landingTotal)} vs actuel
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Devis pond\u00e9r\u00e9</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(simResult.quotationsWeightedTotal)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Opportunit\u00e9s pond\u00e9r\u00e9</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(simResult.opportunitiesWeightedTotal)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Comparaison actuel vs simulation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData} margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="commandes" name="Commandes" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="devis" name="Devis" fill="#7c3aed" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="opportunites" name="Opportunit\u00e9s" fill="#9333ea" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-6 mt-6">
          {savedSimulations.isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !savedSimulations.data?.length ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium">Aucune simulation sauvegard\u00e9e</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Lancez une simulation puis cliquez sur "Sauvegarder" pour conserver vos sc\u00e9narios.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {savedSimulations.data.map((sim: any) => (
                <Card key={sim.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{sim.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(sim.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {sim.creatorName || sim.creatorEmail || "Inconnu"}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{sim.year}</span>
                        </div>
                        {sim.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sim.notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-primary">{formatCurrency(parseFloat(sim.totalAtterrissage))}</p>
                        <p className="text-xs text-muted-foreground">Atterrissage</p>
                      </div>
                    </div>

                    {/* Détails des résultats */}
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Commandes</p>
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(parseFloat(sim.totalCommandes))}</p>
                        <p className="text-xs text-muted-foreground">{sim.nbCommandes} cmd</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Devis pond\u00e9r\u00e9</p>
                        <p className="text-sm font-semibold">{formatCurrency(parseFloat(sim.totalDevisPondere))}</p>
                        <p className="text-xs text-muted-foreground">{sim.nbDevis} devis (brut: {formatCurrency(parseFloat(sim.totalDevisBrut))})</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Opportunit\u00e9s pond\u00e9r\u00e9</p>
                        <p className="text-sm font-semibold">{formatCurrency(parseFloat(sim.totalOpportunitePondere))}</p>
                        <p className="text-xs text-muted-foreground">{sim.nbOpportunites} opp. (brut: {formatCurrency(parseFloat(sim.totalOpportuniteBrut))})</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button size="sm" variant="outline" onClick={() => handleRestore(sim)}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Restaurer les param\u00e8tres
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette simulation ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La simulation "{sim.name}" sera d\u00e9finitivement supprim\u00e9e. Cette action est irr\u00e9versible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSimulation.mutate({ id: sim.id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Simulation() {
  return (
    <DashboardLayout>
      <SimulationContent />
    </DashboardLayout>
  );
}
