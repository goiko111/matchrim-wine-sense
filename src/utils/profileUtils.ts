
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

export const generateGrapeRecommendations = (result: any): string[] => {
  // 50 uvas internacionales ordenadas de más famosas a menos
  const grapeRecommendations = [
    // Uvas muy famosas (fame: 5)
    { name: "Chardonnay", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 1 }, fame: 5 },
    { name: "Cabernet Sauvignon", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 }, fame: 5 },
    { name: "Merlot", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 }, fame: 5 },
    { name: "Pinot Noir", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 }, fame: 5 },
    { name: "Sauvignon Blanc", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 }, fame: 5 },
    { name: "Syrah", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 }, fame: 5 },
    { name: "Riesling", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 3, tanico: 1 }, fame: 5 },
    
    // Uvas famosas (fame: 4)
    { name: "Tempranillo", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 }, fame: 4 },
    { name: "Malbec", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 }, fame: 4 },
    { name: "Garnacha", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 3, afrutado: 4 }, fame: 4 },
    { name: "Pinot Grigio", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 1, tanico: 1 }, fame: 4 },
    { name: "Zinfandel", criteria: { potente: 5, tanico: 3, acidez: 3, dulce: 3, afrutado: 5 }, fame: 4 },
    { name: "Sangiovese", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 }, fame: 4 },
    { name: "Nebbiolo", criteria: { potente: 4, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 }, fame: 4 },
    { name: "Gewürztraminer", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 4, tanico: 1 }, fame: 4 },
    
    // Uvas conocidas (fame: 3)
    { name: "Albariño", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 }, fame: 3 },
    { name: "Mencía", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 }, fame: 3 },
    { name: "Godello", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 1 }, fame: 3 },
    { name: "Verdejo", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 1 }, fame: 3 },
    { name: "Monastrell", criteria: { potente: 5, tanico: 4, acidez: 2, dulce: 2, afrutado: 4 }, fame: 3 },
    { name: "Viognier", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 3, tanico: 1 }, fame: 3 },
    { name: "Grüner Veltliner", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 }, fame: 3 },
    { name: "Carmenère", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 }, fame: 3 },
    { name: "Petit Verdot", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 2 }, fame: 3 },
    { name: "Touriga Nacional", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 }, fame: 3 },
    { name: "Chenin Blanc", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 2, tanico: 1 }, fame: 3 },
    { name: "Mourvèdre", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 }, fame: 3 },
    { name: "Carignan", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 }, fame: 3 },
    { name: "Grenache Blanc", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 2, tanico: 1 }, fame: 3 },
    { name: "Vermentino", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 1, tanico: 1 }, fame: 3 },
    
    // Uvas menos conocidas pero importantes (fame: 2)
    { name: "Petit Manseng", criteria: { acidez: 5, afrutado: 4, potente: 3, dulce: 4, tanico: 1 }, fame: 2 },
    { name: "Graciano", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 2 }, fame: 2 },
    { name: "Bobal", criteria: { potente: 4, tanico: 3, acidez: 4, dulce: 1, afrutado: 3 }, fame: 2 },
    { name: "Prieto Picudo", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 4 }, fame: 2 },
    { name: "Garnacha Tintorera", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 }, fame: 2 },
    { name: "Callet", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 3 }, fame: 2 },
    { name: "Manto Negro", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 }, fame: 2 },
    { name: "Tinta de Toro", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 }, fame: 2 },
    { name: "Treixadura", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 2, tanico: 1 }, fame: 2 },
    { name: "Macabeo", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 1, tanico: 1 }, fame: 2 },
    { name: "Parellada", criteria: { acidez: 5, afrutado: 2, potente: 1, dulce: 1, tanico: 1 }, fame: 2 },
    { name: "Xarel·lo", criteria: { acidez: 5, afrutado: 2, potente: 2, dulce: 1, tanico: 1 }, fame: 2 },
    { name: "Moscatel", criteria: { acidez: 3, afrutado: 5, potente: 2, dulce: 5, tanico: 1 }, fame: 2 },
    { name: "Pedro Ximénez", criteria: { acidez: 2, afrutado: 4, potente: 3, dulce: 5, tanico: 1 }, fame: 2 },
    { name: "Palomino", criteria: { acidez: 3, afrutado: 2, potente: 3, dulce: 2, tanico: 1 }, fame: 2 },
    { name: "Airén", criteria: { acidez: 3, afrutado: 2, potente: 2, dulce: 1, tanico: 1 }, fame: 2 },
    { name: "Malvasía", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 4, tanico: 1 }, fame: 2 },
    { name: "Cariñena", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 }, fame: 2 },
    { name: "Juan García", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 3 }, fame: 2 },
    { name: "Rufete", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 }, fame: 2 }
  ];

  // Calcular puntuación de compatibilidad
  const compatibilityScores = grapeRecommendations.map(grape => {
    let score = 0;
    score += (5 - Math.abs(result.potente - grape.criteria.potente)) * 2;
    score += (5 - Math.abs(result.acidez - grape.criteria.acidez)) * 2;
    score += (5 - Math.abs(result.dulce - grape.criteria.dulce)) * 2;
    score += (5 - Math.abs(result.tanico - grape.criteria.tanico)) * 2;
    score += (5 - Math.abs(result.afrutado - grape.criteria.afrutado)) * 2;
    
    // Bonus por fama reducido para dar más peso a compatibilidad
    const fameBonus = grape.fame * 1;
    
    return { name: grape.name, score: score + fameBonus, fame: grape.fame };
  });
  
  // Ordenar por score (incluye compatibilidad + fama)
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  console.log('Grape recommendations for profile:', result);
  console.log('Top 5 grapes:', compatibilityScores.slice(0, 5));
  
  // Devolver top 5
  return compatibilityScores.slice(0, 5).map(grape => grape.name);
};

