import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus, ThumbsUp, AlertCircle, Lightbulb, Wine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PairingAnalysisCardProps {
  response: string;
}

const PairingAnalysisCard: React.FC<PairingAnalysisCardProps> = ({ response }) => {
  const parsePairingAnalysis = (text: string) => {
    const result = {
      score: 0,
      evaluation: '',
      whyItWorks: '',
      positiveAspects: [] as string[],
      considerations: [] as string[],
      tips: {
        temperature: '',
        preparation: '',
        accompaniments: ''
      },
      alternatives: ''
    };

    // Extract score
    const scoreMatch = text.match(/\*\*Puntuación del maridaje:\*\*\s*(\d+)\/10/i);
    if (scoreMatch) {
      result.score = parseInt(scoreMatch[1]);
    }

    // Extract evaluation
    const evalMatch = text.match(/\*\*Evaluación general:\*\*\s*([^\n]+)/i);
    if (evalMatch) {
      result.evaluation = evalMatch[1].trim();
    }

    // Extract why it works
    const whyMatch = text.match(/\*\*¿Por qué funciona \(o no\)\?\*\*\s*\n\n([^*]+?)(?=\*\*|$)/is);
    if (whyMatch) {
      result.whyItWorks = whyMatch[1].trim();
    }

    // Extract positive aspects
    const positiveSection = text.match(/\*\*Aspectos positivos:\*\*\s*\n((?:[-•]\s*[^\n]+\n?)+)/i);
    if (positiveSection) {
      result.positiveAspects = positiveSection[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim());
    }

    // Extract considerations
    const considerSection = text.match(/\*\*Aspectos a considerar:\*\*\s*\n((?:[-•]\s*[^\n]+\n?)+)/i);
    if (considerSection) {
      result.considerations = considerSection[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim());
    }

    // Extract tips
    const tempMatch = text.match(/[-•]\s*\*\*Temperatura:\*\*\s*([^\n]+)/i);
    if (tempMatch) result.tips.temperature = tempMatch[1].trim();

    const prepMatch = text.match(/[-•]\s*\*\*Preparación:\*\*\s*([^\n]+)/i);
    if (prepMatch) result.tips.preparation = prepMatch[1].trim();

    const accompMatch = text.match(/[-•]\s*\*\*Acompañamientos:\*\*\s*([^\n]+)/i);
    if (accompMatch) result.tips.accompaniments = accompMatch[1].trim();

    // Extract alternatives - try multiple patterns
    let altMatch = text.match(/\*\*Alternativas si no es ideal:\*\*\s*\n\n([^*]+?)(?=$)/is);
    if (!altMatch) {
      altMatch = text.match(/\*\*Alternativas si no es ideal:\*\*\s*\n([^*]+?)(?=\n\n\*\*|$)/is);
    }
    if (!altMatch) {
      altMatch = text.match(/\*\*Alternativas.*?:\*\*\s*\n\n?([^\n]+(?:\n(?!\*\*)[^\n]+)*)/is);
    }
    if (altMatch) {
      result.alternatives = altMatch[1].trim();
    }

    return result;
  };

  const analysis = parsePairingAnalysis(response);

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-50 border-green-200';
    if (score >= 6) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return <TrendingUp className="h-6 w-6" />;
    if (score >= 6) return <Minus className="h-6 w-6" />;
    return <TrendingDown className="h-6 w-6" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excelente maridaje';
    if (score >= 6) return 'Buen maridaje';
    return 'Maridaje mejorable';
  };

  return (
    <Card className="border-red-200 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <Wine className="h-6 w-6" />
            <h3 className="text-2xl font-bold">Análisis del Maridaje</h3>
          </div>
        </div>

        <div className="p-6">
          {/* Score Card */}
          <div className={`mb-6 p-6 rounded-xl border-2 ${getScoreBgColor(analysis.score)} transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={getScoreColor(analysis.score)}>
                  {getScoreIcon(analysis.score)}
                </div>
                <div>
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}<span className="text-2xl">/10</span>
                  </div>
                  <div className={`text-sm font-medium ${getScoreColor(analysis.score)}`}>
                    {getScoreLabel(analysis.score)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i <= analysis.score ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {analysis.evaluation && (
              <p className="text-gray-700 font-medium italic">{analysis.evaluation}</p>
            )}
          </div>

          {/* Why it works */}
          {analysis.whyItWorks && (
            <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-400">
              <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                <span>🔍</span>
                ¿Por qué funciona (o no)?
              </h4>
              <p className="text-gray-700 leading-relaxed">{analysis.whyItWorks}</p>
            </div>
          )}

          {/* Positive Aspects */}
          {analysis.positiveAspects.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                Aspectos positivos
              </h4>
              <div className="space-y-2">
                {analysis.positiveAspects.map((aspect, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-green-600 mt-0.5">✓</div>
                    <p className="text-gray-700 text-sm">{aspect}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Considerations */}
          {analysis.considerations.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Aspectos a considerar
              </h4>
              <div className="space-y-2">
                {analysis.considerations.map((consideration, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="text-amber-600 mt-0.5">!</div>
                    <p className="text-gray-700 text-sm">{consideration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {(analysis.tips.temperature || analysis.tips.preparation || analysis.tips.accompaniments) && (
            <div className="mb-6">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                Consejos para mejorar la experiencia
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {analysis.tips.temperature && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-2xl">🌡️</div>
                    <div>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Temperatura</div>
                      <p className="text-gray-700 text-sm">{analysis.tips.temperature}</p>
                    </div>
                  </div>
                )}
                {analysis.tips.preparation && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-2xl">👨‍🍳</div>
                    <div>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Preparación</div>
                      <p className="text-gray-700 text-sm">{analysis.tips.preparation}</p>
                    </div>
                  </div>
                )}
                {analysis.tips.accompaniments && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-2xl">🍽️</div>
                    <div>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Acompañamientos</div>
                      <p className="text-gray-700 text-sm">{analysis.tips.accompaniments}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {analysis.alternatives && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-l-4 border-red-400">
              <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <span>🔄</span>
                Alternativas si no es ideal
              </h4>
              <p className="text-gray-700 leading-relaxed">{analysis.alternatives}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-red-100">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Star className="h-4 w-4" />
              <span>Análisis generado por Winerim</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PairingAnalysisCard;
