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
  // Prepare all wines with their compatibility scores
  const winesWithCompatibility = wines.map(wine => {
    const score = calculateCompatibility(result, wine.profile);
    return { 
      name: wine.name, 
      score, 
      origin: wine.origin, 
      type: wine.type,
      price: wine.price 
    };
  });
  
  // Sort by compatibility score (highest first)
  winesWithCompatibility.sort((a, b) => b.score - a.score);
  
  // Get the threshold score (70% of the max score)
  const maxScore = winesWithCompatibility[0].score;
  const threshold = maxScore * 0.7;
  
  // Filter wines that are above the threshold (good matches)
  const goodMatches = winesWithCompatibility.filter(wine => wine.score >= threshold);
  
  // If we have too few good matches, add more
  const matchPool = goodMatches.length >= 8 ? goodMatches : winesWithCompatibility.slice(0, Math.max(goodMatches.length, 12));
  
  // Shuffle the good matches to add randomness
  const shuffled = [...matchPool].sort(() => 0.5 - Math.random());
  
  // Select 5 wines from the shuffled list
  const selectedWines = shuffled.slice(0, 5);
  
  // Format the wine names with origin if available
  return selectedWines.map(wine => {
    let text = wine.name;
    
    // Add origin if available
    if (wine.origin) {
      text += ` (${wine.origin})`;
    }
    
    // Add price if available
    if (wine.price) {
      text += ` - ${wine.price}`;
    }
    
    return text;
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
  // VINOS BLANCOS
  { name: "Pazo Señorans", profile: { potente: 2, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "15-20€" },
  { name: "Terras Gauda", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "15-20€" },
  { name: "Mar de Frades", profile: { potente: 2, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "15-20€" },
  { name: "Granbazán Etiqueta Verde", profile: { potente: 2, acidez: 5, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "15-20€" },
  { name: "Santiago Ruiz", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "15-20€" },
  { name: "Martín Códax", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rías Baixas", type: "Blanco", price: "10-15€" },
  { name: "Lagar de Cervera", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 3 }, origin: "Rías Baixas", type: "Blanco", price: "10-15€" },
  
  { name: "Protos Verdejo", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "10-15€" },
  { name: "José Pariente Verdejo", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "10-15€" },
  { name: "Marqués de Riscal Verdejo", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 3 }, origin: "Rueda", type: "Blanco", price: "10-15€" },
  { name: "Menade Verdejo", profile: { potente: 2, acidez: 4, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "10-15€" },
  { name: "Belondrade y Lurton", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 4 }, origin: "Rueda", type: "Blanco", price: "30-40€" },
  
  { name: "Godello Valdeorras", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 3 }, origin: "Valdeorras", type: "Blanco", price: "15-20€" },
  { name: "Louro do Bolo", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 3 }, origin: "Valdeorras", type: "Blanco", price: "15-20€" },
  { name: "As Sortes", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 2, afrutado: 3 }, origin: "Valdeorras", type: "Blanco", price: "30-40€" },
  { name: "Avancia Godello", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 1, afrutado: 3 }, origin: "Valdeorras", type: "Blanco", price: "15-20€" },
  
  { name: "Jean Leon Chardonnay", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 2, afrutado: 3 }, origin: "Penedès", type: "Blanco", price: "15-20€" },
  { name: "Enate Chardonnay 234", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 1, afrutado: 4 }, origin: "Somontano", type: "Blanco", price: "10-15€" },
  { name: "Viña Esmeralda", profile: { potente: 2, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 }, origin: "Catalunya", type: "Blanco", price: "10-15€" },
  { name: "Finca Antigua Moscatel", profile: { potente: 2, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 }, origin: "La Mancha", type: "Blanco", price: "10-15€" },
  
  // VINOS TINTOS
  // Rioja
  { name: "Marqués de Murrieta Reserva", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "20-25€" },
  { name: "Marqués de Riscal Reserva", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "15-20€" },
  { name: "Muga Reserva", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "20-25€" },
  { name: "Viña Ardanza Reserva", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "20-25€" },
  { name: "Ramón Bilbao Crianza", profile: { potente: 3, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "10-15€" },
  { name: "La Montesa", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Rioja", type: "Tinto", price: "15-20€" },
  { name: "Viña Tondonia Reserva", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "30-35€" },
  { name: "Remelluri Reserva", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Rioja", type: "Tinto", price: "20-25€" },
  
  // Ribera del Duero
  { name: "Protos Crianza", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "15-20€" },
  { name: "Matarromera Crianza", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "20-25€" },
  { name: "Emilio Moro", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "20-25€" },
  { name: "Pesquera Crianza", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "20-25€" },
  { name: "Pago de Carraovejas", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "35-40€" },
  { name: "Pago de los Capellanes Crianza", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "25-30€" },
  { name: "Carmelo Rodero Crianza", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "20-25€" },
  { name: "Aalto", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "30-35€" },
  { name: "Hacienda Monasterio", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 3, afrutado: 3 }, origin: "Ribera del Duero", type: "Tinto", price: "30-35€" },
  
  // Toro
  { name: "Pintia", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Toro", type: "Tinto", price: "50-60€" },
  { name: "Numanthia Termes", profile: { potente: 5, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Toro", type: "Tinto", price: "20-25€" },
  
  // Bierzo
  { name: "Pétalos del Bierzo", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Bierzo", type: "Tinto", price: "15-20€" },
  { name: "Las Lamas", profile: { potente: 4, acidez: 4, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Bierzo", type: "Tinto", price: "60-70€" },
  { name: "Dominio de Tares Cepas Viejas", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Bierzo", type: "Tinto", price: "15-20€" },
  
  // Priorat
  { name: "Ferrer Bobet Vinyes Velles", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Priorat", type: "Tinto", price: "30-35€" },
  { name: "Mas d'en Compte", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Priorat", type: "Tinto", price: "25-30€" },
  
  // Montsant
  { name: "Acústic", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Montsant", type: "Tinto", price: "15-20€" },
  
  // Jumilla
  { name: "El Nido", profile: { potente: 5, acidez: 3, dulce: 3, tanico: 5, afrutado: 3 }, origin: "Jumilla", type: "Tinto", price: "60-70€" },
  { name: "Juan Gil 12 Meses", profile: { potente: 4, acidez: 3, dulce: 3, tanico: 4, afrutado: 3 }, origin: "Jumilla", type: "Tinto", price: "15-20€" },
  
  // Ribeira Sacra
  { name: "Dominio do Bibei Lalama", profile: { potente: 3, acidez: 4, dulce: 2, tanico: 3, afrutado: 4 }, origin: "Ribeira Sacra", type: "Tinto", price: "20-25€" },
  
  // Otros
  { name: "Abadía Retuerta Selección Especial", profile: { potente: 4, acidez: 3, dulce: 2, tanico: 4, afrutado: 3 }, origin: "Castilla y León", type: "Tinto", price: "25-30€" },
  
  // VINOS DULCES
  { name: "Pedro Ximénez Tradición", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Jerez", type: "Dulce", price: "25-30€" },
  { name: "Pedro Ximénez Néctar", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Jerez", type: "Dulce", price: "15-20€" },
  { name: "Lustau Pedro Ximénez San Emilio", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Jerez", type: "Dulce", price: "15-20€" },
  { name: "Barbadillo Pedro Ximénez", profile: { potente: 3, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Jerez", type: "Dulce", price: "10-15€" },
  
  { name: "Jorge Ordoñez Nº 1 Selección Especial", profile: { potente: 3, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 }, origin: "Málaga", type: "Dulce", price: "20-25€" },
  { name: "Jorge Ordoñez Nº 2 Victoria", profile: { potente: 3, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 }, origin: "Málaga", type: "Dulce", price: "25-30€" },
  
  { name: "Don PX Gran Reserva", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Montilla-Moriles", type: "Dulce", price: "25-30€" },
  { name: "Alvear Pedro Ximénez de Añada", profile: { potente: 4, acidez: 3, dulce: 5, tanico: 1, afrutado: 4 }, origin: "Montilla-Moriles", type: "Dulce", price: "25-30€" },
  
  { name: "Gewürztraminer Viñas del Vero", profile: { potente: 3, acidez: 3, dulce: 4, tanico: 1, afrutado: 5 }, origin: "Somontano", type: "Dulce", price: "15-20€" },
  { name: "Enate Gewürztraminer", profile: { potente: 2, acidez: 3, dulce: 3, tanico: 1, afrutado: 5 }, origin: "Somontano", type: "Blanco", price: "10-15€" },
  
  { name: "Moscatel Torres", profile: { potente: 3, acidez: 3, dulce: 5, tanico: 1, afrutado: 5 }, origin: "Penedès", type: "Dulce", price: "15-20€" }
];
