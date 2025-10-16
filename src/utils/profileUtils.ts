
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
  // Los 16 estilos de vino Winerim con sus criterios sensoriales ajustados
  const winerimStyles = [
    { name: "Burbuja Fresca", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Brut Elegante", criteria: { acidez: 5, afrutado: 2, potente: 3, dulce: 1, tanico: 1 } },
    { name: "Blanco Vital", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Blanco Goloso", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 4, tanico: 1 } },
    { name: "Blanco de Carácter", criteria: { acidez: 3, afrutado: 2, potente: 4, dulce: 2, tanico: 2 } },
    { name: "Rosado Ligero", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Rosado Gastronómico", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 1, tanico: 2 } },
    { name: "Tinto Ligero", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 1, tanico: 2 } },
    { name: "Tinto Versátil", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 3 } },
    { name: "Tinto de Estructura", criteria: { acidez: 3, afrutado: 2, potente: 5, dulce: 1, tanico: 5 } },
    { name: "Tinto Goloso", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 3, tanico: 2 } },
    { name: "Dulce Ligero", criteria: { acidez: 3, afrutado: 4, potente: 2, dulce: 4, tanico: 1 } },
    { name: "Dulce Intenso", criteria: { acidez: 2, afrutado: 4, potente: 4, dulce: 5, tanico: 1 } },
    { name: "Oxidativo/Maduro", criteria: { acidez: 2, afrutado: 2, potente: 4, dulce: 3, tanico: 2 } },
    { name: "Experimental", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 3 } },
    { name: "Vino de Terruño", criteria: { acidez: 4, afrutado: 2, potente: 4, dulce: 1, tanico: 4 } }
  ];

  // Calcular compatibilidad con cada estilo
  const compatibilityScores = winerimStyles.map(style => {
    let score = 0;
    score += (5 - Math.abs(result.potente - style.criteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - style.criteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - style.criteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - style.criteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - style.criteria.afrutado)) * 2;
    
    return { name: style.name, score };
  });
  
  // Ordenar por compatibilidad
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  // Devolver estilos con score superior a 35 (alta compatibilidad), mínimo 1, máximo 3
  const matchingStyles = compatibilityScores.filter(s => s.score > 35);
  return matchingStyles.slice(0, 3).map(style => style.name);
};

export const generateGrapeRecommendations = (result: any, wines: any[]): string[] => {
  if (!wines || wines.length === 0) {
    return [];
  }

  // Extraer todas las uvas únicas de los vinos con sus atributos sensoriales promedio
  const grapeMap = new Map<string, { scores: number[], count: number }>();
  
  wines.forEach(wine => {
    if (!wine.grape_varieties || wine.grape_varieties.length === 0) return;
    
    wine.grape_varieties.forEach((grape: string) => {
      if (!grapeMap.has(grape)) {
        grapeMap.set(grape, { scores: [0, 0, 0, 0, 0], count: 0 });
      }
      const grapeData = grapeMap.get(grape)!;
      grapeData.scores[0] += wine.potencia || 0;
      grapeData.scores[1] += wine.acidez || 0;
      grapeData.scores[2] += wine.dulzura || 0;
      grapeData.scores[3] += wine.taninos || 0;
      grapeData.scores[4] += wine.afrutado || 0;
      grapeData.count++;
    });
  });

  // Calcular compatibilidad para cada uva
  const compatibilityScores: { name: string; score: number }[] = [];
  
  grapeMap.forEach((data, grape) => {
    // Promediar los atributos de todos los vinos de esta uva
    const avgCriteria = {
      potente: Math.round(data.scores[0] / data.count),
      acidez: Math.round(data.scores[1] / data.count),
      dulce: Math.round(data.scores[2] / data.count),
      tanico: Math.round(data.scores[3] / data.count),
      afrutado: Math.round(data.scores[4] / data.count)
    };
    
    // Calcular score de compatibilidad
    let score = 0;
    score += (5 - Math.abs(result.potente - avgCriteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - avgCriteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - avgCriteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - avgCriteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - avgCriteria.afrutado)) * 2;
    
    compatibilityScores.push({ name: grape, score });
  });
  
  // Ordenar por compatibilidad
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  console.log('Grape recommendations for profile:', result);
  console.log('Available grapes:', compatibilityScores.length);
  console.log('Top grapes:', compatibilityScores.slice(0, 8));
  
  // Devolver top 8 (o todas si hay menos)
  return compatibilityScores.slice(0, 8).map(grape => grape.name);
};

export const generateRegionRecommendations = (result: any, wines: any[]): string[] => {
  if (!wines || wines.length === 0) {
    return [];
  }

  // Extraer todas las regiones únicas de los vinos con sus atributos sensoriales promedio
  const regionMap = new Map<string, { scores: number[], count: number }>();
  
  wines.forEach(wine => {
    if (!wine.region) return;
    
    if (!regionMap.has(wine.region)) {
      regionMap.set(wine.region, { scores: [0, 0, 0, 0, 0], count: 0 });
    }
    const regionData = regionMap.get(wine.region)!;
    regionData.scores[0] += wine.potencia || 0;
    regionData.scores[1] += wine.acidez || 0;
    regionData.scores[2] += wine.dulzura || 0;
    regionData.scores[3] += wine.taninos || 0;
    regionData.scores[4] += wine.afrutado || 0;
    regionData.count++;
  });

  // Calcular compatibilidad para cada región
  const compatibilityScores: { name: string; score: number }[] = [];
  
  regionMap.forEach((data, region) => {
    // Promediar los atributos de todos los vinos de esta región
    const avgCriteria = {
      potente: Math.round(data.scores[0] / data.count),
      acidez: Math.round(data.scores[1] / data.count),
      dulce: Math.round(data.scores[2] / data.count),
      tanico: Math.round(data.scores[3] / data.count),
      afrutado: Math.round(data.scores[4] / data.count)
    };
    
    // Calcular score de compatibilidad
    let score = 0;
    score += (5 - Math.abs(result.potente - avgCriteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - avgCriteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - avgCriteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - avgCriteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - avgCriteria.afrutado)) * 2;
    
    compatibilityScores.push({ name: region, score });
  });
  
  // Ordenar por compatibilidad
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  console.log('Region recommendations for profile:', result);
  console.log('Available regions:', compatibilityScores.length);
  console.log('Top regions:', compatibilityScores.slice(0, 8));
  
  // Devolver top 8 (o todas si hay menos)
  return compatibilityScores.slice(0, 8).map(region => region.name);
};
