import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Wine, MapPin, Calendar, Grape, Star, Share2 } from 'lucide-react';
import Header from '@/components/Header';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';

interface WineDetail {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  estilo: string;
  potencia: number;
  acidez: number;
  dulzura: number;
  taninos: number;
  afrutado: number;
  vintage: number | null;
  description: string | null;
  maridage_recommendations: string[] | null;
  created_at: string;
}

const WineDetail = () => {
  const { user } = useAuth();
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [wine, setWine] = useState<WineDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWineDetail();
    }
  }, [id]);

  const fetchWineDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setWine(data);
    } catch (error: any) {
      console.error('Error fetching wine detail:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del vino",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAttributeColor = (value: number) => {
    if (value <= 1) return 'bg-gray-200';
    if (value <= 2) return 'bg-blue-200';
    if (value <= 3) return 'bg-yellow-200';
    if (value <= 4) return 'bg-orange-200';
    return 'bg-red-200';
  };

  const getAttributeLabel = (attribute: string, value: number) => {
    const labels: Record<string, Record<number, string>> = {
      potencia: { 0: 'Sin intensidad', 1: 'Muy ligero', 2: 'Ligero', 3: 'Moderado', 4: 'Intenso', 5: 'Muy intenso' },
      acidez: { 0: 'Sin acidez', 1: 'Muy baja', 2: 'Baja', 3: 'Equilibrada', 4: 'Alta', 5: 'Muy alta' },
      dulzura: { 0: 'Muy seco', 1: 'Seco', 2: 'Ligeramente dulce', 3: 'Semidulce', 4: 'Dulce', 5: 'Muy dulce' },
      taninos: { 0: 'Sin taninos', 1: 'Mínimos', 2: 'Suaves', 3: 'Equilibrados', 4: 'Marcados', 5: 'Intensos' },
      afrutado: { 0: 'Sin fruta', 1: 'Poco afrutado', 2: 'Ligeramente afrutado', 3: 'Moderadamente afrutado', 4: 'Muy afrutado', 5: 'Intensamente afrutado' }
    };
    return labels[attribute]?.[value] || 'No definido';
  };

  const generateSlug = (wineName: string) => {
    return wineName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const shareWine = async () => {
    const url = window.location.href;
    try {
      await navigator.share({
        title: `${wine?.name} - Winerim`,
        text: `Descubre este increíble vino: ${wine?.name}`,
        url: url,
      });
    } catch (err) {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      toast({
        title: "¡Copiado!",
        description: "Enlace copiado al portapapeles",
      });
    }
  };

  if (isLoading) {
    return (
      <>
        {user ? <AppNav /> : <Header />}
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!wine) {
    return (
      <>
        {user ? <AppNav /> : <Header />}
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Vino no encontrado</h1>
              <Button onClick={() => navigate('/data-viewer')} className="bg-primary hover:bg-primary/90">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a la lista
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {user ? <AppNav /> : <Header />}
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header con navegación */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/data-viewer')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button 
              variant="outline" 
              onClick={shareWine}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          </div>

          {/* Información principal del vino */}
          <Card className="mb-8 shadow-elegant">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                    {wine.name}
                  </CardTitle>
                  <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
                    {wine.producer && (
                      <div className="flex items-center gap-1">
                        <Grape className="h-4 w-4" />
                        <span>{wine.producer}</span>
                      </div>
                    )}
                    {wine.region && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{wine.region}</span>
                      </div>
                    )}
                    {wine.vintage && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{wine.vintage}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    <Wine className="h-4 w-4 mr-1" />
                    {wine.estilo}
                  </Badge>
                </div>
                
                {/* Placeholder para imagen del vino */}
                <div className="w-32 h-48 bg-gradient-to-b from-primary-light to-primary rounded-lg flex items-center justify-center ml-6">
                  <Wine className="h-16 w-16 text-primary" />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {wine.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Descripción</h3>
                  <p className="text-gray-700 leading-relaxed">{wine.description}</p>
                </div>
              )}

              <Separator className="my-6" />

              {/* Perfil sensorial */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Perfil Sensorial</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'potencia', label: 'Potencia', value: wine.potencia },
                    { key: 'acidez', label: 'Acidez', value: wine.acidez },
                    { key: 'dulzura', label: 'Dulzura', value: wine.dulzura },
                    { key: 'taninos', label: 'Taninos', value: wine.taninos },
                    { key: 'afrutado', label: 'Afrutado', value: wine.afrutado }
                  ].map(attr => (
                    <div key={attr.key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">{attr.label}</span>
                        <span className="text-sm font-bold text-primary">{attr.value}/5</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${getAttributeColor(attr.value)} transition-all duration-500`}
                          style={{ width: `${(attr.value / 5) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {getAttributeLabel(attr.key, attr.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maridajes recomendados */}
              {wine.maridage_recommendations && wine.maridage_recommendations.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Maridajes Recomendados</h3>
                    <div className="flex flex-wrap gap-2">
                      {wine.maridage_recommendations.map((pairing, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          {pairing}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card de consejos del sommelier */}
          <Card className="bg-gradient-to-r from-primary-light to-white shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Star className="h-5 w-5" />
                Consejos del Sommelier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Temperatura de Servicio</h4>
                  <p className="text-gray-700 text-sm">
                    {wine.estilo.toLowerCase().includes('tinto') 
                      ? '16-18°C - Servir a temperatura ambiente' 
                      : wine.estilo.toLowerCase().includes('blanco') 
                      ? '8-10°C - Bien frío' 
                      : wine.estilo.toLowerCase().includes('rosado') 
                      ? '6-8°C - Muy frío'
                      : '6-8°C - Muy frío'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Copa Recomendada</h4>
                  <p className="text-gray-700 text-sm">
                    {wine.estilo.toLowerCase().includes('tinto') 
                      ? 'Copa de vino tinto - Amplia para oxigenar' 
                      : wine.estilo.toLowerCase().includes('burbuja') || wine.estilo.toLowerCase().includes('brut')
                      ? 'Copa flauta - Para conservar las burbujas'
                      : 'Copa de vino blanco - Más estrecha'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      </div>
    </>
  );
};

export default WineDetail;