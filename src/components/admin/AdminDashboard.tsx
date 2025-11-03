import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wine, Award, TrendingUp, UserCheck, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalUsers: number;
  totalWines: number;
  totalQuizResults: number;
  totalWinePreferences: number;
  newUsersLastWeek: number;
  newUsersLastMonth: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const [
        { count: totalUsers },
        { count: totalWines },
        { count: totalQuizResults },
        { count: totalWinePreferences },
        { count: newUsersLastWeek },
        { count: newUsersLastMonth },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("wines").select("*", { count: "exact", head: true }),
        supabase.from("quiz_results").select("*", { count: "exact", head: true }),
        supabase.from("wine_preferences").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", oneMonthAgo.toISOString()),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalWines: totalWines || 0,
        totalQuizResults: totalQuizResults || 0,
        totalWinePreferences: totalWinePreferences || 0,
        newUsersLastWeek: newUsersLastWeek || 0,
        newUsersLastMonth: newUsersLastMonth || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Usuarios",
      value: stats?.totalUsers || 0,
      description: "Usuarios registrados en la plataforma",
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Nuevos (7 días)",
      value: stats?.newUsersLastWeek || 0,
      description: "Usuarios registrados esta semana",
      icon: UserCheck,
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Nuevos (30 días)",
      value: stats?.newUsersLastMonth || 0,
      description: "Usuarios registrados este mes",
      icon: Calendar,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Total Vinos",
      value: stats?.totalWines || 0,
      description: "Vinos en la base de datos",
      icon: Wine,
      gradient: "from-red-500 to-red-600",
    },
    {
      title: "Quiz Completados",
      value: stats?.totalQuizResults || 0,
      description: "Perfiles de gusto creados",
      icon: Award,
      gradient: "from-amber-500 to-amber-600",
    },
    {
      title: "Preferencias de Vino",
      value: stats?.totalWinePreferences || 0,
      description: "Usuarios con preferencias guardadas",
      icon: TrendingUp,
      gradient: "from-indigo-500 to-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card key={index} className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">
                  {stat.title}
                </CardDescription>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Actividad</CardTitle>
          <CardDescription>
            Métricas clave de la plataforma Winerim
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="text-sm font-medium">Tasa de Completación de Quiz</p>
                <p className="text-xs text-muted-foreground">
                  Usuarios que completaron el perfil de gusto
                </p>
              </div>
              <div className="text-2xl font-bold">
                {stats?.totalUsers && stats.totalUsers > 0
                  ? Math.round((stats.totalQuizResults / stats.totalUsers) * 100)
                  : 0}%
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="text-sm font-medium">Usuarios con Preferencias</p>
                <p className="text-xs text-muted-foreground">
                  Usuarios que guardaron preferencias de vino
                </p>
              </div>
              <div className="text-2xl font-bold">
                {stats?.totalUsers && stats.totalUsers > 0
                  ? Math.round((stats.totalWinePreferences / stats.totalUsers) * 100)
                  : 0}%
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="text-sm font-medium">Crecimiento Semanal</p>
                <p className="text-xs text-muted-foreground">
                  Nuevos usuarios en los últimos 7 días
                </p>
              </div>
              <div className="text-2xl font-bold text-green-600">
                +{stats?.newUsersLastWeek || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
