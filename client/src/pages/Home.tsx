import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, FileText, ShoppingCart, Lightbulb, ArrowDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function DashboardContent() {
  const { data, isLoading, error } = trpc.funnel.getData.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const utils = trpc.useUtils();
  const refresh = trpc.funnel.refresh.useMutation({
    onSuccess: (newData) => {
      toast.success("Données rafraîchies depuis Nicoka");
      utils.funnel.getData.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données Nicoka...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive font-medium">Erreur de chargement</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const funnelChartData = [
    { name: "Opportunités", value: data.opportunitiesRawTotal, weighted: data.opportunitiesWeightedTotal, count: data.opportunityCount, color: "#9333ea" },
    { name: "Devis", value: data.quotationsRawTotal, weighted: data.quotationsWeightedTotal, count: data.quotationCount, color: "#7c3aed" },
    { name: "Commandes", value: data.ordersTotal, weighted: data.ordersTotal, count: data.orderCount, color: "#22c55e" },
  ];

  const landingBreakdown = [
    { name: "Commandes (certain)", value: data.ordersTotal, fill: "#22c55e" },
    { name: "Devis (pondéré)", value: data.quotationsWeightedTotal, fill: "#7c3aed" },
    { name: "Opportunités (pondéré)", value: data.opportunitiesWeightedTotal, fill: "#9333ea" },
  ];

  const conversionRate = data.opportunitiesRawTotal > 0
    ? ((data.ordersTotal / data.opportunitiesRawTotal) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Atterrissage prévisionnel CA 2026</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Atterrissage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(data.landingTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Prévision totale pondérée</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.ordersTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.orderCount} commande{data.orderCount > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Devis (pondéré)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.quotationsWeightedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.quotationCount} devis · Brut: {formatCurrency(data.quotationsRawTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Opportunités (pondéré)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.opportunitiesWeightedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.opportunityCount} opp. · Brut: {formatCurrency(data.opportunitiesRawTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-primary" /> Funnel Commercial
            </CardTitle>
            <p className="text-sm text-muted-foreground">Montant brut vs pondéré par étape</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="value" name="Brut" radius={[0, 4, 4, 0]} opacity={0.3}>
                  {funnelChartData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Bar>
                <Bar dataKey="weighted" name="Pondéré" radius={[0, 4, 4, 0]}>
                  {funnelChartData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Composition de l'atterrissage</CardTitle>
            <p className="text-sm text-muted-foreground">Répartition par source (montants pondérés)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={landingBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ value }) => `${(value / 1000).toFixed(0)}k€`}>
                  {landingBreakdown.map((entry, index) => (<Cell key={index} fill={entry.fill} />))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taux de conversion global</p>
              <p className="text-3xl font-bold mt-1">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Opportunités brutes → Commandes</p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Facturé</span>
                <span className="font-medium">{formatCurrency(data.ordersInvoiced)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Reste à facturer</span>
                <span className="font-medium">{formatCurrency(data.ordersRemaining)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
