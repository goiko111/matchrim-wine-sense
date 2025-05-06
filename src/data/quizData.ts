
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

export const getRecommendedWines = (result: QuizResult): string[] => {
  const recommendations = [];
  
  // Alta potencia y tánico
  if (result.potente >= 4 && result.tanico >= 4) {
    recommendations.push("Ribera del Duero Reserva");
  }
  
  // Alta acidez y afrutado
  if (result.acidez >= 4 && result.afrutado >= 4) {
    recommendations.push("Albariño de Rías Baixas");
  }
  
  // Alto dulce y afrutado
  if (result.dulce >= 4 && result.afrutado >= 4) {
    recommendations.push("Moscatel de Valencia");
  }
  
  // Equilibrio entre potencia y acidez
  if (result.potente >= 3 && result.acidez >= 3 && result.tanico >= 3) {
    recommendations.push("Rioja Crianza");
  }
  
  // Acidez alta, potencia baja
  if (result.acidez >= 4 && result.potente <= 2) {
    recommendations.push("Txakoli del País Vasco");
  }
  
  // Afrutado alto, tanino bajo
  if (result.afrutado >= 4 && result.tanico <= 2) {
    recommendations.push("Garnacha joven de Campo de Borja");
  }
  
  // Si no hay match específico o para completar
  if (recommendations.length < 3) {
    const remainingNeeded = 3 - recommendations.length;
    const generalOptions = [
      "Verdejo de Rueda",
      "Mencía de Bierzo",
      "Cava Brut Nature",
      "Monastrell de Jumilla",
      "Godello de Valdeorras"
    ];
    
    for (let i = 0; i < remainingNeeded && i < generalOptions.length; i++) {
      recommendations.push(generalOptions[i]);
    }
  }
  
  return recommendations.slice(0, 3);
};
