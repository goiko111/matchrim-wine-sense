
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Send, Loader, Wine, ChefHat, Scale, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamAiRimResponse } from '@/lib/aiRimStream';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
import { generateMatchrimCode, type MatchrimProfileLike } from '@/utils/matchrimPassport';
import WineRecommendationCard from './WineRecommendationCard';
import DishRecommendationCard from './DishRecommendationCard';
import PairingScoreCard from './PairingScoreCard';
import PairingAnalysisCard from './PairingAnalysisCard';

interface MatchrimFunctionProps {
  functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check';
  onBack: () => void;
  initialInput1?: string;
  initialInput2?: string;
  autoSubmit?: boolean;
}

type ExamplePrompt = {
  label: string;
  input1: string;
  input2?: string;
};

const MatchrimFunction: React.FC<MatchrimFunctionProps> = ({ functionType, onBack, initialInput1, initialInput2, autoSubmit }) => {
  const { user } = useAuth();
  const [input1, setInput1] = useState(initialInput1 || '');
  const [input2, setInput2] = useState(initialInput2 || '');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileContext, setProfileContext] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setProfileContext(null);
      return;
    }

    let cancelled = false;

    const loadActiveProfileContext = async () => {
      const { data: baseProfile, error: profileError } = await supabase
        .from('quiz_results')
        .select('potente, acidez, dulce, tanico, afrutado')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError || !baseProfile) {
        if (profileError) console.error('Error loading aiRIM Matchrim profile:', profileError);
        if (!cancelled) setProfileContext(null);
        return;
      }

      const { data: trainingWines, error: trainingError } = await supabase
        .from('user_wines')
        .select('rating, sensory_attributes')
        .eq('user_id', user.id)
        .eq('use_for_profile_training', true)
        .not('rating', 'is', null)
        .not('sensory_attributes', 'is', null);

      if (trainingError) {
        console.error('Error loading aiRIM training wines:', trainingError);
      }

      const learned = calculateLearnedMatchrimProfile(
        baseProfile as MatchrimProfileLike,
        (trainingWines || []) as TrainableWine[]
      );
      const activeProfile = learned.samples > 0 ? learned.profile : (baseProfile as MatchrimProfileLike);
      const code = generateMatchrimCode(baseProfile as MatchrimProfileLike);

      if (!cancelled) {
        setProfileContext(
          [
            `Código Matchrim estable del usuario: ${code}.`,
            `Escala 0-5: potencia ${activeProfile.potente}, acidez ${activeProfile.acidez}, dulzura ${activeProfile.dulce}, taninos ${activeProfile.tanico}, afrutado ${activeProfile.afrutado}.`,
            learned.samples > 0
              ? `Las recomendaciones incluyen aprendizaje de ${learned.samples} vino${learned.samples !== 1 ? 's' : ''} puntuado${learned.samples !== 1 ? 's' : ''}; confianza ${learned.confidence}%.`
              : 'Este perfil todavía procede solo del test Matchrim base.',
          ].join('\n')
        );
      }
    };

    loadActiveProfileContext();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const getFunctionConfig = () => {
    switch (functionType) {
      case 'wine-for-dish':
        return {
          icon: Wine,
          title: '¿Qué vino va con mi plato?',
          placeholder1: 'Describe tu plato (ej: canelones de espinacas)',
          showSecondInput: false,
          examples: [
            { label: 'Tacos picantes', input1: 'tacos picantes al pastor' },
            { label: 'Lubina', input1: 'lubina a la sal con patata panadera' },
            { label: 'Curry suave', input1: 'curry suave de verduras con arroz jazmín' },
          ] satisfies ExamplePrompt[],
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
          examples: [
            { label: 'Albariño joven', input1: 'Albariño joven de Rías Baixas' },
            { label: 'Rioja reserva', input1: 'Rioja reserva 2018' },
            { label: 'Champagne brut', input1: 'Champagne brut non-vintage' },
          ] satisfies ExamplePrompt[],
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
          examples: [
            { label: 'Riesling + sushi', input1: 'Riesling seco', input2: 'sushi variado' },
            { label: 'Malbec + asado', input1: 'Malbec argentino', input2: 'asado de ternera' },
            { label: 'Cava + fritura', input1: 'Cava brut nature', input2: 'fritura de pescado' },
          ] satisfies ExamplePrompt[],
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

  const applyExample = (example: ExamplePrompt) => {
    setInput1(example.input1);
    setInput2(example.input2 || '');
    setResult('');
  };

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
          context: ['aiRIM - Sistema de maridajes', profileContext].filter(Boolean).join('\n'),
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
    <main className="matchrim-native-safe-x mx-auto min-h-screen w-full max-w-2xl pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))] sm:pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="matchrim-pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Volver a aiRIM"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-900">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">aiRIM</p>
          <h1 className="text-xl font-bold leading-tight text-slate-950">{config.title}</h1>
        </div>
      </div>

      <section className="mt-7 space-y-4" aria-label="Datos para la recomendación">
        {profileContext && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-red-800" />
            <p>Usaré tu perfil Matchrim activo y señalaré cualquier dato que falte.</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Prueba con</p>
          <div className="flex flex-wrap gap-2">
          {config.examples.map((example) => (
            <Button
              key={example.label}
              type="button"
              variant="outline"
              size="sm"
              className="matchrim-pressable min-h-10 border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              onClick={() => applyExample(example)}
              disabled={isLoading}
            >
              {example.label}
            </Button>
          ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="airim-guided-input-1" className="text-sm font-semibold text-slate-800">
            {functionType === 'wine-for-dish' ? 'Plato' : functionType === 'dish-for-wine' ? 'Vino' : 'Vino'}
          </label>
          <Input
            id="airim-guided-input-1"
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder={config.placeholder1}
            className="h-14 w-full rounded-lg border-slate-200 bg-white px-4 text-base shadow-sm focus-visible:ring-red-800"
            disabled={isLoading}
          />
        </div>

        {config.showSecondInput && (
          <div className="space-y-2">
            <label htmlFor="airim-guided-input-2" className="text-sm font-semibold text-slate-800">Plato</label>
            <Input
              id="airim-guided-input-2"
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder={config.placeholder2}
              className="h-14 w-full rounded-lg border-slate-200 bg-white px-4 text-base shadow-sm focus-visible:ring-red-800"
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !input1.trim() || (config.showSecondInput && !input2.trim())}
            className="matchrim-pressable min-h-12 flex-1 bg-red-900 text-white hover:bg-red-950"
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
              className="matchrim-pressable min-h-12 border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            >
              Nuevo
            </Button>
          )}
        </div>
      </section>

      {result && (
        <section className="mt-7 space-y-4" aria-label="Recomendación de aiRIM">
          {functionType === 'pairing-check' ? (
            <PairingAnalysisCard response={result} />
          ) : functionType === 'dish-for-wine' ? (
            <DishRecommendationCard response={result} />
          ) : (
            <WineRecommendationCard response={result} functionType={functionType} />
          )}
        </section>
      )}

      {isLoading && !result && (
        <section className="mt-7" aria-live="polite">
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-red-800" />
            <p className="font-medium text-slate-900">aiRIM está contrastando la decisión...</p>
            <p className="mt-2 text-sm text-slate-500">Perfil, plato y contexto disponible</p>
          </div>
        </section>
      )}
    </main>
  );
};

export default MatchrimFunction;
