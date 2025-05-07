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

export const getRecommendedWines = (result: QuizResult): string[] => {
  // Find what profile type the user matches closest with
  const userProfileMatch = profileTypes.map(profile => {
    return {
      profileType: profile.name,
      score: calculateCompatibility(result, profile.characteristics)
    };
  }).sort((a, b) => b.score - a.score)[0];
  
  // Prepare a selection of wines with their compatibility scores
  const winesWithCompatibility = wines.map(wine => {
    const score = calculateCompatibility(result, wine.profile);
    return { name: wine.name, score, origin: wine.origin, type: wine.type };
  });
  
  // Sort by compatibility score
  winesWithCompatibility.sort((a, b) => b.score - a.score);
  
  // Get top 20 most compatible wines
  const topWines = winesWithCompatibility.slice(0, 20);
  
  // Randomly select 5 wines from the top 20 to ensure variety
  const shuffled = [...topWines].sort(() => 0.5 - Math.random());
  
  // Return the selected wines' names
  return shuffled.slice(0, 5).map(wine => {
    if (wine.origin) {
      return `${wine.name} (${wine.origin})`;
    }
    return wine.name;
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

export const wines: Wine[] = [
  // Potentes y tánicos
  { name: "Aalto PS", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "80-100€", score: 95 },
  { name: "Termanthia", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 }, origin: "Toro", type: "Tinto", price: "150-200€", score: 96 },
  { name: "Vega Sicilia Único", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "300-400€", score: 98 },
  { name: "Pintia", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Toro", type: "Tinto", price: "50-70€", score: 93 },
  { name: "Alión", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "60-80€", score: 94 },
  { name: "Pago de Carraovejas El Anejón", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "80-100€", score: 95 },
  { name: "Mauro VS", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 }, origin: "Castilla y León", type: "Tinto", price: "70-90€", score: 94 },
  { name: "Pago de los Capellanes Parcela El Nogal", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "50-70€", score: 92 },
  { name: "Numanthia", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 5, afrutado: 3 }, origin: "Toro", type: "Tinto", price: "40-60€", score: 91 },
  { name: "Alto Moncayo Aquilón", profile: { potente: 5, acidez: 3, dulce: 3, tanico: 5, afrutado: 3 }, origin: "Campo de Borja", type: "Tinto", price: "80-100€", score: 93 },
  
  // Acidez alta - Blancos frescos
  { name: "Pazo Señorans Selección de Añada", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "30-40€", score: 93 },
  { name: "Do Ferreiro Cepas Vellas", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "40-50€", score: 94 },
  { name: "Fillaboa La Fillaboa 1898", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "25-35€", score: 92 },
  { name: "Mar de Frades Finca Valiñas", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "20-30€", score: 91 },
  { name: "Terras Gauda O Rosal", profile: { potente: 2, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "15-25€", score: 90 },
  { name: "Zárate El Palomar", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "35-45€", score: 93 },
  { name: "Godeval Godello Cepas Vellas", profile: { potente: 3, acidez: 5, dulce: 2, tanico: 1, afrutado: 3 }, origin: "Valdeorras", type: "Blanco", price: "20-30€", score: 92 },
  { name: "As Sortes", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 4 }, origin: "Valdeorras", type: "Blanco", price: "30-40€", score: 93 },
  { name: "Belondrade y Lurton", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "30-40€", score: 93 },
  { name: "José Pariente Fermentado en Barrica", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "15-25€", score: 92 },
  
  // Dulces
  { name: "Tokaji Aszú 6 Puttonyos", profile: { potente: 3, acidez: 4, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Hungría", type: "Dulce", price: "60-80€", score: 96 },
  { name: "Château d'Yquem", profile: { potente: 4, acidez: 4, dulce: 5, tanico: 1, afrutado: 5 }, origin: "Sauternes", type: "Dulce", price: "300-400€", score: 99 },
  { name: "Alvear Pedro Ximénez de Añada", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Montilla-Moriles", type: "Dulce", price: "25-35€", score: 95 },
  { name: "Niepoort Colheita", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 2, afrutado: 4 }, origin: "Oporto", type: "Dulce", price: "40-60€", score: 94 },
  { name: "Lustau Pedro Ximénez San Emilio", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Jerez", type: "Dulce", price: "15-25€", score: 93 },
  { name: "Disznókö Tokaji Aszú 5 Puttonyos", profile: { potente: 3, acidez: 4, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Hungría", type: "Dulce", price: "40-60€", score: 94 },
  { name: "Gewürztraminer Vendimia Tardía Gramona", profile: { potente: 3, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 }, origin: "Penedès", type: "Dulce", price: "20-30€", score: 92 },
  { name: "Dolç de l'Obac", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 2, afrutado: 4 }, origin: "Priorat", type: "Dulce", price: "30-40€", score: 93 },
  { name: "Casta Diva Recondita Armonia", profile: { potente: 3, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 }, origin: "Alicante", type: "Dulce", price: "25-35€", score: 92 },
  { name: "Don PX Gran Reserva", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Montilla-Moriles", type: "Dulce", price: "30-40€", score: 94 },
  
  // Equilibrados y elegantes
  { name: "Viña Tondonia Reserva", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "30-40€", score: 94 },
  { name: "Remelluri Reserva", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "25-35€", score: 93 },
  { name: "Artadi Pagos Viejos", profile: { potente: 4, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "80-100€", score: 95 },
  { name: "Dominio de Pingus PSI", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "30-40€", score: 92 },
  { name: "Hacienda Monasterio", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "30-40€", score: 92 },
  { name: "Emilio Moro Malleolus", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "30-40€", score: 92 },
  { name: "Marqués de Murrieta Capellanía", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 2, afrutado: 3 }, origin: "Rioja", type: "Blanco", price: "25-35€", score: 93 },
  { name: "Algueira Pizarra", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Ribeira Sacra", type: "Tinto", price: "20-30€", score: 93 },
  { name: "Gaba do Xil Mencía", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Valdeorras", type: "Tinto", price: "15-20€", score: 91 },
  { name: "Petalos del Bierzo", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Bierzo", type: "Tinto", price: "15-20€", score: 92 },

  // Frescos y afrutados
  { name: "La Montesa", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Rioja", type: "Tinto", price: "15-20€", score: 91 },
  { name: "Louro", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 4 }, origin: "Valdeorras", type: "Blanco", price: "15-25€", score: 92 },
  { name: "Finca Antiga Moscatel", profile: { potente: 2, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 }, origin: "La Mancha", type: "Blanco", price: "10-15€", score: 90 },
  { name: "Frontonio Microcósmico Garnacha", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 5 }, origin: "Valdejalón", type: "Tinto", price: "15-25€", score: 92 },
  { name: "Enate Gewürztraminer", profile: { potente: 2, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 }, origin: "Somontano", type: "Blanco", price: "10-15€", score: 90 },
  { name: "Habla del Silencio", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Extremadura", type: "Tinto", price: "10-15€", score: 90 },
  { name: "Martín Códax Albariño", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "10-15€", score: 90 },
  { name: "Honoro Vera Garnacha", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Calatayud", type: "Tinto", price: "5-10€", score: 89 },
  { name: "Protos Verdejo", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "10-15€", score: 90 },
  { name: "Marimar Estate La Masía Pinot Noir", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 5 }, origin: "California", type: "Tinto", price: "30-40€", score: 93 }
];
