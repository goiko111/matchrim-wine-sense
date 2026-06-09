import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminData } from "@/components/admin/AdminData";
import { AdminMetrics } from "@/components/admin/AdminMetrics";
import { AdminRestaurantDemand } from "@/components/admin/AdminRestaurantDemand";
import { AdminAccountDeletionRequests } from "@/components/admin/AdminAccountDeletionRequests";

export default function Admin() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando permisos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Panel de Administración
          </h1>
          <p className="text-muted-foreground">
            Gestión completa de usuarios y análisis de la plataforma Winerim
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 items-stretch gap-1 md:grid-cols-4 lg:w-auto lg:inline-grid lg:grid-cols-7">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Usuarios</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analíticas</TabsTrigger>
            <TabsTrigger value="demand" className="text-xs sm:text-sm">Demanda</TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs sm:text-sm">Privacidad</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs sm:text-sm">Métricas</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm">Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="demand" className="space-y-6">
            <AdminRestaurantDemand />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <AdminAccountDeletionRequests />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <AdminMetrics />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <AdminData />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
