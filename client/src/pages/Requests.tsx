import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Clock, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

function RequestsContent() {
  const { data: requests, isLoading } = trpc.admin.getAllRequests.useQuery();
  const utils = trpc.useUtils();

  const approve = trpc.admin.approveRequest.useMutation({
    onSuccess: () => { toast.success("Demande approuvée"); utils.admin.getAllRequests.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const reject = trpc.admin.rejectRequest.useMutation({
    onSuccess: () => { toast.success("Demande rejetée"); utils.admin.getAllRequests.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = (requests || []).filter((r: any) => r.status === "pending");
  const processed = (requests || []).filter((r: any) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demandes de compte</h1>
        <p className="text-muted-foreground mt-1">Gérez les demandes d'accès à l'application</p>
      </div>

      {/* Pending */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            En attente ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune demande en attente</p>
          ) : (
            <div className="space-y-3">
              {pending.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approve.mutate({ requestId: r.id })}
                      disabled={approve.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => reject.mutate({ requestId: r.id })}
                      disabled={reject.isPending}
                    >
                      <X className="h-4 w-4 mr-1" /> Rejeter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {processed.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun historique</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Nom</th>
                    <th className="pb-3 font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 font-medium text-muted-foreground">Statut</th>
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-3">{r.name}</td>
                      <td className="py-3 text-muted-foreground">{r.email}</td>
                      <td className="py-3">
                        {r.status === "approved" ? (
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                            <UserCheck className="h-3 w-3 mr-1" /> Approuvé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                            <UserX className="h-3 w-3 mr-1" /> Rejeté
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Requests() {
  return (
    <DashboardLayout>
      <RequestsContent />
    </DashboardLayout>
  );
}
