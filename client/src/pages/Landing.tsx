import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function LandingContent() {
  const { data, isLoading } = trpc.funnel.getData.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Détail de l'atterrissage</h1>
        <p className="text-muted-foreground mt-1">Vue détaillée des commandes, devis et opportunités</p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Commandes ({data.orderCount})</TabsTrigger>
          <TabsTrigger value="quotations">Devis ({data.quotationCount})</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunités ({data.opportunityCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Commandes — {formatCurrency(data.ordersTotal)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Réf.</th>
                      <th className="pb-3 font-medium text-muted-foreground">Client</th>
                      <th className="pb-3 font-medium text-muted-foreground">Statut</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Montant HT</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Facturé</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Reste</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o: any) => (
                      <tr key={o.orderid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs">{o.uid || o.reference}</td>
                        <td className="py-3">{o.customerLabel || `Client #${o.customerid}`}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">{o.statusLabel || o.status}</span></td>
                        <td className="py-3 text-right font-medium">{formatCurrency(o.gross_total)}</td>
                        <td className="py-3 text-right">{formatCurrency(o.total_invoiced)}</td>
                        <td className="py-3 text-right">{formatCurrency(o.still_to_invoice)}</td>
                        <td className="py-3 text-muted-foreground">{o.date ? new Date(o.date).toLocaleDateString("fr-FR") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.orders.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune commande</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Devis (sans commande) — Brut: {formatCurrency(data.quotationsRawTotal)} · Pondéré: {formatCurrency(data.quotationsWeightedTotal)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Réf.</th>
                      <th className="pb-3 font-medium text-muted-foreground">Client</th>
                      <th className="pb-3 font-medium text-muted-foreground">Statut</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Montant HT</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Période</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quotations.map((q: any) => (
                      <tr key={q.quotationid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs">{q.uid || q.reference}</td>
                        <td className="py-3">{q.customerLabel || `Client #${q.customerid}`}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs">{q.statusLabel || q.status}</span></td>
                        <td className="py-3 text-right font-medium">{formatCurrency(q.gross_total)}</td>
                        <td className="py-3 text-muted-foreground">{q.date ? new Date(q.date).toLocaleDateString("fr-FR") : "-"}</td>
                        <td className="py-3 text-muted-foreground text-xs">{q.period_start && q.period_end ? `${new Date(q.period_start).toLocaleDateString("fr-FR")} - ${new Date(q.period_end).toLocaleDateString("fr-FR")}` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.quotations.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun devis sans commande</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Opportunités (dédoublonnées) — Brut: {formatCurrency(data.opportunitiesRawTotal)} · Pondéré: {formatCurrency(data.opportunitiesWeightedTotal)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Libellé</th>
                      <th className="pb-3 font-medium text-muted-foreground">Client</th>
                      <th className="pb-3 font-medium text-muted-foreground">Étape</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Montant</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Probabilité</th>
                      <th className="pb-3 font-medium text-muted-foreground">Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.opportunities.map((op: any) => (
                      <tr key={op.opid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3">{op.label}</td>
                        <td className="py-3">{op.customerLabel || `Client #${op.customerid}`}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">{op.stageLabel || op.stage}</span></td>
                        <td className="py-3 text-right font-medium">{formatCurrency(op.amount)}</td>
                        <td className="py-3 text-right">{op.probability !== null ? `${op.probability}%` : "-"}</td>
                        <td className="py-3 text-muted-foreground">{op.assign_to_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.opportunities.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune opportunité dédoublonnée</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Landing() {
  return (
    <DashboardLayout>
      <LandingContent />
    </DashboardLayout>
  );
}
