
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Wine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SensoryProfile {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

interface WineStyle {
  id: string;
  name: string;
  description: string | null;
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

const SensoryCalculator = () => {
  const [profile, setProfile] = useState<SensoryProfile>({
    potente: 2,
    acidez: 2,
    dulce: 1,
    tanico: 2,
    afrutado: 2
  });

  const [identifiedStyle, setIdentifiedStyle] = useState<WineStyle | null>(null);
  const [wineStyles, setWineStyles] = useState<WineStyle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWineStyles();
  }, []);

  const fetchWineStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Advertencia",
          description: "No hay estilos de vino en la base de datos",
          variant: "destructive"
        });
        return;
      }

      // Limpiar, extraer valores del prefijo y agrupar estilos por nombre base
      const extractFromName = (name: string) => {
        const match = name.match(/^(\d+);(\d+);(\d+);(\d+);(\d+);/);
        if (!match) return null;
        return {
          potente: parseInt(match[1]),
          acidez: parseInt(match[2]),
          dulce: parseInt(match[3]),
          tanico: parseInt(match[4]),
          afrutado: parseInt(match[5])
        } as SensoryProfile;
      };

      // Normalizamos todos los registros a una estructura común
      const items = data.map((style) => {
        const extracted = extractFromName(style.name);
        const values: SensoryProfile = extracted ?? {
          potente: style.potente,
          acidez: style.acidez,
          dulce: style.dulce,
          tanico: style.tanico,
          afrutado: style.afrutado,
        };
        const fromPrefix = Boolean(extracted);
        const cleanName = cleanStyleName(style.name);
        return { id: style.id, description: style.description, cleanName, fromPrefix, ...values };
      });

      // Agrupar y calcular un centro canónico por nombre
      const groups = new Map<string, { sum: SensoryProfile; count: number; countPrefix: number; description: string | null }>();
      items.forEach((it) => {
        if (!groups.has(it.cleanName)) {
          groups.set(it.cleanName, { sum: { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 }, count: 0, countPrefix: 0, description: it.description || null });
        }
        const g = groups.get(it.cleanName)!;
        g.sum.potente += it.potente;
        g.sum.acidez += it.acidez;
        g.sum.dulce += it.dulce;
        g.sum.tanico += it.tanico;
        g.sum.afrutado += it.afrutado;
        g.count += 1;
        if (it.fromPrefix) g.countPrefix += 1;
        if ((it.description?.length || 0) > (g.description?.length || 0)) g.description = it.description;
      });

      const uniqueStyles: WineStyle[] = [];
      groups.forEach((g, name) => {
        const denom = g.countPrefix > 0 ? g.countPrefix : g.count;
        // En caso de contar con prefijos, usamos solo esos para el promedio
        const sourceItems = g.countPrefix > 0 ? items.filter(i => i.cleanName === name && i.fromPrefix) : items.filter(i => i.cleanName === name);
        const avg = sourceItems.reduce((acc, i) => ({
          potente: acc.potente + i.potente,
          acidez: acc.acidez + i.acidez,
          dulce: acc.dulce + i.dulce,
          tanico: acc.tanico + i.tanico,
          afrutado: acc.afrutado + i.afrutado,
        }), { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 });
        const center: SensoryProfile = {
          potente: Math.round(avg.potente / denom),
          acidez: Math.round(avg.acidez / denom),
          dulce: Math.round(avg.dulce / denom),
          tanico: Math.round(avg.tanico / denom),
          afrutado: Math.round(avg.afrutado / denom),
        };
        uniqueStyles.push({
          id: name,
          name,
          description: g.description,
          ...center,
        });
      });

      // Orden estable por nombre para depurar
      uniqueStyles.sort((a, b) => a.name.localeCompare(b.name));
      console.debug('Perfil usuario:', profile);
      console.debug('Estilos (centros canónicos):', uniqueStyles.map(s => ({ n: s.name, p: [s.potente, s.acidez, s.dulce, s.tanico, s.afrutado] })));

      setWineStyles(uniqueStyles);
    } catch (error: any) {
      console.error('Error fetching wine styles:', error);
      toast({
        title: "Error",
        description: "Error al cargar los estilos de vino",
        variant: "destructive"
      });
    }
  };

  const updateProfile = (attribute: keyof SensoryProfile, value: number[]) => {
    setProfile(prev => ({
      ...prev,
      [attribute]: value[0]
    }));
  };

  const calculateStyle = async () => {
    setIsLoading(true);

    try {
      // Obtener todos los estilos directamente de la BD
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "No se han cargado los estilos de vino",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Extraer valores del prefijo si existen
      const extractFromName = (name: string) => {
        const match = name.match(/^(\d+);(\d+);(\d+);(\d+);(\d+);/);
        if (!match) return null;
        return {
          potente: parseInt(match[1]),
          acidez: parseInt(match[2]),
          dulce: parseInt(match[3]),
          tanico: parseInt(match[4]),
          afrutado: parseInt(match[5])
        };
      };

      // Calcular distancia para cada registro usando SIEMPRE los valores del prefijo
      const distances = data.map(style => {
        const extracted = extractFromName(style.name);
        
        // Si no hay prefijo, saltar este registro
        if (!extracted) {
          return null;
        }

        const distance = Math.sqrt(
          Math.pow(profile.potente - extracted.potente, 2) +
          Math.pow(profile.acidez - extracted.acidez, 2) +
          Math.pow(profile.dulce - extracted.dulce, 2) +
          Math.pow(profile.tanico - extracted.tanico, 2) +
          Math.pow(profile.afrutado - extracted.afrutado, 2)
        );

        return {
          style: {
            ...style,
            name: cleanStyleName(style.name),
            ...extracted
          },
          distance
        };
      }).filter(Boolean) as Array<{ style: WineStyle; distance: number }>;

      // Encontrar el registro con la menor distancia
      const closest = distances.reduce((prev, current) => 
        prev.distance < current.distance ? prev : current
      );

      console.log('Perfil buscado:', profile);
      console.log('Estilo más cercano:', closest.style.name, 'Distancia:', closest.distance);
      console.log('Valores del estilo:', {
        potente: closest.style.potente,
        acidez: closest.style.acidez,
        dulce: closest.style.dulce,
        tanico: closest.style.tanico,
        afrutado: closest.style.afrutado
      });

      setIdentifiedStyle(closest.style);
    } catch (error: any) {
      console.error('Error calculating style:', error);
      toast({
        title: "Error",
        description: "Error al calcular el estilo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cleanStyleName = (name: string) => {
    // Quitar prefijos de formato "0;0;0;0;0;" y números entre paréntesis
    return name
      .replace(/^\d+;\d+;\d+;\d+;\d+;/, '') // Quitar prefijo numérico
      .replace(/\s*\(\d+\)\s*$/, '') // Quitar números entre paréntesis al final
      .trim();
  };

  const getAttributeDescription = (attribute: keyof SensoryProfile, value: number) => {
    const descriptions: Record<keyof SensoryProfile, Record<number, string>> = {
      potente: {
        0: "Sin intensidad",
        1: "Muy ligero",
        2: "Ligero", 
        3: "Moderado",
        4: "Intenso",
        5: "Muy intenso"
      },
      acidez: {
        0: "Sin acidez",
        1: "Muy baja",
        2: "Baja",
        3: "Equilibrada", 
        4: "Alta",
        5: "Muy alta"
      },
      dulce: {
        0: "Muy seco",
        1: "Seco",
        2: "Ligeramente dulce",
        3: "Semidulce",
        4: "Dulce", 
        5: "Muy dulce"
      },
      tanico: {
        0: "Sin taninos",
        1: "Taninos mínimos",
        2: "Taninos suaves",
        3: "Taninos equilibrados",
        4: "Taninos marcados",
        5: "Taninos intensos"
      },
      afrutado: {
        0: "Sin fruta",
        1: "Poco afrutado",
        2: "Ligeramente afrutado", 
        3: "Moderadamente afrutado",
        4: "Muy afrutado",
        5: "Intensamente afrutado"
      }
    };
    
    return descriptions[attribute][value] || "No definido";
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Perfil Sensorial
          </CardTitle>
          <CardDescription>
            Ajusta los valores de los 5 atributos sensoriales para obtener tu perfil característico de estilo del vino y la descripción pedagógica del estilo encontrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Panel de controles */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-red-800">Perfil Sensorial</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium">Potente</label>
                    <span className="text-sm text-gray-600">{profile.potente}</span>
                  </div>
                  <Slider
                    value={[profile.potente]}
                    onValueChange={(value) => updateProfile('potente', value)}
                    max={5}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getAttributeDescription('potente', profile.potente)}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium">Acidez</label>
                    <span className="text-sm text-gray-600">{profile.acidez}</span>
                  </div>
                  <Slider
                    value={[profile.acidez]}
                    onValueChange={(value) => updateProfile('acidez', value)}
                    max={5}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getAttributeDescription('acidez', profile.acidez)}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium">Dulzor</label>
                    <span className="text-sm text-gray-600">{profile.dulce}</span>
                  </div>
                  <Slider
                    value={[profile.dulce]}
                    onValueChange={(value) => updateProfile('dulce', value)}
                    max={5}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getAttributeDescription('dulce', profile.dulce)}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium">Tánico</label>
                    <span className="text-sm text-gray-600">{profile.tanico}</span>
                  </div>
                  <Slider
                    value={[profile.tanico]}
                    onValueChange={(value) => updateProfile('tanico', value)}
                    max={5}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getAttributeDescription('tanico', profile.tanico)}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium">Afrutado</label>
                    <span className="text-sm text-gray-600">{profile.afrutado}</span>
                  </div>
                  <Slider
                    value={[profile.afrutado]}
                    onValueChange={(value) => updateProfile('afrutado', value)}
                    max={5}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getAttributeDescription('afrutado', profile.afrutado)}
                  </p>
                </div>
              </div>

              <Button 
                onClick={calculateStyle}
                className="w-full bg-red-700 hover:bg-red-800"
                disabled={isLoading}
              >
                <Wine className="h-4 w-4 mr-2" />
                {isLoading ? 'Calculando...' : 'Calcular Estilo'}
              </Button>
            </div>

            {/* Panel de resultados */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-red-800">Leyenda de Atributos</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Potente (0-5)</h4>
                  <p className="text-gray-600">Intensidad general del vino en boca</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Acidez (0-5)</h4>
                  <p className="text-gray-600">Frescura y vivacidad del vino</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Dulzor (0-5)</h4>
                  <p className="text-gray-600">Nivel de azúcar residual percibido</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Tánico (0-5)</h4>
                  <p className="text-gray-600">Estructura y astringencia</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Afrutado (0-5)</h4>
                  <p className="text-gray-600">Presencia e intensidad frutal</p>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-red-800">Ventajas del Sistema</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Facilita la comunicación enológica</li>
                  <li>• Codificación universal de 1-16 clasificaciones</li>
                  <li>• Fácil memorización de números únicos</li>
                  <li>• Búsquedas muy rápidas dentro del portafolio</li>
                  <li>• Control del perfil de preferencias</li>
                </ul>
              </div>

              {identifiedStyle && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-2 text-green-800">Estilo Identificado</h4>
                  <Badge variant="secondary" className="mb-3">
                    🍷 {cleanStyleName(identifiedStyle.name)}
                  </Badge>
                  <div className="space-y-2">
                    <p className="text-sm text-green-700 font-medium">
                      Basado en tu perfil sensorial, este es el estilo de vino que mejor se adapta a tus preferencias.
                    </p>
                    {identifiedStyle.description && (
                      <p className="text-sm text-green-600">
                        {identifiedStyle.description}
                      </p>
                    )}
                    <div className="text-xs text-green-700 mt-2">
                      <strong>Tu perfil:</strong> Potente: {profile.potente}, Acidez: {profile.acidez}, Dulzor: {profile.dulce}, Tánico: {profile.tanico}, Afrutado: {profile.afrutado}
                    </div>
                    <div className="text-xs text-green-600">
                      <strong>Perfil del estilo:</strong> Potente: {identifiedStyle.potente}, Acidez: {identifiedStyle.acidez}, Dulzor: {identifiedStyle.dulce}, Tánico: {identifiedStyle.tanico}, Afrutado: {identifiedStyle.afrutado}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SensoryCalculator;
