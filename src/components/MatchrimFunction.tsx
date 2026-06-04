
import React, { useState } from 'react';
import { ArrowLeft, Send, Loader, Wine, ChefHat, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { streamAiRimResponse } from '@/lib/aiRimStream';
import WineRecommendationCard from './WineRecommendationCard';
import DishRecommendationCard from './DishRecommendationCard';
import PairingScoreCard from './PairingScoreCard';
import PairingAnalysisCard from './PairingAnalysisCard';

interface MatchrimFunctionProps {
  functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check';
  onBack: () => void;
}

const MatchrimFunction: React.FC<MatchrimFunctionProps> = ({ functionType, onBack }) => {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getFunctionConfig = () => {
    switch (functionType) {
      case 'wine-for-dish':
        return {
          icon: Wine,
          title: '¿Qué vino va con mi plato?',
          placeholder1: 'Describe tu plato (ej: canelones de espinacas)',
          showSecondInput: false,
          prompt: `Eres Winerim. El usuario va a comer: "${input1}". 

Debes dar EXACTAMENTE 3 vinos diferentes. Usa este formato exacto:

### 1. [Nombre del vino]

**Recomendación:** [Nombre completo del vino - Bodega]

- **Tipo:** [Tipo de vino]
- **Bodega:** [Nombre de la bodega]
- **Región:** [Región específica]
- **País:** [País de origen]
- **Precio aproximado:** [Rango de precio en euros]

**Por qué funciona:** [Explicación detallada de 3-4 líneas sobre por qué este vino marida perfectamente con el plato]

### 2. [Nombre del vino]

**Recomendación:** [Nombre completo del vino - Bodega]

- **Tipo:** [Tipo de vino]
- **Bodega:** [Nombre de la bodega]
- **Región:** [Región específica]
- **País:** [País de origen]
- **Precio aproximado:** [Rango de precio en euros]

**Por qué funciona:** [Explicación detallada de 3-4 líneas sobre por qué este vino marida perfectamente con el plato]

### 3. [Nombre del vino]

**Recomendación:** [Nombre completo del vino - Bodega]

- **Tipo:** [Tipo de vino]
- **Bodega:** [Nombre de la bodega]
- **Región:** [Región específica]
- **País:** [País de origen]
- **Precio aproximado:** [Rango de precio en euros]

**Por qué funciona:** [Explicación detallada de 3-4 líneas sobre por qué este vino marida perfectamente con el plato]

IMPORTANTE: 
- Habla en primera persona. Usa "Te recomiendo", "He seleccionado para ti". 
- NO uses tercera persona.
- Evita latinismos como "platillo". Usa "plato".`
        };
      case 'dish-for-wine':
        return {
          icon: ChefHat,
          title: '¿Qué plato va con mi vino?',
          placeholder1: 'Describe tu vino (ej: Barolo 2016)',
          showSecondInput: false,
          prompt: `Eres Winerim. El usuario tiene este vino: "${input1}".

Debes dar EXACTAMENTE 3 platos diferentes. Usa este formato exacto:

### 1. [Nombre del plato]

**Recomendación:** [Nombre completo del plato con breve descripción]

- **Tipo de cocina:** [Tipo de cocina (italiana, española, etc.)]
- **Ingredientes principales:** [Ingredientes clave del plato]
- **Técnica de cocción:** [Cómo se prepara (asado, guisado, etc.)]
- **Ocasión ideal:** [Cuándo servir este plato]
- **Dificultad:** [Fácil, Media, Alta]

**Por qué funciona:** [Explicación detallada de 3-4 líneas sobre por qué este plato marida perfectamente con el vino]

### 2. [Nombre del plato]

**Recomendación:** [Nombre completo del plato con breve descripción]

- **Tipo de cocina:** [Tipo de cocina (italiana, española, etc.)]
- **Ingredientes principales:** [Ingredientes clave del plato]
- **Técnica de cocción:** [Cómo se prepara (asado, guisado, etc.)]
- **Ocasión ideal:** [Cuándo servir este plato]
- **Dificultad:** [Fácil, Media, Alta]

**Por qué funciona:** [Explicación detallada de 3-4 líneas sobre por qué este plato marida perfectamente con el vino]

### 3. [Nombre del plato]

**Recomendación:** [Nombre completo del plato con breve descripción]

- **Tipo de cocina:** [Tipo de cocina (italiana, española, etc.)]
- **Ingredientes principales:** [Ingredientes clave del plato]
- **Técnica de cocción:** [Cómo se prepara (asado, guisado, etc.)]
- **Ocasión ideal:** [Cuándo servir este plato]
- **Dificultad:** [Fácil, Media, Alta]

**Por qué funciona:** [Explicación detallada de 3-4 líneas sobre por qué este plato marida perfectamente con el vino]

IMPORTANTE: 
- Habla en primera persona. Usa "Te sugiero", "Te recomiendo". 
- NO uses tercera persona.`
        };
      case 'pairing-check':
        return {
          icon: Scale,
          title: '¿Maridan bien juntos?',
          placeholder1: 'Tu vino (ej: Malbec)',
          placeholder2: 'Tu plato (ej: asado)',
          showSecondInput: true,
          prompt: `Eres Winerim. Evalúa este maridaje: "${input1}" con "${input2}".

Usa este formato exacto:

**Puntuación del maridaje:** [Número del 1-10]/10

**Evaluación general:** [Frase corta sobre si es excelente, bueno o mejorable]

**¿Por qué funciona (o no)?**

[Explicación detallada de 4-5 líneas sobre:
- Cómo interactúan los sabores
- Balance de taninos/acidez
- Intensidades que se complementan o chocan
- Texturas y cuerpo]

**Aspectos positivos:**

- [Punto positivo 1]
- [Punto positivo 2]
- [Punto positivo 3]

**Aspectos a considerar:**

- [Aspecto 1 a tener en cuenta]
- [Aspecto 2 a tener en cuenta]

**Consejos para mejorar la experiencia:**

- **Temperatura:** [Temperatura ideal de servicio]
- **Preparación:** [Sugerencias sobre la preparación del plato]
- **Acompañamientos:** [Guarniciones o complementos que mejoren el maridaje]

**Alternativas si no es ideal:**

[Si la puntuación es menor a 7, sugiere 2-3 vinos alternativos que funcionen mejor con este plato]

IMPORTANTE: Habla en primera persona. "En mi opinión", "Te sugiero".`
        };
    }
  };

  const config = getFunctionConfig();
  const IconComponent = config.icon;

  const handleSubmit = async () => {
    if (!input1.trim() || (config.showSecondInput && !input2.trim())) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos necesarios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      await streamAiRimResponse(
        {
          functionType,
          input1: input1.trim(),
          input2: input2.trim() || null,
          context: 'aiRIM - Sistema de maridajes',
        },
        setResult,
      );

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu consulta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInput1('');
    setInput2('');
    setResult('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-red-700 hover:bg-red-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <IconComponent className="h-4 w-4 text-red-800" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-red-900">{config.title}</h1>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="max-w-md mx-auto space-y-4 mb-6">
        <div>
          <Input
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder={config.placeholder1}
            className="w-full p-4 text-base border-red-200 focus:border-red-500"
            disabled={isLoading}
          />
        </div>

        {config.showSecondInput && (
          <div>
            <Input
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder={config.placeholder2}
              className="w-full p-4 text-base border-red-200 focus:border-red-500"
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !input1.trim() || (config.showSecondInput && !input2.trim())}
            className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Analizar
              </>
            )}
          </Button>
          {result && (
            <Button
              onClick={handleClear}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="max-w-md mx-auto space-y-4">
          {functionType === 'pairing-check' ? (
            <PairingAnalysisCard response={result} />
          ) : functionType === 'dish-for-wine' ? (
            <DishRecommendationCard response={result} />
          ) : (
            <WineRecommendationCard response={result} functionType={functionType} />
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !result && (
        <div className="max-w-md mx-auto">
          <div className="p-8 text-center bg-white rounded-lg border border-red-200 shadow-sm">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-red-700" />
            <p className="text-red-600 font-medium">Winerim está analizando...</p>
            <p className="text-red-500 text-sm mt-2">Un momento, por favor</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchrimFunction;
