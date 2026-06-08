
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Wine, Palette, Users, TrendingUp, Database, Calendar } from 'lucide-react';
import { DIAGNOSTIC_STYLE } from '@/lib/winerimClassifier';

interface DataCounts {
  wines: number;
  wineStyles: number;
  matchrimProfiles: number;
  totalClassifications: number;
}

interface WineStyleStats {
  name: string;
  count: number;
}

interface RecentActivity {
  lastWineAdded: string | null;
  lastStyleAdded: string | null;
  lastProfileAdded: string | null;
}

const DataStats = () => {
  const [stats, setStats] = useState<DataCounts>({
    wines: 0,
    wineStyles: 0,
    matchrimProfiles: 0,
    totalClassifications: 0
  });
  const [wineStyleStats, setWineStyleStats] = useState<WineStyleStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    lastWineAdded: null,
    lastStyleAdded: null,
    lastProfileAdded: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch counts from all tables
        const [winesResult, stylesResult, profilesResult, classificationsResult] = await Promise.all([
          supabase.from('wines').select('id', { count: 'exact' }),
          supabase.from('wine_styles').select('id', { count: 'exact' }),
          supabase.from('matchrim_profiles').select('id', { count: 'exact' }),
          supabase.from('classification_history').select('id', { count: 'exact' })
        ]);

        // Fetch wine styles distribution
        const { data: winesWithStyles } = await supabase
          .from('wines')
          .select('estilo')
          .order('estilo');

        // Count wines by style
        const styleDistribution: { [key: string]: number } = {};
        winesWithStyles?.forEach(wine => {
          if (wine.estilo === DIAGNOSTIC_STYLE) return;
          styleDistribution[wine.estilo] = (styleDistribution[wine.estilo] || 0) + 1;
        });

        const sortedStyles = Object.entries(styleDistribution)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 styles

        // Fetch recent activity
        const [lastWine, lastStyle, lastProfile] = await Promise.all([
          supabase.from('wines').select('created_at').order('created_at', { ascending: false }).limit(1),
          supabase.from('wine_styles').select('created_at').order('created_at', { ascending: false }).limit(1),
          supabase.from('matchrim_profiles').select('created_at').order('created_at', { ascending: false }).limit(1)
        ]);

        setStats({
          wines: winesResult.count || 0,
          wineStyles: stylesResult.count || 0,
          matchrimProfiles: profilesResult.count || 0,
          totalClassifications: classificationsResult.count || 0
        });

        setWineStyleStats(sortedStyles);
        setRecentActivity({
          lastWineAdded: lastWine.data?.[0]?.created_at || null,
          lastStyleAdded: lastStyle.data?.[0]?.created_at || null,
          lastProfileAdded: lastProfile.data?.[0]?.created_at || null
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statsItems = [
    {
      title: 'Vinos Totales',
      value: stats.wines,
      icon: Wine,
      description: 'Vinos importados en la base de datos',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Estilos de Vino',
      value: stats.wineStyles,
      icon: Palette,
      description: 'Estilos únicos disponibles',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Perfiles Matchrim',
      value: stats.matchrimProfiles,
      icon: Users,
      description: 'Perfiles de usuario creados',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      title: 'Clasificaciones',
      value: stats.totalClassifications,
      icon: TrendingUp,
      description: 'Total de clasificaciones realizadas',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <Card key={index} className={`hover:shadow-lg transition-shadow ${item.bgColor} border-0`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {item.title}
                </CardTitle>
                <IconComponent className={`h-5 w-5 ${item.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${item.color}`}>
                  {item.value.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Wine Styles */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Estilos Más Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wineStyleStats.length > 0 ? (
              <div className="space-y-3">
                {wineStyleStats.map((style, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{style.name}</span>
                    <span className="text-sm font-bold text-blue-600">{style.count} vinos</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay datos de distribución disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Último vino:</span>
                <span className="text-sm font-medium">{formatDate(recentActivity.lastWineAdded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Último estilo:</span>
                <span className="text-sm font-medium">{formatDate(recentActivity.lastStyleAdded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Último perfil:</span>
                <span className="text-sm font-medium">{formatDate(recentActivity.lastProfileAdded)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataStats;