export const generateRegionRecommendations = (result: any): string[] => {
  // 120 regiones vinícolas del mundo organizadas por país
  const regionRecommendations = [
    // ESPAÑA (30 regiones)
    { name: "Rioja (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 }, country: "España" },
    { name: "Ribera del Duero (España)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Rías Baixas (España)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Priorat (España)", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Rueda (España)", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Bierzo (España)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Jerez (España)", criteria: { acidez: 2, afrutado: 2, potente: 4, dulce: 3, tanico: 2 } },
    { name: "Penedès (España)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Toro (España)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Somontano (España)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "Montsant (España)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Navarra (España)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Valdeorras (España)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Ronda (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Jumilla (España)", criteria: { potente: 5, tanico: 4, acidez: 2, dulce: 2, afrutado: 4 } },
    { name: "Yecla (España)", criteria: { potente: 5, tanico: 4, acidez: 2, dulce: 2, afrutado: 4 } },
    { name: "Alicante (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 3, afrutado: 4 } },
    { name: "Valencia (España)", criteria: { potente: 3, tanico: 2, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Utiel-Requena (España)", criteria: { potente: 4, tanico: 3, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Cariñena (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Campo de Borja (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 3, afrutado: 4 } },
    { name: "Calatayud (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Cigales (España)", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 2 } },
    { name: "Arribes (España)", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Sierra de Málaga (España)", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 3, tanico: 2 } },
    { name: "Méntrida (España)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Vinos de Madrid (España)", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Mallorca (España)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "Canarias (España)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 2 } },
    { name: "Monterrei (España)", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 2, tanico: 1 } },
    
    // FRANCIA (25 regiones)
    { name: "Borgoña (Francia)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Burdeos (Francia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Valle del Ródano (Francia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Champagne (Francia)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Valle del Loira (Francia)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Alsacia (Francia)", criteria: { acidez: 4, afrutado: 4, potente: 3, dulce: 3, tanico: 1 } },
    { name: "Languedoc (Francia)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Provenza (Francia)", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 1, tanico: 2 } },
    { name: "Beaujolais (Francia)", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 1, afrutado: 5 } },
    { name: "Chablis (Francia)", criteria: { acidez: 5, afrutado: 2, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Côte de Nuits (Francia)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Côte de Beaune (Francia)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 1, tanico: 2 } },
    { name: "Châteauneuf-du-Pape (Francia)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Côte-Rôtie (Francia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Hermitage (Francia)", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Saint-Émilion (Francia)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Pauillac (Francia)", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Margaux (Francia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Sancerre (Francia)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Pouilly-Fumé (Francia)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Muscadet (Francia)", criteria: { acidez: 5, afrutado: 2, potente: 1, dulce: 1, tanico: 1 } },
    { name: "Chinon (Francia)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Bandol (Francia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Jurançon (Francia)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 4, tanico: 1 } },
    { name: "Cahors (Francia)", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 1, afrutado: 2 } },
    
    // ITALIA (20 regiones)
    { name: "Toscana (Italia)", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Piemonte (Italia)", criteria: { potente: 4, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Véneto (Italia)", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 2 } },
    { name: "Sicilia (Italia)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Barolo (Italia)", criteria: { potente: 5, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Barbaresco (Italia)", criteria: { potente: 4, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Chianti (Italia)", criteria: { potente: 3, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Brunello di Montalcino (Italia)", criteria: { potente: 5, tanico: 5, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Amarone (Italia)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 4 } },
    { name: "Valpolicella (Italia)", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Soave (Italia)", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Franciacorta (Italia)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Bolgheri (Italia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Etna (Italia)", criteria: { potente: 3, tanico: 3, acidez: 5, dulce: 1, afrutado: 3 } },
    { name: "Puglia (Italia)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Abruzzo (Italia)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Campania (Italia)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 2 } },
    { name: "Umbria (Italia)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Trentino-Alto Adige (Italia)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Friuli (Italia)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 1, tanico: 1 } },
    
    // PORTUGAL (8 regiones)
    { name: "Douro (Portugal)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Alentejo (Portugal)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Dão (Portugal)", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Vinho Verde (Portugal)", criteria: { acidez: 5, afrutado: 4, potente: 1, dulce: 1, tanico: 1 } },
    { name: "Bairrada (Portugal)", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Lisboa (Portugal)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "Madeira (Portugal)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 4, tanico: 2 } },
    { name: "Oporto (Portugal)", criteria: { potente: 5, tanico: 3, acidez: 3, dulce: 5, afrutado: 4 } },
    
    // ALEMANIA Y AUSTRIA (8 regiones)
    { name: "Mosel (Alemania)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 3, tanico: 1 } },
    { name: "Rheingau (Alemania)", criteria: { acidez: 5, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Pfalz (Alemania)", criteria: { acidez: 4, afrutado: 4, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Baden (Alemania)", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 1, tanico: 2 } },
    { name: "Wachau (Austria)", criteria: { acidez: 5, afrutado: 3, potente: 3, dulce: 1, tanico: 1 } },
    { name: "Burgenland (Austria)", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 4, tanico: 1 } },
    { name: "Kremstal (Austria)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Kamptal (Austria)", criteria: { acidez: 5, afrutado: 3, potente: 3, dulce: 1, tanico: 1 } },
    
    // ESTADOS UNIDOS (10 regiones)
    { name: "Napa Valley (EE.UU.)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Sonoma (EE.UU.)", criteria: { potente: 4, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Paso Robles (EE.UU.)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Santa Barbara (EE.UU.)", criteria: { potente: 3, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Willamette Valley (EE.UU.)", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Columbia Valley (EE.UU.)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Finger Lakes (EE.UU.)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Russian River Valley (EE.UU.)", criteria: { potente: 3, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Dry Creek Valley (EE.UU.)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Anderson Valley (EE.UU.)", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    
    // SUDAMÉRICA (10 regiones)
    { name: "Mendoza (Argentina)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Salta (Argentina)", criteria: { potente: 4, tanico: 3, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "Patagonia (Argentina)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Valle de Maipo (Chile)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Valle de Colchagua (Chile)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Valle de Casablanca (Chile)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Valle del Aconcagua (Chile)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Valle del Elqui (Chile)", criteria: { acidez: 4, afrutado: 4, potente: 3, dulce: 2, tanico: 2 } },
    { name: "Valle de Uco (Argentina)", criteria: { potente: 4, tanico: 4, acidez: 4, dulce: 1, afrutado: 3 } },
    { name: "Cafayate (Argentina)", criteria: { potente: 4, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    
    // OCEANÍA (6 regiones)
    { name: "Marlborough (Nueva Zelanda)", criteria: { acidez: 5, afrutado: 5, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Central Otago (Nueva Zelanda)", criteria: { potente: 3, tanico: 2, acidez: 4, dulce: 1, afrutado: 4 } },
    { name: "Hawke's Bay (Nueva Zelanda)", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Barossa Valley (Australia)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Margaret River (Australia)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Yarra Valley (Australia)", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 1, afrutado: 4 } },
    
    // SUDÁFRICA (3 regiones)
    { name: "Stellenbosch (Sudáfrica)", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 1, afrutado: 3 } },
    { name: "Constantia (Sudáfrica)", criteria: { acidez: 4, afrutado: 4, potente: 3, dulce: 2, tanico: 2 } },
    { name: "Swartland (Sudáfrica)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 4 } }
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
  
  console.log('Region recommendations for profile:', result);
  console.log('Top 5 regions:', compatibilityScores.slice(0, 5));
  
  // Devolver top 5 regiones más compatibles
  return compatibilityScores.slice(0, 5).map(region => region.name);
};
