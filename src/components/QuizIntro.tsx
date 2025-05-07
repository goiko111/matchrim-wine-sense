
import React from 'react';
import { Button } from "@/components/ui/button";
import { Wine } from 'lucide-react';

interface QuizIntroProps {
  onStart: () => void;
}

const QuizIntro: React.FC<QuizIntroProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-8 py-10">
      <div className="flex flex-col items-center mb-4">
        <div className="w-32 h-32 flex items-center justify-center bg-red-100 rounded-full mb-4">
          <Wine className="h-16 w-16 text-red-700" />
        </div>
        <h1 className="text-4xl font-bold text-white">Winerim</h1>
        <p className="text-xl text-white/80">Descubre tu perfil sensorial de vino</p>
      </div>
      
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-2xl">
        <h2 className="text-2xl font-semibold text-red-900 mb-4">¿Cómo funciona?</h2>
        <p className="mb-4 text-left">
          Responde algunas preguntas sobre tus gustos alimentarios para descubrir tu perfil sensorial 
          y qué tipos de vino pueden gustarte más.
        </p>
        
        <div className="mt-6 bg-red-50 p-4 rounded-md">
          <h3 className="font-semibold text-red-700 mb-2">Tu perfil se basará en 5 atributos:</h3>
          <ul className="text-left list-disc ml-5 space-y-1">
            <li><span className="font-medium text-red-900">Potente:</span> Intensidad y cuerpo del vino</li>
            <li><span className="font-medium text-red-900">Acidez:</span> Frescura y vivacidad</li>
            <li><span className="font-medium text-red-900">Dulce:</span> Nivel de dulzor percibido</li>
            <li><span className="font-medium text-red-900">Tánico:</span> Estructura y astringencia</li>
            <li><span className="font-medium text-red-900">Afrutado:</span> Expresión de aromas frutales</li>
          </ul>
        </div>
      </div>
      
      <Button 
        onClick={onStart} 
        className="bg-red-700 hover:bg-red-800 text-white py-2 px-6 rounded-full text-lg"
      >
        <Wine className="mr-2 h-5 w-5" />
        Comenzar el test
      </Button>
    </div>
  );
};

export default QuizIntro;
