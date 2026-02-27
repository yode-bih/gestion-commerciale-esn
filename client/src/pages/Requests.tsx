import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Clock, UserCheck, UserX, Shield, ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";

function RequestsContent() {
  const { user: currentUser } = useAuth();
  const { data: requests, isLoading: loadingRequests } = trpc.admin.getAllRequests.useQuery();
  const { data: allUsers, isLoading: loadingUsers } = trpc.admin.getAllUsers.useQuery();
  const utils = trpc.useUtils();

  const approve = trpc.admin.approveRequest.useMutation({
    onSuccess: () => { toast.success("Demande approuvée"); utils.admin.getAllRequests.invalidate(); utils.admin.getAllUsers.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const reject = trpc.admin.rejectRequest.useMutation({
    onSuccess: () => { toast.success("Demande rejetée"); utils.admin.getAllRequests.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const toggleApproval = trpc.admin.toggleUserApproval.useMutation({
    onSuccess: () => { toast.success("Accès mis à jour"); utils.admin.getAllUsers.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("Rôle mis à jour"); utils.admin.getAllUsers.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  if (loadingRequests || loadingUsers) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = (requests || []).filter((r: any) => r.status === "pending");
  const processed = (requests || []).filter((r: any) => r.status !== "pending");
  const users = allUsers || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gestion des accès</h1>
        <p className="text-muted-foreground mt-1">Gérez les utilisateurs et les demandes d'accès à l'application</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="users" className="text-sm">
            <Users className="h-4 w-4 mr-2" />
            Utilisateurs ({users.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-sm">
            <Clock className="h-4 w-4 mr-2" />
            Demandes ({pending.length} en attente)
          </TabsTrigger>
        </TabsList>

        {/* Onglet Utilisateurs */}
        <TabsContent value="users">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Tous les utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Nom</th>
                        <th className="pb-3 font-medium text-muted-foreground">Email</th>
                        <th className="pb-3 font-medium text-muted-foreground">Rôle</th>
                        <th className="pb-3 font-medium text-muted-foreground">Accès</th>
                        <th className="pb-3 font-medium text-muted-foreground">Dernière connexion</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 font-medium">{u.name || "—"}</td>
                            <td className="py-3 text-muted-foreground">{u.email}</td>
                            <td className="py-3">
                              {u.role === "admin" ? (
                                <Badge variant="outline" className="border-violet-200 text-violet-700 bg-violet-50">
                                  <Shield className="h-3 w-3 mr-1" /> Admin
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">
                                  Utilisateur
                                </Badge>
                              )}
                            </td>
                            <td className="py-3">
                              {u.approved ? (
                                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                                  <UserCheck className="h-3 w-3 mr-1" /> Approuvé
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                                  <UserX className="h-3 w-3 mr-1" /> Bloqué
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 text-muted-foreground text-xs">
                              {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Jamais"}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex gap-1 justify-end">
                                {/* Toggle accès */}
                                {u.approved ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                                    onClick={() => toggleApproval.mutate({ userId: u.id, approved: false })}
                                    disabled={isSelf || toggleApproval.isPending}
                                    title={isSelf ? "Vous ne pouvez pas révoquer votre propre accès" : "Révoquer l'accès"}
                                  >
                                    <ShieldOff className="h-3 w-3 mr-1" /> Révoquer
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                                    onClick={() => toggleApproval.mutate({ userId: u.id, approved: true })}
                                    disabled={toggleApproval.isPending}
                                  >
                                    <Check className="h-3 w-3 mr-1" /> Approuver
                                  </Button>
                                )}
                                {/* Toggle rôle */}
                                {u.role === "admin" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => updateRole.mutate({ userId: u.id, role: "user" })}
                                    disabled={isSelf || updateRole.isPending}
                                    title={isSelf ? "Vous ne pouvez pas retirer votre propre rôle admin" : "Retirer le rôle admin"}
                                  >
                                    Retirer admin
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                                    onClick={() => updateRole.mutate({ userId: u.id, role: "admin" })}
                                    disabled={updateRole.isPending}
                                  >
                                    <Shield className="h-3 w-3 mr-1" /> Promouvoir admin
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Demandes */}
        <TabsContent value="requests" className="space-y-6">
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
              <CardTitle className="text-base">Historique des demandes</CardTitle>
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
        </TabsContent>
      </Tabs>
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
