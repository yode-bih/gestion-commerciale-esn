import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

type SortDir = "asc" | "desc" | null;
type SortField = string;

function useSortableTable<T>(items: T[], defaultField?: SortField) {
  const [sortField, setSortField] = useState<SortField | null>(defaultField || null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortField(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortField || !sortDir) return items;
    return [...items].sort((a: any, b: any) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb), "fr") : String(vb).localeCompare(String(va), "fr");
    });
  }, [items, sortField, sortDir]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    if (sortDir === "asc") return <ArrowUp className="h-3 w-3 ml-1 inline text-primary" />;
    return <ArrowDown className="h-3 w-3 ml-1 inline text-primary" />;
  };

  return { sorted, toggleSort, SortIcon, sortField, sortDir };
}

function LandingContent() {
  const { data, isLoading } = trpc.funnel.getData.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  // Filtres commandes
  const [orderClientFilter, setOrderClientFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Filtres devis
  const [quotationClientFilter, setQuotationClientFilter] = useState("");
  const [quotationStatusFilter, setQuotationStatusFilter] = useState("all");

  // Filtres opportunités
  const [opClientFilter, setOpClientFilter] = useState("");
  const [opStageFilter, setOpStageFilter] = useState("all");

  // Filtrage des commandes
  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.filter((o: any) => {
      const matchClient = !orderClientFilter || (o.customerName || "").toLowerCase().includes(orderClientFilter.toLowerCase());
      const matchStatus = orderStatusFilter === "all" || String(o.status) === orderStatusFilter;
      return matchClient && matchStatus;
    });
  }, [data, orderClientFilter, orderStatusFilter]);

  // Filtrage des devis
  const filteredQuotations = useMemo(() => {
    if (!data) return [];
    return data.quotations.filter((q: any) => {
      const matchClient = !quotationClientFilter || (q.customerName || "").toLowerCase().includes(quotationClientFilter.toLowerCase());
      const matchStatus = quotationStatusFilter === "all" || String(q.status) === quotationStatusFilter;
      return matchClient && matchStatus;
    });
  }, [data, quotationClientFilter, quotationStatusFilter]);

  // Filtrage des opportunités
  const filteredOpportunities = useMemo(() => {
    if (!data) return [];
    return data.opportunities.filter((op: any) => {
      const matchClient = !opClientFilter || (op.customerName || "").toLowerCase().includes(opClientFilter.toLowerCase());
      const matchStage = opStageFilter === "all" || String(op.stage) === opStageFilter;
      return matchClient && matchStage;
    });
  }, [data, opClientFilter, opStageFilter]);

  // Statuts uniques pour les selects
  const uniqueOrderStatuses = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.orders.forEach((o: any) => map.set(String(o.status), o.statusLabel || `Statut ${o.status}`));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [data]);

  const uniqueQuotationStatuses = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.quotations.forEach((q: any) => map.set(String(q.status), q.statusLabel || `Statut ${q.status}`));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [data]);

  const uniqueOpStages = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    data.opportunities.forEach((op: any) => map.set(String(op.stage), op.stageLabel || `Étape ${op.stage}`));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [data]);

  // Tri
  const orderSort = useSortableTable(filteredOrders);
  const quotationSort = useSortableTable(filteredQuotations);
  const opSort = useSortableTable(filteredOpportunities);

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
        <p className="text-muted-foreground mt-1">Vue détaillée des commandes, devis et opportunités — Année {new Date().getFullYear()}</p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">Commandes ({data.orderCount})</TabsTrigger>
          <TabsTrigger value="quotations">Devis ({data.quotationCount})</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunités ({data.opportunityCount})</TabsTrigger>
        </TabsList>

        {/* ─── COMMANDES ─── */}
        <TabsContent value="orders">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Commandes — {formatCurrency(data.ordersTotal)}</CardTitle>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Filtrer par client..." value={orderClientFilter} onChange={(e) => setOrderClientFilter(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger className="w-[200px] h-9">
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {uniqueOrderStatuses.map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => orderSort.toggleSort("label")}>Nom <orderSort.SortIcon field="label" /></th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => orderSort.toggleSort("customerName")}>Client <orderSort.SortIcon field="customerName" /></th>
                      <th className="pb-3 font-medium text-muted-foreground">Projet</th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => orderSort.toggleSort("statusLabel")}>Statut <orderSort.SortIcon field="statusLabel" /></th>
                      <th className="pb-3 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => orderSort.toggleSort("gross_total")}>Montant HT <orderSort.SortIcon field="gross_total" /></th>
                      <th className="pb-3 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => orderSort.toggleSort("total_invoiced")}>Facturé <orderSort.SortIcon field="total_invoiced" /></th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Reste</th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => orderSort.toggleSort("date")}>Date <orderSort.SortIcon field="date" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderSort.sorted.map((o: any) => (
                      <tr key={o.orderid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{o.label || "-"}</td>
                        <td className="py-3">{o.customerName || "-"}</td>
                        <td className="py-3 text-xs text-muted-foreground">{o.projectLabel || "-"}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">{o.statusLabel}</span></td>
                        <td className="py-3 text-right font-medium">{formatCurrency(o.gross_total)}</td>
                        <td className="py-3 text-right">{formatCurrency(o.total_invoiced)}</td>
                        <td className="py-3 text-right">{formatCurrency(o.still_to_invoice)}</td>
                        <td className="py-3 text-muted-foreground">{o.date ? new Date(o.date).toLocaleDateString("fr-FR") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune commande correspondante</p>}
                {filteredOrders.length > 0 && filteredOrders.length !== data.orders.length && (
                  <p className="text-xs text-muted-foreground mt-2">{filteredOrders.length} sur {data.orders.length} commandes affichées</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DEVIS ─── */}
        <TabsContent value="quotations">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Devis (sans commande) — Brut: {formatCurrency(data.quotationsRawTotal)} · Pondéré: {formatCurrency(data.quotationsWeightedTotal)}</CardTitle>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Filtrer par client..." value={quotationClientFilter} onChange={(e) => setQuotationClientFilter(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={quotationStatusFilter} onValueChange={setQuotationStatusFilter}>
                  <SelectTrigger className="w-[200px] h-9">
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {uniqueQuotationStatuses.map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => quotationSort.toggleSort("label")}>Titre <quotationSort.SortIcon field="label" /></th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => quotationSort.toggleSort("customerName")}>Client <quotationSort.SortIcon field="customerName" /></th>
                      <th className="pb-3 font-medium text-muted-foreground">N° compte</th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => quotationSort.toggleSort("statusLabel")}>Statut <quotationSort.SortIcon field="statusLabel" /></th>
                      <th className="pb-3 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => quotationSort.toggleSort("gross_total")}>Montant HT <quotationSort.SortIcon field="gross_total" /></th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => quotationSort.toggleSort("date")}>Date <quotationSort.SortIcon field="date" /></th>
                      <th className="pb-3 font-medium text-muted-foreground">Période</th>
                      <th className="pb-3 font-medium text-muted-foreground">Commercial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationSort.sorted.map((q: any) => (
                      <tr key={q.quotationid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{q.label || "-"}</td>
                        <td className="py-3">{q.customerName || "-"}</td>
                        <td className="py-3 font-mono text-xs text-muted-foreground">{q.accountNumber || "-"}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs">{q.statusLabel}</span></td>
                        <td className="py-3 text-right font-medium">{formatCurrency(q.gross_total)}</td>
                        <td className="py-3 text-muted-foreground">{q.date ? new Date(q.date).toLocaleDateString("fr-FR") : "-"}</td>
                        <td className="py-3 text-muted-foreground text-xs">{q.period_start && q.period_end ? `${new Date(q.period_start).toLocaleDateString("fr-FR")} - ${new Date(q.period_end).toLocaleDateString("fr-FR")}` : "-"}</td>
                        <td className="py-3 text-muted-foreground text-xs">{q.assign_to_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredQuotations.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun devis correspondant</p>}
                {filteredQuotations.length > 0 && filteredQuotations.length !== data.quotations.length && (
                  <p className="text-xs text-muted-foreground mt-2">{filteredQuotations.length} sur {data.quotations.length} devis affichés</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── OPPORTUNITÉS ─── */}
        <TabsContent value="opportunities">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Opportunités (dédoublonnées) — Brut: {formatCurrency(data.opportunitiesRawTotal)} · Pondéré: {formatCurrency(data.opportunitiesWeightedTotal)}</CardTitle>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Filtrer par client..." value={opClientFilter} onChange={(e) => setOpClientFilter(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={opStageFilter} onValueChange={setOpStageFilter}>
                  <SelectTrigger className="w-[200px] h-9">
                    <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Toutes les étapes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les étapes</SelectItem>
                    {uniqueOpStages.map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => opSort.toggleSort("label")}>Libellé <opSort.SortIcon field="label" /></th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => opSort.toggleSort("customerName")}>Client <opSort.SortIcon field="customerName" /></th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => opSort.toggleSort("stageLabel")}>Étape <opSort.SortIcon field="stageLabel" /></th>
                      <th className="pb-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => opSort.toggleSort("typeLabel")}>Type <opSort.SortIcon field="typeLabel" /></th>
                      <th className="pb-3 font-medium text-muted-foreground text-right cursor-pointer select-none" onClick={() => opSort.toggleSort("amount")}>Montant <opSort.SortIcon field="amount" /></th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Probabilité</th>
                      <th className="pb-3 font-medium text-muted-foreground">Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opSort.sorted.map((op: any) => (
                      <tr key={op.opid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3">{op.label}</td>
                        <td className="py-3">{op.customerName || "-"}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">{op.stageLabel}</span></td>
                        <td className="py-3 text-xs text-muted-foreground">{op.typeLabel || "-"}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(op.amount)}</td>
                        <td className="py-3 text-right">{op.probability !== null ? `${op.probability}%` : "-"}</td>
                        <td className="py-3 text-muted-foreground">{op.assign_to_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOpportunities.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune opportunité correspondante</p>}
                {filteredOpportunities.length > 0 && filteredOpportunities.length !== data.opportunities.length && (
                  <p className="text-xs text-muted-foreground mt-2">{filteredOpportunities.length} sur {data.opportunities.length} opportunités affichées</p>
                )}
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
