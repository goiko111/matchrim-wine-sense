
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Wine, Palette, Users } from 'lucide-react';

interface Stats {
  matchrimProfiles: number;
  wines: number;
  wineStyles: number;
}

const DataStats = () => {
  const [stats, setStats] = useState<Stats>({ matchrimProfiles: 0, wines: 0, wineStyles: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Obtener conteo de perfiles Matchrim
        const { count: matchrimCount } = await supabase
          .from('matchrim_profiles')
          .select('*', { count: 'exact', head: true });

        // Obtener conteo de vinos
        const { count: winesCount } = await supabase
          .from('wines')
          .select('*', { count: 'exact', head: true });

        // Obtener conteo de estilos de vino
        const { count: stylesCount } = await supabase
          .from('wine_styles')
          .select('*', { count: 'exact', head: true });

        setStats({
          matchrimProfiles: matchrimCount || 0,
          wines: winesCount || 0,
          wineStyles: stylesCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Perfiles Matchrim</CardTitle>
          <Users className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{stats.matchrimProfiles}</div>
          <CardDescription>Perfiles de usuario para maridajes</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vinos</CardTitle>
          <Wine className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700">{stats.wines}</div>
          <CardDescription>Vinos en la base de datos</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estilos de Vino</CardTitle>
          <Palette className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700">{stats.wineStyles}</div>
          <CardDescription>Clasificaciones de estilos</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataStats;
