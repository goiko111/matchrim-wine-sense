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
  origin?: string;
  type?: string;
  price?: string;
  score?: number;
}

export interface ProfileType {
  name: string;
  characteristics: {
    potente: number;
    acidez: number;
    dulce: number;
    tanico: number;
    afrutado: number;
  };
  description: string;
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
  // Encuentra el perfil más cercano para dar una descripción más precisa
  const profileMatches = profileTypes.map(profile => {
    const scoreMatch = calculateCompatibility(result, profile.characteristics);
    return { profile, scoreMatch };
  }).sort((a, b) => b.scoreMatch - a.scoreMatch);

  // Si hay un perfil con alta coincidencia, usa su descripción
  if (profileMatches[0].scoreMatch > 35) {
    return `${profileMatches[0].profile.description} Tu perfil sensorial muestra que te gustan los vinos con estas características. Descubre vinos que resalten estos atributos para una experiencia enológica perfecta para tu paladar.`;
  }

  // Si no hay un perfil claro, usa el método original
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

// Perfiles de vino (de la tabla de perfiles)
export const profileTypes: ProfileType[] = [
  {
    name: "Tintos Potentes",
    characteristics: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 },
    description: "Vinos tintos con mucho cuerpo, intensos en boca y con taninos potentes. Ideales para carnes rojas y platos contundentes."
  },
  {
    name: "Blancos Frescos",
    characteristics: { potente: 2, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 },
    description: "Vinos blancos de acidez vibrante y aromas frescos. Perfectos para mariscos, pescados y aperitivos."
  },
  {
    name: "Vinos Dulces",
    characteristics: { potente: 3, acidez: 4, dulce: 5, tanico: 1, afrutado: 4 },
    description: "Vinos con presencia marcada de dulzor, equilibrados con acidez. Excelentes para postres o como aperitivo."
  },
  {
    name: "Vinos Equilibrados",
    characteristics: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 },
    description: "Vinos versátiles con buena armonía entre sus componentes. Ideales para multitud de ocasiones y maridajes."
  },
  {
    name: "Tintos Afrutados",
    characteristics: { potente: 3, acidez: 4, dulce: 3, tanico: 3, afrutado: 5 },
    description: "Vinos tintos con protagonismo de aromas frutales y frescura en boca. Perfectos para carnes blancas y quesos."
  }
];

