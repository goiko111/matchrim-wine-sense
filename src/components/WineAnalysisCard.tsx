
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wine, Loader, Sparkles } from 'lucide-react';

const WineAnalysisCard: React.FC = () => {
  const [wineDescription, setWineDescription] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeWine = async () => {
    if (!wineDescription.trim()) {
      toast({
        title: "Error",
        description: "Por favor, describe el vino que quieres analizar.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');

    try {
      const prompt = `Analiza el siguiente vino y proporciona un análisis detallado que incluya:
1. Características organolépticas (color, aroma, sabor)
2. Posible origen y varietal
3. Maridajes recomendados
4. Puntuación estimada
5. Recomendaciones de servicio (temperatura, copa, etc.)

Descripción del vino: ${wineDescription}`;

      const { data, error } = await supabase.functions.invoke('ai-wine-chat', {
        body: {
          message: prompt,
          context: 'Análisis de vino detallado'
        }
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);

      setAnalysis(data.response);
      toast({
        title: "Análisis completado",
        description: "El análisis del vino se ha generado exitosamente.",
      });

    } catch (error) {
      console.error('Error analyzing wine:', error);
      toast({
        title: "Error",
        description: "No se pudo completar el análisis. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setWineDescription('');
    setAnalysis('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900">
          <Wine className="h-5 w-5" />
          Análisis Inteligente de Vinos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-red-700 mb-2 block">
            Describe el vino que quieres analizar
          </label>
          <Textarea
            value={wineDescription}
            onChange={(e) => setWineDescription(e.target.value)}
            placeholder="Ej: Vino tinto con aroma a frutas rojas, taninos suaves, color rubí intenso..."
            className="min-h-[100px]"
            disabled={isAnalyzing}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={analyzeWine}
            disabled={isAnalyzing || !wineDescription.trim()}
            className="bg-red-700 hover:bg-red-800 flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analizar Vino
              </>
            )}
          </Button>
          {analysis && (
            <Button
              onClick={clearAnalysis}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Limpiar
            </Button>
          )}
        </div>

        {analysis && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-red-900 mb-3">
              Análisis del Vino
            </h3>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {analysis}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WineAnalysisCard;
