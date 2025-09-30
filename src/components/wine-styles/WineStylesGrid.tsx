
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Wine, Sun, Utensils, Leaf, ArrowRight } from 'lucide-react';

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
  const navigate = useNavigate();
  const [styles, setStyles] = useState<WineStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Los estilos específicos de las imágenes en el orden mostrado
  const winerimStyles = [
    'Burbuja Fresca', 'Brut Elegante', 'Blanco Vital', 'Blanco Goloso',
    'Dulce Intenso', 'Oxidativo/Maduro', 'Experimental', 'Vino de Terruño',
    'Tinto Versátil', 'Tinto de Estructura', 'Tinto Goloso', 'Dulce Ligero',
    'Blanco de Carácter', 'Rosado Ligero', 'Rosado Gastronómico', 'Tinto Ligero'
  ];

  useEffect(() => {
    fetchWinerimStyles();
  }, []);

  const fetchWinerimStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*');

      if (error) throw error;

      const rows = data || [];
      const pickFor = (name: string) => {
        const exact = rows.find(r => r.name === name);
        if (exact) return exact;
        const withDesc = rows.find(r => r.name.startsWith(name) && r.description);
        if (withDesc) return withDesc;
        return rows.find(r => r.name.startsWith(name));
      };

      const sortedStyles = winerimStyles
        .map(name => pickFor(name))
        .filter(Boolean) as WineStyle[];

      setStyles(sortedStyles);

      if (sortedStyles.length < winerimStyles.length) {
        console.warn(`Faltan estilos: ${winerimStyles.length - sortedStyles.length}`);
      }
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
      // Fila 1: Burbuja Fresca, Brut Elegante, Blanco Vital, Blanco Goloso
      { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-200', icon: Droplet, iconColor: 'text-white' },
      { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-600', icon: Diamond, iconColor: 'text-white' },
      { bg: 'bg-yellow-50', border: 'border-yellow-100', iconBg: 'bg-yellow-300', icon: Zap, iconColor: 'text-white' },
      { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-300', icon: Grape, iconColor: 'text-white' },
      // Fila 2: Dulce Intenso, Oxidativo/Maduro, Experimental, Vino de Terruño
      { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', icon: Flame, iconColor: 'text-white' },
      { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-700', icon: Clock, iconColor: 'text-white' },
      { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-400', icon: Beaker, iconColor: 'text-white' },
      { bg: 'bg-gray-50', border: 'border-gray-100', iconBg: 'bg-gray-500', icon: Mountain, iconColor: 'text-white' },
      // Fila 3: Tinto Versátil, Tinto de Estructura, Tinto Goloso, Dulce Ligero
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-400', icon: Shield, iconColor: 'text-white' },
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-800', icon: Sword, iconColor: 'text-white' },
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-600', icon: Heart, iconColor: 'text-white' },
      { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-300', icon: Feather, iconColor: 'text-white' },
      // Fila 4: Blanco de Carácter, Rosado Ligero, Rosado Gastronómico, Tinto Ligero
      { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', icon: Wine, iconColor: 'text-white' },
      { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-300', icon: Sun, iconColor: 'text-white' },
      { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-500', icon: Utensils, iconColor: 'text-white' },
      { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-400', icon: Leaf, iconColor: 'text-white' }
    ];
    return configs[index % configs.length];
  };

  const cleanStyleName = (name: string) => {
    // Quitar IDs entre paréntesis al final del nombre (ej: "Tinto Ligero (87)" → "Tinto Ligero")
    return name.replace(/\s*\(\d+\)\s*$/, '').trim();
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
          <Card 
            key={style.id} 
            className={`${config.bg} ${config.border} border-2 hover:border-red-300 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-red-100/50 group relative`}
            onClick={() => navigate(`/wine-styles/${style.id}`)}
          >
            <CardContent className="p-6 relative">
              <div className="flex flex-col items-center text-center">
                {/* Icono circular */}
                <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg`}>
                  <IconComponent className={`w-8 h-8 ${config.iconColor}`} />
                </div>
                
                {/* Título */}
                <h3 className="font-bold text-lg mb-3 text-gray-900 group-hover:text-red-700 transition-colors">
                  {cleanStyleName(style.name)}
                </h3>
                
                {/* Descripción */}
                <p className="text-sm text-gray-700 leading-relaxed text-justify mb-4">
                  {style.description || 'Descripción no disponible'}
                </p>
                
                {/* Indicador de click */}
                <div className="flex items-center justify-center text-red-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Ver detalles</span>
                  <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
              
              {/* Efecto de brillo en hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WineStylesGrid;
