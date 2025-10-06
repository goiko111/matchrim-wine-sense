
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
  // Los 16 estilos de vino Winerim con sus criterios sensoriales
  const winerimStyles = [
    { name: "Burbuja Fresca", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Brut Elegante", criteria: { acidez: 5, afrutado: 2, potente: 3, dulce: 1, tanico: 1 } },
    { name: "Blanco Vital", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Blanco Goloso", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 4, tanico: 1 } },
    { name: "Blanco de Carácter", criteria: { acidez: 3, afrutado: 3, potente: 4, dulce: 2, tanico: 2 } },
    { name: "Rosado Ligero", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Rosado Gastronómico", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 2 } },
    { name: "Tinto Ligero", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 1, tanico: 2 } },
    { name: "Tinto Versátil", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 3 } },
    { name: "Tinto de Estructura", criteria: { acidez: 3, afrutado: 3, potente: 5, dulce: 1, tanico: 5 } },
    { name: "Tinto Goloso", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 3, tanico: 2 } },
    { name: "Dulce Ligero", criteria: { acidez: 3, afrutado: 4, potente: 2, dulce: 4, tanico: 1 } },
    { name: "Dulce Intenso", criteria: { acidez: 2, afrutado: 4, potente: 4, dulce: 5, tanico: 1 } },
    { name: "Oxidativo/Maduro", criteria: { acidez: 2, afrutado: 2, potente: 4, dulce: 3, tanico: 2 } },
    { name: "Experimental", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 3 } },
    { name: "Vino de Terruño", criteria: { acidez: 4, afrutado: 3, potente: 4, dulce: 1, tanico: 4 } }
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

export const generateGrapeRecommendations = (result: any): string[] => {
  // Uvas internacionales ordenadas de más famosas a menos
  const grapeRecommendations = [
    // Uvas muy famosas
    { name: "Chardonnay", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 1 }, fame: 5 },
    { name: "Cabernet Sauvignon", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 }, fame: 5 },
    { name: "Merlot", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 }, fame: 5 },
    { name: "Pinot Noir", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 }, fame: 5 },
    { name: "Sauvignon Blanc", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 }, fame: 5 },
    
    // Uvas famosas
    { name: "Syrah", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 }, fame: 4 },
    { name: "Riesling", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 3, tanico: 1 }, fame: 4 },
    { name: "Tempranillo", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 }, fame: 4 },
    { name: "Malbec", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 }, fame: 4 },
    { name: "Garnacha", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 3, afrutado: 4 }, fame: 4 },
    
    // Uvas conocidas
    { name: "Albariño", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 }, fame: 3 },
    { name: "Sangiovese", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 }, fame: 3 },
    { name: "Nebbiolo", criteria: { potente: 4, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 }, fame: 3 },
    { name: "Gewürztraminer", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 4, tanico: 1 }, fame: 3 },
    { name: "Mencía", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 }, fame: 2 },
    { name: "Godello", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 1 }, fame: 2 }
  ];

  // Calcular puntuación de compatibilidad
  const compatibilityScores = grapeRecommendations.map(grape => {
    let score = 0;
    score += (5 - Math.abs(result.potente - grape.criteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - grape.criteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - grape.criteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - grape.criteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - grape.criteria.afrutado)) * 2;
    
    // Bonus por fama (las más famosas tienen prioridad)
    const fameBonus = grape.fame * 2;
    
    return { name: grape.name, score: score + fameBonus, fame: grape.fame };
  });
  
  // Ordenar por score (incluye compatibilidad + fama)
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  // Devolver top 5
  return compatibilityScores.slice(0, 5).map(grape => grape.name);
};

export const generateRegionRecommendations = (result: any): string[] => {
  // Regiones internacionales diversas
  const regionRecommendations = [
    // Europa
    { name: "Borgoña (Francia)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Burdeos (Francia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Toscana (Italia)", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Rioja (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Ribera del Duero (España)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Rías Baixas (España)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Priorat (España)", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Piemonte (Italia)", criteria: { potente: 4, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Mosel (Alemania)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 3, tanico: 1 } },
    
    // Américas
    { name: "Napa Valley (EE.UU.)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Mendoza (Argentina)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Valle de Maipo (Chile)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    
    // Oceanía
    { name: "Marlborough (Nueva Zelanda)", criteria: { acidez: 5, afrutado: 5, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Barossa Valley (Australia)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } }
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
  
  // Devolver top 5 regiones más compatibles
  return compatibilityScores.slice(0, 5).map(region => region.name);
};
