export interface Question {
  id: number;
  text: string;
  scores: {
    potente: number;
    acidez: number;
    dulce: number;
    tanico: number;
    afrutado: number;
  };
}

export interface QuizResult {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

export interface Wine {
  name: string;
  profile: {
    potente: number;
    acidez: number;
    dulce: number;
    tanico: number;
    afrutado: number;
  };
}

export const questions: Question[] = [
  {
    id: 1,
    text: "¿Te gusta el pimiento verde?",
    scores: { potente: 1, acidez: 1, dulce: 0, tanico: 0, afrutado: 1 }
  },
  {
    id: 2,
    text: "¿Te gusta el olor a tierra?",
    scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 }
  },
  {
    id: 3,
    text: "¿Te gustan los tomates?",
    scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 1 }
  },
  {
    id: 4,
    text: "¿Te gusta el olor a puro?",
    scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 }
  },
  {
    id: 5,
    text: "¿Te gusta el queso de cabra?",
    scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 1 }
  },
  {
    id: 6,
    text: "¿Te gustan las aceitunas negras?",
    scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 }
  },
  {
    id: 7,
    text: "¿Te gustan los champiñones?",
    scores: { potente: 1, acidez: 0, dulce: 0, tanico: 1, afrutado: 0 }
  },
  {
    id: 8,
    text: "¿Te gustan las pasas?",
    scores: { potente: 0, acidez: 0, dulce: 2, tanico: 0, afrutado: 1 }
  },
  {
    id: 9,
    text: "¿Te gusta el sabor del café solo sin azúcar?",
    scores: { potente: 2, acidez: 0, dulce: 0, tanico: 2, afrutado: 0 }
  },
  {
    id: 10,
    text: "¿Te gustan las almendras?",
    scores: { potente: 1, acidez: 0, dulce: 1, tanico: 1, afrutado: 0 }
  },
  {
    id: 11,
    text: "¿Te gusta la canela?",
    scores: { potente: 1, acidez: 0, dulce: 1, tanico: 1, afrutado: 1 }
  },
  {
    id: 12,
    text: "¿Te gusta el café azucarado?",
    scores: { potente: 0, acidez: 0, dulce: 2, tanico: 0, afrutado: 1 }
  },
  {
    id: 13,
    text: "¿Te gusta la menta?",
    scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 1 }
  },
  {
    id: 14,
    text: "¿Te gusta el plátano?",
    scores: { potente: 0, acidez: 0, dulce: 1, tanico: 0, afrutado: 2 }
  },
  {
    id: 15,
    text: "¿Te gusta el marisco?",
    scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 0 }
  },
  {
    id: 16,
    text: "¿Te gusta el vinagre?",
    scores: { potente: 0, acidez: 2, dulce: 0, tanico: 0, afrutado: 0 }
  },
  {
    id: 17,
    text: "¿Te gusta la mostaza?",
    scores: { potente: 1, acidez: 2, dulce: 0, tanico: 0, afrutado: 0 }
  },
  {
    id: 18,
    text: "¿Te gustan las gominolas?",
    scores: { potente: 0, acidez: 0, dulce: 2, tanico: 0, afrutado: 2 }
  }
];

export const calculateProfile = (answers: { [id: number]: string }): QuizResult => {
  const result = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  let totalPotente = 0;
  let totalAcidez = 0;
  let totalDulce = 0;
  let totalTanico = 0;
  let totalAfrutado = 0;
  
  questions.forEach(question => {
    const answer = answers[question.id];
    const multiplier = answer === "si" ? 1 : answer === "indiferente" ? 0.5 : 0;
    
    totalPotente += question.scores.potente;
    totalAcidez += question.scores.acidez;
    totalDulce += question.scores.dulce;
    totalTanico += question.scores.tanico;
    totalAfrutado += question.scores.afrutado;
    
    result.potente += question.scores.potente * multiplier;
    result.acidez += question.scores.acidez * multiplier;
    result.dulce += question.scores.dulce * multiplier;
    result.tanico += question.scores.tanico * multiplier;
    result.afrutado += question.scores.afrutado * multiplier;
  });
  
  // Normalize to a scale of 1-5
  const normalize = (value: number, total: number) => {
    if (total === 0) return 1;
    return Math.round((value / total) * 4) + 1;
  };
  
  return {
    potente: normalize(result.potente, totalPotente),
    acidez: normalize(result.acidez, totalAcidez),
    dulce: normalize(result.dulce, totalDulce),
    tanico: normalize(result.tanico, totalTanico),
    afrutado: normalize(result.afrutado, totalAfrutado)
  };
};

