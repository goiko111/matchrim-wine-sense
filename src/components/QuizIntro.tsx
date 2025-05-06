
import React from 'react';
import { Button } from "@/components/ui/button";

interface QuizIntroProps {
  onStart: () => void;
}

const QuizIntro: React.FC<QuizIntroProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-8 py-10">
      <h1 className="text-4xl font-bold text-purple-900">Matchrim</h1>
      <p className="text-xl text-purple-800">Descubre tu perfil sensorial de vino</p>
      
      <div className="bg-white/90 rounded-lg p-6 shadow-lg max-w-2xl">
        <h2 className="text-2xl font-semibold text-purple-800 mb-4">¿Cómo funciona?</h2>
        <p className="mb-4 text-left">
          Responde 18 preguntas sobre tus gustos alimentarios para descubrir tu perfil sensorial 
          y qué tipos de vino pueden gustarte más.
        </p>
        
        <div className="mt-6 bg-purple-50 p-4 rounded-md">
          <h3 className="font-semibold text-purple-700 mb-2">Tu perfil se basará en 5 atributos:</h3>
          <ul className="text-left list-disc ml-5 space-y-1">
            <li><span className="font-medium text-purple-900">Potente:</span> Intensidad y cuerpo del vino</li>
            <li><span className="font-medium text-purple-900">Acidez:</span> Frescura y vivacidad</li>
            <li><span className="font-medium text-purple-900">Dulce:</span> Nivel de dulzor percibido</li>
            <li><span className="font-medium text-purple-900">Tánico:</span> Estructura y astringencia</li>
            <li><span className="font-medium text-purple-900">Afrutado:</span> Expresión de aromas frutales</li>
          </ul>
        </div>
      </div>
      
      <Button 
        onClick={onStart} 
        className="bg-purple-700 hover:bg-purple-800 text-white py-2 px-6 rounded-full text-lg"
      >
        Comenzar el test
      </Button>
    </div>
  );
};

export default QuizIntro;
