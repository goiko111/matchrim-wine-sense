
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Droplet, Diamond, Zap, Grape, Flame, Clock, Beaker, Mountain, Shield, Sword, Heart, Feather, Wine, Sun, Utensils, Leaf, ArrowRight, type LucideIcon } from 'lucide-react';
import { WINE_STYLE_CATALOG, type PublicWineStyle } from '@/lib/winerimClassifier';

interface WineStyle {
  id: string;
  name: string;
  description: string | null;
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
  types: string[];
}

interface WineStylesGridProps { showIntro?: boolean }

type StyleCardConfig = {
  bg: string;
  border: string;
  iconBg: string;
  icon: LucideIcon;
  iconColor: string;
};

const WINERIM_STYLES = WINE_STYLE_CATALOG
  .filter((style) => style.visiblePublicamente)
  .map((style) => style.estilo as PublicWineStyle);

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  'Burbuja Fresca': 'Efervescencia fresca y ligera, perfecta para aperitivos y celebraciones.',
  'Brut Elegante': 'Espumoso seco y sofisticado, de burbuja fina y final largo.',
  'Blanco Vital': 'Blanco vibrante y cítrico, con acidez refrescante y energía.',
  'Blanco Goloso': 'Blanco aromático y amable, con fruta madura y tacto goloso.',
  'Dulce Intenso': 'Dulce de gran concentración y complejidad, ideal para postres.',
  'Oxidativo/Maduro': 'Perfil evolucionado con notas de frutos secos, especias y crianza.',
  'Experimental': 'Vinos de vanguardia con técnicas innovadoras y carácter único.',
  'Vino de Terruño': 'Expresión pura del origen: suelo, clima y tradición en equilibrio.',
  'Tinto Versátil': 'Tinto equilibrado y adaptable, compañero ideal para cualquier ocasión.',
  'Tinto de Estructura': 'Tinto con cuerpo y taninos firmes, profundo y de larga guarda.',
  'Tinto Goloso': 'Tinto frutal y seductor, de paso amable y final jugoso.',
  'Dulce Ligero': 'Dulce sutil y fresco, armonioso y fácil de disfrutar.',
  'Blanco de Carácter': 'Blanco con personalidad, estructura y complejidad aromática.',
  'Rosado Ligero': 'Rosado fresco y delicado, perfecto para días soleados.',
  'Rosado Gastronómico': 'Rosado con estructura y precisión para grandes maridajes.',
  'Tinto Ligero': 'Tinto fresco y ligero, taninos suaves y gran bebibilidad.',
};

const WineStylesGrid: React.FC<WineStylesGridProps> = ({ showIntro = true }) => {
  const navigate = useNavigate();
  const styles: WineStyle[] = WINERIM_STYLES.map((name, idx) => ({
    id: `style-${idx}`,
    name,
    description: DEFAULT_DESCRIPTIONS[name] ?? 'Próximamente',
    potente: 0,
    acidez: 0,
    dulce: 0,
    tanico: 0,
    afrutado: 0,
    types: WINE_STYLE_CATALOG.find((item) => item.estilo === name)?.tiposCompatibles ?? [],
  }));

  const getCardConfig = (name: string) => {
    const configs: Record<string, StyleCardConfig> = {
      'Burbuja Fresca': { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-200', icon: Droplet, iconColor: 'text-white' },
      'Brut Elegante': { bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-600', icon: Diamond, iconColor: 'text-white' },
      'Blanco Vital': { bg: 'bg-yellow-50', border: 'border-yellow-100', iconBg: 'bg-yellow-300', icon: Zap, iconColor: 'text-white' },
      'Blanco Goloso': { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-300', icon: Grape, iconColor: 'text-white' },
      'Dulce Intenso': { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', icon: Flame, iconColor: 'text-white' },
      'Oxidativo/Maduro': { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-700', icon: Clock, iconColor: 'text-white' },
      'Experimental': { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-400', icon: Beaker, iconColor: 'text-white' },
      'Vino de Terruño': { bg: 'bg-gray-50', border: 'border-gray-100', iconBg: 'bg-gray-500', icon: Mountain, iconColor: 'text-white' },
      'Tinto Versátil': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-400', icon: Shield, iconColor: 'text-white' },
      'Tinto de Estructura': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-800', icon: Sword, iconColor: 'text-white' },
      'Tinto Goloso': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-600', icon: Heart, iconColor: 'text-white' },
      'Dulce Ligero': { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-300', icon: Feather, iconColor: 'text-white' },
      'Blanco de Carácter': { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500', icon: Wine, iconColor: 'text-white' },
      'Rosado Ligero': { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-300', icon: Sun, iconColor: 'text-white' },
      'Rosado Gastronómico': { bg: 'bg-pink-50', border: 'border-pink-100', iconBg: 'bg-pink-500', icon: Utensils, iconColor: 'text-white' },
      'Tinto Ligero': { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-400', icon: Leaf, iconColor: 'text-white' },
    };
    return configs[name] ?? { bg: 'bg-gray-50', border: 'border-gray-100', iconBg: 'bg-gray-500', icon: Wine, iconColor: 'text-white' };
  };

  const cleanStyleName = (name: string) => {
    // Quitar IDs entre paréntesis al final del nombre (ej: "Tinto Ligero (87)" → "Tinto Ligero")
    return name.replace(/\s*\(\d+\)\s*$/, '').trim();
  };

  const generateSlug = (name: string) => {
    return cleanStyleName(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  if (styles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No se pudieron cargar los estilos Winerim.</p>
      </div>
    );
  }

  return (
    <div>
      {showIntro && (
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border-primary/20 rounded-full px-4 py-2 mb-4">
            <span className="text-xs font-semibold">16 Estilos Visibles</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Los Estilos de Vino</h2>
          <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto">
            Los vinos se agrupan por estilo sensorial y tipo físico para que cada búsqueda sea coherente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {styles.map((style) => {
          const config = getCardConfig(style.name);
          const IconComponent = config.icon;

          return (
            <Card
              key={style.id}
              className={`${config.bg} ${config.border} border-2 hover:border-red-300 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer transform hover:scale-105 hover:shadow-red-100/50 group relative`}
              onClick={() => navigate(`/wine-styles/${generateSlug(style.name)}`)}
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

                  <div className="flex flex-wrap justify-center gap-1 mb-3">
                    {style.types.map((type) => (
                      <span key={type} className="text-[11px] rounded-full bg-white/80 border border-gray-200 px-2 py-0.5 text-gray-700">
                        {type}
                      </span>
                    ))}
                  </div>

                   {/* Descripción */}
                  <p className="text-sm text-gray-700 leading-relaxed text-justify mb-4">
                    {DEFAULT_DESCRIPTIONS[cleanStyleName(style.name)] || style.description || 'Descripción no disponible'}
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
    </div>
  );
};

export default WineStylesGrid;
