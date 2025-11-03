import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, TrendingUp, Users, Wine, Target } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const PRESET_QUERIES = {
  userEngagement: `-- Engagement de usuarios con quiz
SELECT 
  p.location,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT qr.user_id) as users_with_quiz,
  ROUND(COUNT(DISTINCT qr.user_id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0) * 100, 2) as quiz_completion_rate,
  AVG(qr.potente) as avg_potente,
  AVG(qr.acidez) as avg_acidez,
  AVG(qr.dulce) as avg_dulce
FROM profiles p
LEFT JOIN quiz_results qr ON qr.user_id = p.id
WHERE p.location IS NOT NULL
GROUP BY p.location
ORDER BY total_users DESC
LIMIT 20;`,

  winePreferences: `-- Análisis de preferencias de vino por ubicación
SELECT 
  p.location,
  unnest(wp.wine_types) as wine_type,
  COUNT(*) as preference_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY p.location) * 100, 2) as percentage
FROM profiles p
JOIN wine_preferences wp ON wp.user_id = p.id
WHERE p.location IS NOT NULL AND wp.wine_types IS NOT NULL
GROUP BY p.location, wine_type
ORDER BY p.location, preference_count DESC;`,

  quizProfiles: `-- Distribución de perfiles Matchrim
SELECT 
  CASE 
    WHEN potente >= 7 AND tanico >= 7 THEN 'Potente y Tánico'
    WHEN acidez >= 7 AND afrutado >= 7 THEN 'Ácido y Afrutado'
    WHEN dulce >= 7 THEN 'Dulce'
    WHEN potente <= 3 AND acidez >= 7 THEN 'Ligero y Ácido'
    ELSE 'Equilibrado'
  END as profile_type,
  COUNT(*) as total_users,
  AVG(potente) as avg_potente,
  AVG(acidez) as avg_acidez,
  AVG(dulce) as avg_dulce,
  AVG(tanico) as avg_tanico,
  AVG(afrutado) as avg_afrutado
FROM quiz_results
GROUP BY profile_type
ORDER BY total_users DESC;`,

  userRegistration: `-- Análisis temporal de registros
SELECT 
  DATE_TRUNC('day', created_at) as registration_date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) as cumulative_users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY registration_date DESC;`,

  dietaryAnalysis: `-- Análisis de preferencias dietéticas
SELECT 
  p.location,
  unnest(dp.dietary_restrictions) as restriction,
  COUNT(*) as count
FROM profiles p
JOIN dietary_preferences dp ON dp.user_id = p.id
WHERE dp.dietary_restrictions IS NOT NULL
GROUP BY p.location, restriction
ORDER BY count DESC
LIMIT 30;`,

  crossAnalysis: `-- Análisis cruzado: Quiz vs Preferencias
SELECT 
  CASE 
    WHEN qr.potente >= 7 THEN 'Alto Potente'
    WHEN qr.potente >= 4 THEN 'Medio Potente'
    ELSE 'Bajo Potente'
  END as potencia_level,
  unnest(wp.wine_types) as wine_type,
  COUNT(*) as users,
  AVG(qr.acidez) as avg_acidez,
  AVG(qr.dulce) as avg_dulce
FROM quiz_results qr
JOIN wine_preferences wp ON wp.user_id = qr.user_id
WHERE wp.wine_types IS NOT NULL
GROUP BY potencia_level, wine_type
ORDER BY users DESC
LIMIT 25;`
};

