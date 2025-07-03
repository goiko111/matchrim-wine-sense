
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Droplet, Diamond, Square, Circle, Star, Check, Plus, ArrowUp, ArrowDown } from 'lucide-react';

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

const WineStylesGrid = () => {
  const [styles, setStyles] = useState<WineStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Los 16 estilos Winerim predefinidos en el orden específico
  const winerimStyles = [
    'Elegante', 'Potente', 'Delicado', 'Fresco',
    'Goloso', 'Mineral', 'Frutal', 'Especiado',
    'Aromático', 'Estructurado', 'Sedoso', 'Vibrante',
    'Opulento', 'Austero', 'Expresivo', 'Equilibrado'
  ];

  useEffect(() => {
    fetchWinerimStyles();
  }, []);

  const fetchWinerimStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*')
        .in('name', winerimStyles);

      if (error) throw error;

      // Ordenar los estilos según el orden predefinido de winerimStyles
      const sortedStyles = winerimStyles.map(styleName => 
        data?.find(style => style.name === styleName)
      ).filter(Boolean) as WineStyle[];

      setStyles(sortedStyles);
    } catch (error: any) {
      console.error('Error fetching Winerim styles:', error);
      toast({
        title: "Error",
        description: "Error al cargar los estilos Winerim",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCardConfig = (index: number) => {
    const configs = [
      { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-200', icon: Droplet, iconColor: 'text-green-600' },
      { bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-200', icon: Diamond, iconColor: 'text-slate-600' },
      { bg: 'bg-yellow-50', border: 'border-yellow-100', iconBg: 'bg-yellow-200', icon: Circle, iconColor: 'text-yellow-600' },
      { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-200', icon: Circle, iconColor: 'text-orange-600' },
      { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-200', icon: ArrowUp, iconColor: 'text-amber-600' },
      { bg: 'bg-yellow-50', border: 'border-yellow-100', iconBg: 'bg-yellow-200', icon: Square, iconColor: 'text-yellow-600' },
      { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-200', icon: Star, iconColor: 'text-orange-600' },
      { bg: 'bg-gray-50', border: 'border-gray-100', iconBg: 'bg-gray-200', icon: Check, iconColor: 'text-gray-600' },
      { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-200', icon: Droplet, iconColor: 'text-pink-600' },
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-200', icon: Droplet, iconColor: 'text-red-600' },
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-200', icon: Circle, iconColor: 'text-red-600' },
      { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-200', icon: Circle, iconColor: 'text-orange-600' },
      { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-200', icon: Square, iconColor: 'text-amber-600' },
      { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-200', icon: Droplet, iconColor: 'text-pink-600' },
      { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-200', icon: Droplet, iconColor: 'text-pink-600' },
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-200', icon: Droplet, iconColor: 'text-red-600' }
    ];
    return configs[index % configs.length];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-900"></div>
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No se pudieron cargar los estilos Winerim.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {styles.map((style, index) => {
        const config = getCardConfig(index);
        const IconComponent = config.icon;
        
        return (
          <Card key={style.id} className={`${config.bg} ${config.border} border hover:shadow-lg transition-shadow rounded-2xl overflow-hidden`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Icono circular */}
                <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mb-4`}>
                  <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
                </div>
                
                {/* Título */}
                <h3 className="font-bold text-lg mb-3 text-gray-900">
                  {style.name}
                </h3>
                
                {/* Descripción */}
                <p className="text-sm text-gray-700 leading-relaxed text-justify">
                  {style.description || 'Descripción no disponible'}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WineStylesGrid;
