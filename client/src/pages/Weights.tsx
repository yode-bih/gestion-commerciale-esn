import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function formatPercent(value: string | number): string {
  return `${(parseFloat(String(value)) * 100).toFixed(0)}%`;
}

function WeightsContent() {
  const { data: qWeights, isLoading: qLoading } = trpc.admin.getQuotationWeights.useQuery();
  const { data: oWeights, isLoading: oLoading } = trpc.admin.getOpportunityWeights.useQuery();
  const utils = trpc.useUtils();

  const upsertQ = trpc.admin.upsertQuotationWeight.useMutation({
    onSuccess: () => { toast.success("Pondération devis mise à jour"); utils.admin.getQuotationWeights.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const upsertO = trpc.admin.upsertOpportunityWeight.useMutation({
    onSuccess: () => { toast.success("Pondération opportunité mise à jour"); utils.admin.getOpportunityWeights.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const [newQStatus, setNewQStatus] = useState({ statusId: "", statusLabel: "", weight: "0.5", description: "" });
  const [newOStatus, setNewOStatus] = useState({ statusId: "", statusLabel: "", weight: "0.3", description: "" });
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [oDialogOpen, setODialogOpen] = useState(false);

  if (qLoading || oLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pondérations</h1>
        <p className="text-muted-foreground mt-1">Configurez les coefficients de pondération par statut</p>
      </div>

      {/* Quotation weights */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Pondération des devis</CardTitle>
            <CardDescription>Coefficient appliqué au montant HT selon le statut du devis</CardDescription>
          </div>
          <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter une pondération devis</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ID Statut (Nicoka)</Label>
                  <Input value={newQStatus.statusId} onChange={(e) => setNewQStatus(s => ({ ...s, statusId: e.target.value }))} placeholder="ex: 1, 2, 3..." />
                </div>
                <div className="space-y-2">
                  <Label>Libellé</Label>
                  <Input value={newQStatus.statusLabel} onChange={(e) => setNewQStatus(s => ({ ...s, statusLabel: e.target.value }))} placeholder="ex: En attente, Accepté..." />
                </div>
                <div className="space-y-2">
                  <Label>Pondération (0 à 1)</Label>
                  <Input type="number" min="0" max="1" step="0.05" value={newQStatus.weight} onChange={(e) => setNewQStatus(s => ({ ...s, weight: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Input value={newQStatus.description} onChange={(e) => setNewQStatus(s => ({ ...s, description: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => {
                  upsertQ.mutate({
                    statusId: newQStatus.statusId,
                    statusLabel: newQStatus.statusLabel,
                    weight: parseFloat(newQStatus.weight),
                    description: newQStatus.description || undefined,
                  });
                  setQDialogOpen(false);
                  setNewQStatus({ statusId: "", statusLabel: "", weight: "0.5", description: "" });
                }}>
                  <Save className="h-4 w-4 mr-2" />Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">ID</th>
                  <th className="pb-3 font-medium text-muted-foreground">Libellé</th>
                  <th className="pb-3 font-medium text-muted-foreground">Pondération</th>
                  <th className="pb-3 font-medium text-muted-foreground">Description</th>
                  <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(qWeights || []).map((w: any) => (
                  <WeightRow key={w.statusId} weight={w} onSave={(weight) => upsertQ.mutate({ statusId: w.statusId, statusLabel: w.statusLabel, weight, description: w.description })} />
                ))}
              </tbody>
            </table>
            {(!qWeights || qWeights.length === 0) && <p className="text-center text-muted-foreground py-8">Aucune pondération configurée. Ajoutez-en une pour commencer.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Opportunity weights */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Pondération des opportunités</CardTitle>
            <CardDescription>Coefficient appliqué au montant selon l'étape de l'opportunité</CardDescription>
          </div>
          <Dialog open={oDialogOpen} onOpenChange={setODialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter une pondération opportunité</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ID Étape (Nicoka)</Label>
                  <Input value={newOStatus.statusId} onChange={(e) => setNewOStatus(s => ({ ...s, statusId: e.target.value }))} placeholder="ex: 1, 2, 3..." />
                </div>
                <div className="space-y-2">
                  <Label>Libellé</Label>
                  <Input value={newOStatus.statusLabel} onChange={(e) => setNewOStatus(s => ({ ...s, statusLabel: e.target.value }))} placeholder="ex: Prospection, Qualification..." />
                </div>
                <div className="space-y-2">
                  <Label>Pondération (0 à 1)</Label>
                  <Input type="number" min="0" max="1" step="0.05" value={newOStatus.weight} onChange={(e) => setNewOStatus(s => ({ ...s, weight: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Input value={newOStatus.description} onChange={(e) => setNewOStatus(s => ({ ...s, description: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => {
                  upsertO.mutate({
                    statusId: newOStatus.statusId,
                    statusLabel: newOStatus.statusLabel,
                    weight: parseFloat(newOStatus.weight),
                    description: newOStatus.description || undefined,
                  });
                  setODialogOpen(false);
                  setNewOStatus({ statusId: "", statusLabel: "", weight: "0.3", description: "" });
                }}>
                  <Save className="h-4 w-4 mr-2" />Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">ID</th>
                  <th className="pb-3 font-medium text-muted-foreground">Libellé</th>
                  <th className="pb-3 font-medium text-muted-foreground">Pondération</th>
                  <th className="pb-3 font-medium text-muted-foreground">Description</th>
                  <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(oWeights || []).map((w: any) => (
                  <WeightRow key={w.statusId} weight={w} onSave={(weight) => upsertO.mutate({ statusId: w.statusId, statusLabel: w.statusLabel, weight, description: w.description })} />
                ))}
              </tbody>
            </table>
            {(!oWeights || oWeights.length === 0) && <p className="text-center text-muted-foreground py-8">Aucune pondération configurée. Ajoutez-en une pour commencer.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeightRow({ weight, onSave }: { weight: any; onSave: (w: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(parseFloat(String(weight.weight)) * 100));

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 font-mono text-xs">{weight.statusId}</td>
      <td className="py-3">{weight.statusLabel}</td>
      <td className="py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-20 h-8"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { onSave(parseFloat(value) / 100); setEditing(false); }}>
              <Save className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            {formatPercent(weight.weight)}
          </button>
        )}
      </td>
      <td className="py-3 text-muted-foreground text-sm">{weight.description || "-"}</td>
      <td className="py-3">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
      </td>
    </tr>
  );
}

export default function Weights() {
  return (
    <DashboardLayout>
      <WeightsContent />
    </DashboardLayout>
  );
}
