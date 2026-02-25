import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function SimulationContent() {
  const { data, isLoading } = trpc.funnel.getData.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

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
        map.set(String(o.stage), o.stageLabel || `Étape ${o.stage}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [data?.allOpportunities]);

  const [qWeights, setQWeights] = useState<Record<string, number>>({});
  const [oWeights, setOWeights] = useState<Record<string, number>>({});
  const [simResult, setSimResult] = useState<any>(null);

  const simulate = trpc.funnel.simulate.useMutation({
    onSuccess: (result) => {
      setSimResult(result);
      toast.success("Simulation terminée");
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
        <p className="text-muted-foreground mt-1">Testez différents scénarios de pondération</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quotation weights */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pondération des devis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotationStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun statut de devis trouvé</p>
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
            <CardTitle className="text-base">Pondération des opportunités</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {opportunityStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun statut d'opportunité trouvé</p>
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
      <div className="flex gap-3">
        <Button onClick={handleRunSimulation} disabled={simulate.isPending}>
          {simulate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Lancer la simulation
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
      </div>

      {/* Results */}
      {simResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Atterrissage simulé</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(simResult.landingTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {simResult.landingTotal > data.landingTotal ? "+" : ""}{formatCurrency(simResult.landingTotal - data.landingTotal)} vs actuel
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Devis pondéré</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(simResult.quotationsWeightedTotal)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Opportunités pondéré</p>
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
                  <Bar dataKey="opportunites" name="Opportunités" fill="#9333ea" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
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
