
import { QuizResult } from '@/data/quizData';

// Función para generar un hash simple a partir de un string
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Función para generar índices consistentes basados en el perfil
const getConsistentIndex = (result: any, seed: string, max: number): number => {
  const profileString = `${result.potente}-${result.acidez}-${result.dulce}-${result.tanico}-${result.afrutado}-${seed}`;
  return simpleHash(profileString) % max;
};

// Función para mezclar array de forma consistente
const consistentShuffle = <T>(array: T[], seed: string): T[] => {
  const newArray = [...array];
  const hash = simpleHash(seed);
  
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = (hash + i) % (i + 1);
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const generateMatchrimName = (result: any): string => {
  const attributes = [
    { name: "Potente", value: result.potente },
    { name: "Acidez", value: result.acidez },
    { name: "Dulce", value: result.dulce },
    { name: "Tánico", value: result.tanico },
    { name: "Afrutado", value: result.afrutado }
  ];
  
  attributes.sort((a, b) => b.value - a.value);
  
  const firstNames: {[key: string]: string[]} = {
    "Potente": ["Garnacha", "Tempranillo", "Monastrell", "Malbec"],
    "Acidez": ["Albariño", "Godello", "Riesling", "Sauvignon"],
    "Dulce": ["Moscatel", "Pedro", "Malvasía", "Gewürztraminer"],
    "Tánico": ["Cabernet", "Syrah", "Mencía", "Nebbiolo"],
    "Afrutado": ["Merlot", "Pinot", "Verdejo", "Chardonnay"]
  };
  
  const lastNames: {[key: string]: string[]} = {
    "Potente": ["Roble", "Bravo", "Intenso", "Solar"],
    "Acidez": ["Fresco", "Vibrante", "Atlántico", "Luz"],
    "Dulce": ["Miel", "Ámbar", "Terciopelo", "Dorado"],
    "Tánico": ["Tierra", "Especia", "Fuego", "Noble"],
    "Afrutado": ["Jardín", "Aroma", "Primavera", "Velo"]
  };
  
  const firstNameIndex = getConsistentIndex(result, 'first', firstNames[attributes[0].name].length);
  const lastNameIndex = getConsistentIndex(result, 'last', lastNames[attributes[1].name].length);
  
  const firstName = firstNames[attributes[0].name][firstNameIndex];
  const lastName = lastNames[attributes[1].name][lastNameIndex];
  
  return `${firstName} ${lastName}`;
};

export const generateWineStyles = (result: any): string[] => {
  const styleRecommendations = [
    { name: "Vinos blancos frescos y ligeros", criteria: { acidez: 4, afrutado: 3, potente: 0, dulce: 0, tanico: 0 } },
    { name: "Vinos blancos aromáticos", criteria: { acidez: 3, afrutado: 4, potente: 0, dulce: 0, tanico: 0 } },
    { name: "Vinos blancos con volumen", criteria: { acidez: 2, potente: 3, dulce: 0, tanico: 0, afrutado: 3 } },
    { name: "Vinos tintos ligeros", criteria: { potente: 2, tanico: 2, acidez: 3, dulce: 0, afrutado: 4 } },
    { name: "Vinos tintos con cuerpo medio", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 0, afrutado: 3 } },
    { name: "Vinos tintos potentes", criteria: { potente: 4, tanico: 4, acidez: 2, dulce: 0, afrutado: 3 } }
  ];

  const compatibilityScores = styleRecommendations.map(style => {
    let score = 0;
    let relevantFactors = 0;
    
    Object.keys(style.criteria).forEach(factor => {
      if (style.criteria[factor] > 0) {
        const key = factor as keyof typeof result;
        const factorWeight = style.criteria[factor];
        const similarity = 5 - Math.abs(result[key] - factorWeight);
        score += similarity * factorWeight;
        relevantFactors += factorWeight;
      }
    });
    
    return { name: style.name, score: relevantFactors > 0 ? score / relevantFactors : 0 };
  });
  
  compatibilityScores.sort((a, b) => b.score - a.score);
  return compatibilityScores.slice(0, 3).map(style => style.name);
};

export const generateGrapeRecommendations = (result: any): string[] => {
  const grapeRecommendations = [
    { name: "Albariño", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Tempranillo", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Garnacha", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 3, afrutado: 4 } },
    { name: "Syrah", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Monastrell", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Garnacha Blanca", criteria: { acidez: 3, afrutado: 3, potente: 4, dulce: 2, tanico: 2 } },
    { name: "Mencía", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } }
  ];

  const compatibilityScores = grapeRecommendations.map(grape => {
    let score = 0;
    score += (5 - Math.abs(result.potente - grape.criteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - grape.criteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - grape.criteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - grape.criteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - grape.criteria.afrutado)) * 2;
    
    return { name: grape.name, score };
  });
  
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  // Usar selección consistente en lugar de aleatoria
  const topGrapes = compatibilityScores.slice(0, Math.ceil(compatibilityScores.length * 0.4));
  const profileSeed = `${result.potente}-${result.acidez}-${result.dulce}-${result.tanico}-${result.afrutado}`;
  const shuffled = consistentShuffle(topGrapes, profileSeed);
  
  return shuffled.slice(0, 6).map(grape => grape.name);
};

export const generateRegionRecommendations = (result: any): string[] => {
  const regionRecommendations = [
    { name: "Jumilla", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Ribera Sacra", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Toro", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Penedès", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Navarra", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Ribera del Duero", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } }
  ];

  const compatibilityScores = regionRecommendations.map(region => {
    let score = 0;
    score += (5 - Math.abs(result.potente - region.criteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - region.criteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - region.criteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - region.criteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - region.criteria.afrutado)) * 2;
    
    return { name: region.name, score };
  });
  
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  // Usar selección consistente en lugar de aleatoria
  const topRegions = compatibilityScores.slice(0, Math.ceil(compatibilityScores.length * 0.4));
  const profileSeed = `${result.potente}-${result.acidez}-${result.dulce}-${result.tanico}-${result.afrutado}`;
  const shuffled = consistentShuffle(topRegions, profileSeed);
  
  const selectedRegions = new Set<string>();
  for (const region of shuffled) {
    selectedRegions.add(region.name);
    if (selectedRegions.size >= 6) break;
  }
  
  return Array.from(selectedRegions);
};
