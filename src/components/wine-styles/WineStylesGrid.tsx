
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  const getColorByIndex = (index: number) => {
    const colors = [
      'bg-green-100 border-green-200',
      'bg-blue-100 border-blue-200',
      'bg-purple-100 border-purple-200',
      'bg-red-100 border-red-200',
      'bg-pink-100 border-pink-200',
      'bg-orange-100 border-orange-200',
      'bg-yellow-100 border-yellow-200',
      'bg-indigo-100 border-indigo-200',
      'bg-teal-100 border-teal-200',
      'bg-emerald-100 border-emerald-200',
      'bg-cyan-100 border-cyan-200',
      'bg-violet-100 border-violet-200',
      'bg-fuchsia-100 border-fuchsia-200',
      'bg-rose-100 border-rose-200',
      'bg-amber-100 border-amber-200',
      'bg-lime-100 border-lime-200'
    ];
    return colors[index % colors.length];
  };

  const getIconByIndex = (index: number) => {
    const icons = ['🍷', '🍇', '🥂', '🍾', '🍃', '🌸', '🍑', '🍊', '🍋', '🍈', '🥝', '🍓', '🍒', '🍑', '🍊', '🍇'];
    return icons[index % icons.length];
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
      {styles.map((style, index) => (
        <Card key={style.id} className={`${getColorByIndex(index)} border-2 hover:shadow-lg transition-shadow`}>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">
              {getIconByIndex(index)}
            </div>
            <h3 className="font-bold text-lg mb-3 text-gray-800">
              {style.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {style.description || 'Descripción no disponible'}
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Potente:</span>
                <span className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < style.potente ? 'text-red-500' : 'text-gray-300'}>●</span>
                  ))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Acidez:</span>
                <span className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < style.acidez ? 'text-yellow-500' : 'text-gray-300'}>●</span>
                  ))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dulce:</span>
                <span className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < style.dulce ? 'text-pink-500' : 'text-gray-300'}>●</span>
                  ))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tánico:</span>
                <span className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < style.tanico ? 'text-purple-500' : 'text-gray-300'}>●</span>
                  ))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Afrutado:</span>
                <span className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < style.afrutado ? 'text-green-500' : 'text-gray-300'}>●</span>
                  ))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WineStylesGrid;