export function AdminMetrics() {
  const [customQuery, setCustomQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const executeQuery = async (query: string, presetName?: string) => {
    setLoading(true);
    setActivePreset(presetName || null);
    
    try {
      toast.info("Las consultas personalizadas requieren configuración adicional. Usa los análisis predefinidos.");
      setQueryResult([]);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const executePresetQuery = async (queryKey: keyof typeof PRESET_QUERIES, name: string) => {
    const query = PRESET_QUERIES[queryKey];
    setCustomQuery(query);
    
    // Para queries predefinidas, usamos consultas directas ya que conocemos la estructura
    setLoading(true);
    setActivePreset(name);
    
    try {
      let result;
      
      switch(queryKey) {
        case 'userEngagement':
          const { data: profiles } = await supabase.from('profiles').select('id, location');
          const { data: quizResults } = await supabase.from('quiz_results').select('user_id, potente, acidez, dulce');
          
          // Procesar datos localmente
          const locationStats = new Map();
          profiles?.forEach(p => {
            if (!p.location) return;
            if (!locationStats.has(p.location)) {
              locationStats.set(p.location, { 
                total_users: 0, 
                users_with_quiz: new Set(),
                potente_sum: 0,
                acidez_sum: 0,
                dulce_sum: 0
              });
            }
            locationStats.get(p.location).total_users++;
          });
          
          quizResults?.forEach(qr => {
            const profile = profiles?.find(p => p.id === qr.user_id);
            if (profile?.location && locationStats.has(profile.location)) {
              const stats = locationStats.get(profile.location);
              stats.users_with_quiz.add(qr.user_id);
              stats.potente_sum += qr.potente;
              stats.acidez_sum += qr.acidez;
              stats.dulce_sum += qr.dulce;
            }
          });
          
          result = Array.from(locationStats.entries()).map(([location, stats]) => ({
            location,
            total_users: stats.total_users,
            users_with_quiz: stats.users_with_quiz.size,
            quiz_completion_rate: ((stats.users_with_quiz.size / stats.total_users) * 100).toFixed(2),
            avg_potente: stats.users_with_quiz.size > 0 ? (stats.potente_sum / stats.users_with_quiz.size).toFixed(2) : 0,
            avg_acidez: stats.users_with_quiz.size > 0 ? (stats.acidez_sum / stats.users_with_quiz.size).toFixed(2) : 0,
            avg_dulce: stats.users_with_quiz.size > 0 ? (stats.dulce_sum / stats.users_with_quiz.size).toFixed(2) : 0
          })).sort((a, b) => b.total_users - a.total_users).slice(0, 20);
          break;
          
        case 'quizProfiles':
          const { data: allQuizResults } = await supabase.from('quiz_results').select('*');
          
          const profileTypes = new Map();
          allQuizResults?.forEach(qr => {
            let type;
            if (qr.potente >= 7 && qr.tanico >= 7) type = 'Potente y Tánico';
            else if (qr.acidez >= 7 && qr.afrutado >= 7) type = 'Ácido y Afrutado';
            else if (qr.dulce >= 7) type = 'Dulce';
            else if (qr.potente <= 3 && qr.acidez >= 7) type = 'Ligero y Ácido';
            else type = 'Equilibrado';
            
            if (!profileTypes.has(type)) {
              profileTypes.set(type, {
                profile_type: type,
                total_users: 0,
                potente_sum: 0,
                acidez_sum: 0,
                dulce_sum: 0,
                tanico_sum: 0,
                afrutado_sum: 0
              });
            }
            
            const stats = profileTypes.get(type);
            stats.total_users++;
            stats.potente_sum += qr.potente;
            stats.acidez_sum += qr.acidez;
            stats.dulce_sum += qr.dulce;
            stats.tanico_sum += qr.tanico;
            stats.afrutado_sum += qr.afrutado;
          });
          
          result = Array.from(profileTypes.values()).map(stats => ({
            ...stats,
            avg_potente: (stats.potente_sum / stats.total_users).toFixed(2),
            avg_acidez: (stats.acidez_sum / stats.total_users).toFixed(2),
            avg_dulce: (stats.dulce_sum / stats.total_users).toFixed(2),
            avg_tanico: (stats.tanico_sum / stats.total_users).toFixed(2),
            avg_afrutado: (stats.afrutado_sum / stats.total_users).toFixed(2)
          })).sort((a, b) => b.total_users - a.total_users);
          break;
          
        default:
          toast.info("Esta consulta requiere ejecución SQL directa");
          setLoading(false);
          return;
      }
      
      setQueryResult(result);
      toast.success("Análisis completado");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Métricas Avanzadas y Consultas Cruzadas
          </CardTitle>
          <CardDescription>
            Analiza datos combinados de usuarios, preferencias y resultados de quiz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="presets" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Análisis Predefinidos</TabsTrigger>
              <TabsTrigger value="custom">Consulta Personalizada</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Button
                  variant={activePreset === "engagement" ? "default" : "outline"}
                  className="justify-start h-auto p-4 flex-col items-start"
                  onClick={() => executePresetQuery('userEngagement', 'engagement')}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">Engagement por Ubicación</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Tasa de completación de quiz por región
                  </span>
                </Button>

                <Button
                  variant={activePreset === "profiles" ? "default" : "outline"}
                  className="justify-start h-auto p-4 flex-col items-start"
                  onClick={() => executePresetQuery('quizProfiles', 'profiles')}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" />
                    <span className="font-semibold">Perfiles Matchrim</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Distribución de tipos de perfiles
                  </span>
                </Button>

                <Button
                  variant={activePreset === "preferences" ? "default" : "outline"}
                  className="justify-start h-auto p-4 flex-col items-start"
                  onClick={() => executePresetQuery('winePreferences', 'preferences')}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wine className="h-4 w-4" />
                    <span className="font-semibold">Preferencias de Vino</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Tipos de vino por ubicación
                  </span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Consulta SQL</label>
                <Textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="SELECT * FROM profiles LIMIT 10;"
                  className="font-mono text-sm min-h-[150px]"
                />
              </div>
              <Button
                onClick={() => executeQuery(customQuery)}
                disabled={!customQuery || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Ejecutar Consulta
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {queryResult && queryResult.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados ({queryResult.length} filas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(queryResult[0]).map((key) => (
                      <TableHead key={key} className="font-semibold">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryResult.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.values(row).map((value: any, cellIdx) => (
                        <TableCell key={cellIdx} className="font-mono text-xs">
                          {value === null ? (
                            <span className="text-muted-foreground">NULL</span>
                          ) : typeof value === 'object' ? (
                            JSON.stringify(value)
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {queryResult && queryResult.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            La consulta no devolvió resultados
          </CardContent>
        </Card>
      )}
    </div>
  );
}