export const getProfileDescription = (result: QuizResult): string => {
  const profiles = [];
  
  if (result.potente >= 4) profiles.push("vinos con cuerpo e intensidad");
  else if (result.potente <= 2) profiles.push("vinos elegantes y ligeros");

  if (result.acidez >= 4) profiles.push("vinos frescos y vibrantes");
  else if (result.acidez <= 2) profiles.push("vinos suaves y redondos");

  if (result.dulce >= 4) profiles.push("vinos con cierta dulzura");
  else if (result.dulce <= 2) profiles.push("vinos secos");

  if (result.tanico >= 4) profiles.push("tintos estructurados");
  else if (result.tanico <= 2) profiles.push("vinos de tanino suave");

  if (result.afrutado >= 4) profiles.push("vinos expresivos en fruta");
  else if (result.afrutado <= 2) profiles.push("vinos de carácter mineral o especiado");

  if (profiles.length === 0) return "Tienes un paladar equilibrado, disfrutarás de una amplia variedad de estilos de vinos.";

  return `Tu perfil sensorial muestra que te gustan los ${profiles.join(", ")}. Descubre vinos que resalten estas características para una experiencia enológica perfecta para tu paladar.`;
};

export const wines: Wine[] = [
  // Potentes y tánicos
  { name: "Roda I Reserva (Rioja)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 } },
  { name: "Pesus (Ribera del Duero)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 } },
  { name: "Termanthia (Toro)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 } },
  { name: "Aalto PS (Ribera del Duero)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 } },
  { name: "Alión (Ribera del Duero)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 } },
  
  // Acidez alta y potencia media-alta
  { name: "Pazo Señorans Selección Añada (Rías Baixas)", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 } },
  { name: "Do Ferreiro Cepas Vellas (Rías Baixas)", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 } },
  { name: "Fillaboa La Fillaboa 1898 (Rías Baixas)", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 } },
  { name: "Zárate El Palomar (Rías Baixas)", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 } },
  { name: "La Caña Navia (Rías Baixas)", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 } },
  
  // Dulces
  { name: "Tokaji Aszú 6 Puttonyos (Hungría)", profile: { potente: 3, acidez: 4, dulce: 5, tanico: 1, afrutado: 4 } },
  { name: "Château d'Yquem (Sauternes)", profile: { potente: 4, acidez: 4, dulce: 5, tanico: 1, afrutado: 5 } },
  { name: "Dolç de l'Obac (Priorat)", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 2, afrutado: 4 } },
  { name: "Alvear Pedro Ximénez de Añada (Montilla-Moriles)", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 } },
  { name: "Disznókö Tokaji Aszú 5 Puttonyos (Hungría)", profile: { potente: 3, acidez: 4, dulce: 5, tanico: 1, afrutado: 4 } },
  
  // Equilibrados y elegantes
  { name: "Viña Tondonia Reserva (Rioja)", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 } },
  { name: "Dominio de Pingus PSI (Ribera del Duero)", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 } },
  { name: "Remelluri Reserva (Rioja)", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 } },
  { name: "Artadi Pagos Viejos (Rioja)", profile: { potente: 4, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 } },
  { name: "Pintia (Toro)", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 } },

  // Frescos y afrutados
  { name: "La Montesa (Rioja)", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 } },
  { name: "Belondrade y Lurton (Rueda)", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 } },
  { name: "Louro (Valdeorras)", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 4 } },
  { name: "As Sortes (Valdeorras)", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 4 } },
  { name: "Finca Antigua Moscatel (La Mancha)", profile: { potente: 2, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 } },

  // Tánicos y estructurados
  { name: "Vega Sicilia Único (Ribera del Duero)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 } },
  { name: "Flor de Pingus (Ribera del Duero)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 } },
  { name: "Mauro VS (Castilla y León)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 } },
  { name: "Teso La Monja (Toro)", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 } },
  { name: "Viña El Pisón (Rioja)", profile: { potente: 4, acidez: 4, dulce: 2, tanico: 4, afrutado: 3 } }
];

export const getRecommendedWines = (result: QuizResult): string[] => {
  // Define an array to store wines with their compatibility scores
  const winesWithCompatibility = wines.map(wine => {
    // Calculate compatibility between user profile and wine profile
    const score = calculateCompatibility(result, wine.profile);
    return { name: wine.name, score };
  });
  
  // Sort wines by compatibility score (highest first)
  winesWithCompatibility.sort((a, b) => b.score - a.score);
  
  // Return the names of the top 5 wines
  return winesWithCompatibility.slice(0, 5).map(wine => wine.name);
};

// Helper function to calculate compatibility score
const calculateCompatibility = (userProfile: QuizResult, wineProfile: Wine['profile']): number => {
  let score = 0;
  
  // Calculate score based on how closely the profiles match
  score += (5 - Math.abs(userProfile.potente - wineProfile.potente)) * 2;
  score += (5 - Math.abs(userProfile.acidez - wineProfile.acidez)) * 2;
  score += (5 - Math.abs(userProfile.dulce - wineProfile.dulce)) * 2;
  score += (5 - Math.abs(userProfile.tanico - wineProfile.tanico)) * 2;
  score += (5 - Math.abs(userProfile.afrutado - wineProfile.afrutado)) * 2;
  
  return score;
};