// Wine database from the Google Sheet
export const wines: Wine[] = [
  {
    name: "Ramón Bilbao Crianza",
    profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Rioja",
    type: "Tinto",
    price: "€€",
    score: 91
  },
  {
    name: "Matsu El Pícaro",
    profile: { potente: 4, acidez: 3, dulce: 3, tanico: 3, afrutado: 4 },
    origin: "Toro",
    type: "Tinto",
    price: "€",
    score: 90
  },
  {
    name: "Protos Roble",
    profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Ribera del Duero",
    type: "Tinto",
    price: "€€",
    score: 90
  },
  {
    name: "Pago de los Capellanes Crianza",
    profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Ribera del Duero",
    type: "Tinto",
    price: "€€€",
    score: 93
  },
  {
    name: "Viña Ardanza Reserva",
    profile: { potente: 4, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 },
    origin: "Rioja",
    type: "Tinto",
    price: "€€€",
    score: 95
  },
  {
    name: "Marqués de Murrieta Reserva",
    profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Rioja",
    type: "Tinto",
    price: "€€€",
    score: 93
  },
  {
    name: "Muga Reserva",
    profile: { potente: 4, acidez: 4, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Rioja",
    type: "Tinto",
    price: "€€€",
    score: 94
  },
  {
    name: "Emilio Moro",
    profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Ribera del Duero",
    type: "Tinto",
    price: "€€",
    score: 92
  },
  {
    name: "Carmelo Rodero Crianza",
    profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Ribera del Duero",
    type: "Tinto",
    price: "€€",
    score: 92
  },
  {
    name: "Flor de Pingus",
    profile: { potente: 5, acidez: 3, dulce: 3, tanico: 4, afrutado: 3 },
    origin: "Ribera del Duero",
    type: "Tinto",
    price: "€€€€",
    score: 96
  },
  {
    name: "Martín Códax",
    profile: { potente: 2, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rías Baixas",
    type: "Blanco",
    price: "€€",
    score: 90
  },
  {
    name: "Terras Gauda",
    profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rías Baixas",
    type: "Blanco",
    price: "€€",
    score: 91
  },
  {
    name: "Pazo de Señorans",
    profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rías Baixas",
    type: "Blanco",
    price: "€€",
    score: 92
  },
  {
    name: "José Pariente",
    profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rueda",
    type: "Blanco",
    price: "€€",
    score: 90
  },
  {
    name: "Menade",
    profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rueda",
    type: "Blanco",
    price: "€",
    score: 90
  },
  {
    name: "Loess",
    profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rueda",
    type: "Blanco",
    price: "€€",
    score: 91
  },
  {
    name: "Habla del Silencio",
    profile: { potente: 4, acidez: 3, dulce: 3, tanico: 3, afrutado: 4 },
    origin: "Extremadura",
    type: "Tinto",
    price: "€€",
    score: 91
  },
  {
    name: "Enate Chardonnay 234",
    profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Somontano",
    type: "Blanco",
    price: "€€",
    score: 90
  },
  {
    name: "Juan Gil",
    profile: { potente: 5, acidez: 3, dulce: 3, tanico: 4, afrutado: 3 },
    origin: "Jumilla",
    type: "Tinto",
    price: "€€",
    score: 91
  },
  {
    name: "El Transistor",
    profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 },
    origin: "Rueda",
    type: "Blanco",
    price: "€€",
    score: 92
  },
  {
    name: "Dominio de Tares",
    profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 },
    origin: "Bierzo",
    type: "Tinto",
    price: "€€",
    score: 91
  },
  {
    name: "La Montesa",
    profile: { potente: 4, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 },
    origin: "Rioja",
    type: "Tinto",
    price: "€€",
    score: 92
  },
  {
    name: "Abadía Retuerta Selección Especial",
    profile: { potente: 5, acidez: 3, dulce: 3, tanico: 4, afrutado: 3 },
    origin: "Castilla y León",
    type: "Tinto",
    price: "€€€",
    score: 94
  },
  {
    name: "Aalto",
    profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 },
    origin: "Ribera del Duero",
    type: "Tinto",
    price: "€€€",
    score: 94
  }
];

export const getRecommendedWines = (result: QuizResult): string[] => {
  // Calculate compatibility with each wine
  const wineCompatibility = wines.map(wine => {
    const score = calculateCompatibility(result, wine.profile);
    return { wine, score };
  });
  
  // Sort by compatibility score (higher is better)
  wineCompatibility.sort((a, b) => b.score - a.score);
  
  // Return the top 6 wines as formatted strings
  return wineCompatibility.slice(0, 6).map(item => {
    const { wine } = item;
    let priceSymbol = "";
    for (let i = 0; i < wine.price?.length || 0; i++) priceSymbol += "€";
    
    return `${wine.name} (${wine.origin}) - ${wine.type} - ${priceSymbol}`;
  });
};

// Helper function to calculate compatibility score between profiles
export const calculateCompatibility = (profile1: any, profile2: any): number => {
  let score = 0;
  
  // Calculate score based on how closely the profiles match
  score += (5 - Math.abs(profile1.potente - profile2.potente)) * 2;
  score += (5 - Math.abs(profile1.acidez - profile2.acidez)) * 2;
  score += (5 - Math.abs(profile1.dulce - profile2.dulce)) * 2;
  score += (5 - Math.abs(profile1.tanico - profile2.tanico)) * 2;
  score += (5 - Math.abs(profile1.afrutado - profile2.afrutado)) * 2;
  
  return score;
};
