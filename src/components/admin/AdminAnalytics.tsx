import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171"];

export function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [wineTypeData, setWineTypeData] = useState<any[]>([]);
  const [quizProfileData, setQuizProfileData] = useState<any[]>([]);
  const [priceRangeData, setPriceRangeData] = useState<any[]>([]);
  const [eventTrendData, setEventTrendData] = useState<any[]>([]);



  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Analizar tipos de vino preferidos
      const { data: winePrefs } = await supabase
        .from("wine_preferences")
        .select("wine_types");

      const wineTypeCounts: Record<string, number> = {};
      winePrefs?.forEach((pref) => {
        pref.wine_types?.forEach((type: string) => {
          wineTypeCounts[type] = (wineTypeCounts[type] || 0) + 1;
        });
      });

      const wineTypeChartData = Object.entries(wineTypeCounts).map(([name, value]) => ({
        name,
        value,
      }));
      setWineTypeData(wineTypeChartData);

      // Analizar rangos de precio
      const { data: pricePrefs } = await supabase
        .from("wine_preferences")
        .select("price_range");

      const priceRangeCounts: Record<string, number> = {};
      pricePrefs?.forEach((pref) => {
        if (pref.price_range) {
          priceRangeCounts[pref.price_range] = (priceRangeCounts[pref.price_range] || 0) + 1;
        }
      });

      const priceRangeChartData = Object.entries(priceRangeCounts).map(([name, value]) => ({
        name,
        usuarios: value,
      }));
      setPriceRangeData(priceRangeChartData);

      // Analizar perfiles de quiz (distribución de características)
      const { data: quizResults } = await supabase
        .from("quiz_results")
        .select("potente, acidez, dulce, tanico, afrutado");

      if (quizResults && quizResults.length > 0) {
        const avgProfile = {
          potente: Math.round(quizResults.reduce((sum, r) => sum + r.potente, 0) / quizResults.length),
          acidez: Math.round(quizResults.reduce((sum, r) => sum + r.acidez, 0) / quizResults.length),
          dulce: Math.round(quizResults.reduce((sum, r) => sum + r.dulce, 0) / quizResults.length),
          tanico: Math.round(quizResults.reduce((sum, r) => sum + r.tanico, 0) / quizResults.length),
          afrutado: Math.round(quizResults.reduce((sum, r) => sum + r.afrutado, 0) / quizResults.length),
        };

        const profileChartData = [
          { caracteristica: "Potente", valor: avgProfile.potente },
          { caracteristica: "Acidez", valor: avgProfile.acidez },
          { caracteristica: "Dulce", valor: avgProfile.dulce },
          { caracteristica: "Tánico", valor: avgProfile.tanico },
          { caracteristica: "Afrutado", valor: avgProfile.afrutado },
        ];
        setQuizProfileData(profileChartData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Perfil de Gusto Promedio</CardTitle>
          <CardDescription>
            Características promedio de los perfiles de gusto de usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quizProfileData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="caracteristica" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar dataKey="valor" fill="#7f1d1d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Vino Preferidos</CardTitle>
          <CardDescription>
            Distribución de preferencias por tipo de vino
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={wineTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {wineTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rango de Precio Preferido</CardTitle>
          <CardDescription>
            Usuarios por rango de precio preferido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priceRangeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="usuarios" fill="#991b1b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
