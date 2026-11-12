
import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { QuizArt149 } from '@/components/QuizArt149';

interface QuizIntroProps {
  onStart: () => void;
  returnTo?: string | null;
}

const QuizIntro: React.FC<QuizIntroProps> = ({ onStart, returnTo }) => {
  if (Capacitor.isNativePlatform()) return (
    <section className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6">
      {/* 149: the cover shows what the test is made of: four of its twenty foods, in the same hand as the questions. */}
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">{[1, 11, 2, 16].map(id => <QuizArt149 key={id} id={id} className="aspect-square w-full rounded-2xl" />)}</div>
      <h1 className="mt-6 text-3xl font-bold leading-9 text-stone-950">Test de paladar</h1>
      <p className="mt-3 text-base leading-6 text-stone-700">No hace falta saber de vino. Te preguntamos por 20 sabores que ya conoces (una manzana verde, el café, el picante) y con tus respuestas calculamos qué vinos te pueden gustar.</p>
      <p className="mt-3 rounded-2xl bg-stone-100 px-4 py-3 text-sm leading-5 text-stone-700">Unos 2 minutos · Es un punto de partida: se afina con los vinos que valores.</p>
      <Button type="button" onClick={onStart} className="mt-7 min-h-12 rounded-full bg-red-900 text-base">Comenzar el test</Button>
    </section>
  );
  return (
    <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-8 py-10">
      <div className="flex flex-col items-center mb-4">
        <div className="w-32 h-32 flex items-center justify-center mb-4">
          <img 
            src="/lovable-uploads/b9329c73-68b0-4f4a-96a2-c96545694186.png" 
            alt="Winerim Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold text-white">Matchrim</h1>
        <p className="text-xl text-white/80">by Winerim</p>
        <p className="text-xl text-white/80 mt-2">Descubre tu perfil sensorial de vino</p>
      </div>
      
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg max-w-2xl">
        <h2 className="text-2xl font-semibold text-red-900 mb-4">¿Cómo funciona?</h2>
        {returnTo && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-left text-amber-950">
            Crea tu código ahora y te llevaremos de vuelta al restaurante para filtrar la carta.
          </div>
        )}
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
        Comenzar el test
      </Button>
    </div>
  );
};

export default QuizIntro;
