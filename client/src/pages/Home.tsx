import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, FileText, ShoppingCart, Lightbulb, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { toast } from "sonner";
import { useMemo } from "react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M€`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k€`;
  return `${value}€`;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Composant Funnel en entonnoir SVG ───

interface FunnelStage {
  label: string;
  value: number;
  weighted: number;
  count: number;
  color: string;
  textColor: string;
}

function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxValue = Math.max(...stages.map((s) => s.value), 1);
  const chartHeight = 360;
  const chartWidth = 600;
  const stageHeight = chartHeight / stages.length;
  const minWidth = 80;
  const maxWidth = chartWidth - 40;

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full max-w-[600px]" preserveAspectRatio="xMidYMid meet">
        {stages.map((stage, i) => {
          const currentWidth = Math.max(minWidth, (stage.value / maxValue) * maxWidth);
          const nextWidth = i < stages.length - 1
            ? Math.max(minWidth, (stages[i + 1].value / maxValue) * maxWidth)
            : currentWidth * 0.6;
          const currentX = (chartWidth - currentWidth) / 2;
          const nextX = (chartWidth - nextWidth) / 2;
          const y = i * stageHeight;

          const path = `M ${currentX} ${y} L ${currentX + currentWidth} ${y} L ${nextX + nextWidth} ${y + stageHeight} L ${nextX} ${y + stageHeight} Z`;

          return (
            <g key={stage.label}>
              <path d={path} fill={stage.color} opacity={0.85} className="transition-opacity hover:opacity-100" />
              <path d={path} fill="none" stroke="white" strokeWidth={1.5} />
              {/* Label */}
              <text x={chartWidth / 2} y={y + stageHeight / 2 - 10} textAnchor="middle" className="text-[13px] font-semibold" fill="white">
                {stage.label}
              </text>
              <text x={chartWidth / 2} y={y + stageHeight / 2 + 10} textAnchor="middle" className="text-[12px]" fill="rgba(255,255,255,0.9)">
                {formatCompact(stage.value)} brut · {formatCompact(stage.weighted)} pondéré
              </text>
              <text x={chartWidth / 2} y={y + stageHeight / 2 + 28} textAnchor="middle" className="text-[11px]" fill="rgba(255,255,255,0.7)">
                {stage.count} élément{stage.count > 1 ? "s" : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DashboardContent() {
  const { data, isLoading, error } = trpc.funnel.getData.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const utils = trpc.useUtils();
  const sync = trpc.funnel.sync.useMutation({
    onSuccess: () => {
      toast.success("Données synchronisées depuis Nicoka");
      utils.funnel.getData.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const funnelStages = useMemo<FunnelStage[]>(() => {
    if (!data) return [];
    return [
      {
        label: "Opportunités",
        value: data.opportunitiesRawTotal || 0,
        weighted: data.opportunitiesWeightedTotal || 0,
        count: data.opportunityCount || 0,
        color: "#8b5cf6",
        textColor: "#7c3aed",
      },
      {
        label: "Devis",
        value: data.quotationsRawTotal || 0,
        weighted: data.quotationsWeightedTotal || 0,
        count: data.quotationCount || 0,
        color: "#6366f1",
        textColor: "#4f46e5",
      },
      {
        label: "Commandes",
        value: data.ordersTotal || 0,
        weighted: data.ordersTotal || 0,
        count: data.orderCount || 0,
        color: "#22c55e",
        textColor: "#16a34a",
      },
    ];
  }, [data]);

  const landingBreakdown = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Commandes (certain)", value: data.ordersTotal || 0, fill: "#22c55e" },
      { name: "Devis (pondéré)", value: data.quotationsWeightedTotal || 0, fill: "#6366f1" },
      { name: "Opportunités (pondéré)", value: data.opportunitiesWeightedTotal || 0, fill: "#8b5cf6" },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
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

  const conversionRate = data.opportunitiesRawTotal > 0
    ? ((data.ordersTotal / data.opportunitiesRawTotal) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Atterrissage prévisionnel CA {new Date().getFullYear()}</p>
        </div>
        <div className="flex items-center gap-3">
          {data.lastSync && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Sync : {formatDate(data.lastSync)}</span>
              {data.fromCache && <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">cache</span>}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Synchroniser
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Atterrissage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(data.landingTotal || 0)}</p>
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
            <p className="text-2xl font-bold">{formatCurrency(data.ordersTotal || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.orderCount || 0} commande{(data.orderCount || 0) > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Devis (pondéré)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.quotationsWeightedTotal || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.quotationCount || 0} devis · Brut: {formatCurrency(data.quotationsRawTotal || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Opportunités (pondéré)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.opportunitiesWeightedTotal || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.opportunityCount || 0} opp. · Brut: {formatCurrency(data.opportunitiesRawTotal || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel en entonnoir */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Entonnoir commercial</CardTitle>
            <p className="text-sm text-muted-foreground">Progression Opportunités → Devis → Commandes</p>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnelStages} />
          </CardContent>
        </Card>

        {/* Composition atterrissage */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Composition de l'atterrissage</CardTitle>
            <p className="text-sm text-muted-foreground">Répartition par source (montants pondérés)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={landingBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ value }: { value: number }) => formatCompact(value)}>
                  {landingBreakdown.map((entry, index) => (<Cell key={index} fill={entry.fill} />))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Barres empilées : Réel vs Atterrissage */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Réel vs Atterrissage</CardTitle>
          <p className="text-sm text-muted-foreground">Comparaison entre le chiffre réel (commandes) et l'atterrissage prévisionnel</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                {
                  name: "CA " + new Date().getFullYear(),
                  Commandes: data.ordersTotal || 0,
                  "Devis pondérés": data.quotationsWeightedTotal || 0,
                  "Opportunités pondérées": data.opportunitiesWeightedTotal || 0,
                },
              ]}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => formatCompact(v)} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="Commandes" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Devis pondérés" stackId="a" fill="#6366f1" />
              <Bar dataKey="Opportunités pondérées" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Métriques */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Taux de conversion global</p>
              <p className="text-3xl font-bold mt-1">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Opportunités brutes → Commandes</p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Facturé</span>
                <span className="font-medium">{formatCurrency(data.ordersInvoiced || 0)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Reste à facturer</span>
                <span className="font-medium">{formatCurrency(data.ordersRemaining || 0)}</span>
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
