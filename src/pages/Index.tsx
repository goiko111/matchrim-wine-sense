
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '../components/Header';
import { 
  Wine, 
  Brain, 
  Users, 
  Target, 
  Radar, 
  MapPin, 
  Smartphone, 
  Heart,
  ChevronRight,
  Palette,
  Calculator,
  User,
  Share2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const wineStyles = [
    { name: "Tinto Profundo", color: "bg-red-900", description: "Intenso y complejo" },
    { name: "Blanco Vital", color: "bg-yellow-300", description: "Fresco y vibrante" },
    { name: "Rosado Ligero", color: "bg-rose-300", description: "Delicado y refrescante" },
    { name: "Espumoso Delicado", color: "bg-blue-200", description: "Elegante y efervescente" },
    { name: "Tinto Suave", color: "bg-red-600", description: "Equilibrado y sedoso" },
    { name: "Blanco Cremoso", color: "bg-amber-200", description: "Rico y texturado" }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen winerim-bg text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 flex flex-col justify-center min-h-screen">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              Tu paladar tiene un <span className="text-accent">estilo propio.</span>
            </h1>
            <p className="text-2xl md:text-3xl mb-6 font-medium">
              Descúbrelo con Matchrim.
            </p>
            <p className="text-xl md:text-2xl mb-12 opacity-90 leading-relaxed max-w-4xl mx-auto">
              Haz el test sensorial que traduce tus gustos personales en recomendaciones de vino precisas, memorables y 100% tú.
            </p>
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-12 py-6 text-xl rounded-2xl shadow-elegant transform hover:scale-105 transition-smooth"
              onClick={() => navigate('/registration')}
            >
              Descubre tu Matchrim
              <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
          
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ¿QUÉ ES MATCHRIM? */}
      <section className="py-20 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-primary-light rounded-2xl p-4 mr-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900">¿Qué es Matchrim?</h2>
              </div>
              
              <p className="text-2xl text-primary mb-8 leading-relaxed font-semibold">
                Descubre tu perfil sensorial. Explora el vino como nunca antes.
              </p>
              
              <p className="text-lg text-gray-700 mb-12 leading-relaxed max-w-4xl mx-auto">
                Matchrim es el primer test sensorial que traduce tus gustos personales en un perfil de cata único y memorable. 
                En menos de 1 minuto, sabrás si eres un perfil <strong className="text-primary">"Garnacha Terroir"</strong> o 
                <strong className="text-primary">"Riesling Bruma"</strong>, y obtendrás recomendaciones precisas de vinos, regiones, estilos y uvas que encajan contigo.
              </p>
            </div>

            {/* Diagrama visual del proceso */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <Card className="p-6 text-center shadow-elegant rounded-2xl">
                <div className="bg-primary-light rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tus Gustos</h3>
                <p className="text-sm text-gray-600">Preferences personales</p>
              </Card>

              <div className="flex items-center justify-center">
                <ChevronRight className="h-8 w-8 text-primary" />
              </div>

              <Card className="p-6 text-center shadow-elegant rounded-2xl">
                <div className="bg-primary-light rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Algoritmo</h3>
                <p className="text-sm text-gray-600">Análisis sensorial</p>
              </Card>

              <div className="flex items-center justify-center">
                <ChevronRight className="h-8 w-8 text-primary" />
              </div>

              <Card className="p-6 text-center shadow-elegant rounded-2xl">
                <div className="bg-primary-light rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Wine className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tu Vino</h3>
                <p className="text-sm text-gray-600">Recomendaciones exactas</p>
              </Card>
            </div>

            {/* Ejemplos de perfiles */}
            <div className="text-center mb-12">
              <p className="text-lg text-gray-700 mb-6">Algunos ejemplos de perfiles Matchrim:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="secondary" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">Riesling Bruma</Badge>
                <Badge variant="secondary" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">Cabernet Coral</Badge>
                <Badge variant="secondary" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">Garnacha Terroir</Badge>
                <Badge variant="secondary" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">Albariño Costa</Badge>
                <Badge variant="secondary" className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">Tempranillo Bosque</Badge>
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary text-primary hover:bg-primary-light rounded-2xl px-8 py-4"
                onClick={() => navigate('/registration')}
              >
                Descubre tu perfil único
                <Target className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TU PERFIL SENSITIVO */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Tu Perfil Sensitivo: un nombre, una identidad
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
                Tu perfil no es solo un nombre bonito. Es el reflejo de tus gustos sensoriales: 
                potencia, acidez, dulzura, tanicidad, fruta. Descubre tu estilo, tus vinos ideales 
                y tu manera de vivir el vino.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
              <Card className="p-8 shadow-elegant rounded-2xl">
                <CardHeader className="text-center">
                  <div className="bg-primary-light rounded-2xl p-3 w-16 h-16 mx-auto mb-4">
                    <Radar className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl text-primary">Tu Radar Sensorial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Potencia', 'Acidez', 'Dulzura', 'Tanicidad', 'Fruta'].map((attribute, index) => (
                      <div key={attribute} className="radar-attribute">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">{attribute}</span>
                          <span className="text-sm text-gray-500">{60 + (index * 10)}%</span>
                        </div>
                        <div className="radar-bar">
                          <div 
                            className="radar-fill"
                            style={{ width: `${60 + (index * 10)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card className="p-6 winerim-bg text-white rounded-2xl shadow-elegant">
                  <CardContent className="p-0">
                    <h3 className="text-2xl font-bold mb-2">Tempranillo Profundo</h3>
                    <p className="text-white/80 mb-4">Tu perfil único te conecta con vinos intensos y estructurados</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20">Rioja</Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20">Ribera del Duero</Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/20">Toro</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 rounded-2xl shadow-elegant">
                    <CardContent className="p-0 text-center">
                      <Wine className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">25+ Vinos</h4>
                      <p className="text-sm text-gray-600">Recomendados</p>
                    </CardContent>
                  </Card>
                  <Card className="p-4 rounded-2xl shadow-elegant">
                    <CardContent className="p-0 text-center">
                      <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">8 Regiones</h4>
                      <p className="text-sm text-gray-600">Ideales</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary text-primary hover:bg-primary-light rounded-2xl px-8 py-4"
                onClick={() => navigate('/registration')}
              >
                Ver ejemplo de perfil completo
                <User className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LOS ESTILOS DE VINO */}
      <section className="py-20 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-6">
                <Palette className="h-8 w-8 text-primary mr-3" />
                <h2 className="text-4xl font-bold text-gray-900">Los Estilos de Vino</h2>
              </div>
              <p className="text-2xl text-primary mb-8 font-semibold">
                Más allá del blanco, tinto o rosado.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto mb-8">
                Los vinos se pueden agrupar por estilos sensoriales únicos. En base a tu Matchrim, sabrás si eres de vinos 
                <strong className="text-primary"> Vibrantes</strong>, <strong className="text-primary">Terrosos</strong>, 
                <strong className="text-primary"> Golosos</strong> o <strong className="text-primary">Tensos</strong>. 
                Y lo mejor: sabrás qué vinos los representan.
              </p>
            </div>
            
            {/* Scroll horizontal gallery */}
            <div className="overflow-x-auto pb-4 mb-12">
              <div className="flex gap-4 w-max">
                {[
                  { name: "Vibrantes & Frescos", color: "bg-green-400", description: "Energía y vivacidad" },
                  { name: "Terrosos & Minerales", color: "bg-stone-500", description: "Suelo y tradición" },
                  { name: "Golosos & Frutales", color: "bg-purple-400", description: "Dulzura y placer" },
                  { name: "Tensos & Elegantes", color: "bg-slate-400", description: "Precisión y finura" },
                  { name: "Potentes & Estructurados", color: "bg-red-700", description: "Fuerza y carácter" },
                  { name: "Cremosos & Sedosos", color: "bg-amber-300", description: "Textura y suavidad" },
                  { name: "Ligeros & Delicados", color: "bg-pink-300", description: "Sutileza y gracia" },
                  { name: "Complejos & Profundos", color: "bg-indigo-600", description: "Capas y misterio" }
                ].map((style, index) => (
                  <Card key={index} className="min-w-48 hover:shadow-elegant transition-all duration-300 cursor-pointer rounded-2xl">
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 ${style.color} rounded-2xl mx-auto mb-4 shadow-md`}></div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm">{style.name}</h3>
                      <p className="text-xs text-gray-600">{style.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary text-primary hover:bg-primary-light rounded-2xl px-8 py-4"
                onClick={() => navigate('/wine-styles')}
              >
                Explorar todos los estilos
                <Palette className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTELIGENCIA LÍQUIDA */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-8">
                <div className="bg-primary-light rounded-2xl p-4 mr-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-4xl font-bold text-gray-900">Inteligencia Líquida</h2>
              </div>
              
              <p className="text-2xl text-primary mb-8 font-semibold">
                Tus gustos evolucionan, tus recomendaciones también.
              </p>
              
              <p className="text-lg text-gray-700 mb-12 leading-relaxed max-w-4xl mx-auto">
                Con cada test, cada vino que valoras y cada interacción, nuestro sistema aprende para darte sugerencias aún más personalizadas. 
                La Inteligencia Líquida de Winerim conecta tu perfil Matchrim con las cartas de vino reales para que elijas rápido, disfrutes mejor y te sorprendas más.
              </p>
            </div>

            {/* Ilustración visual del cerebro IA + copa */}
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <Card className="p-8 text-center shadow-elegant rounded-2xl">
                <div className="relative mb-8">
                  <div className="bg-primary-light rounded-full p-8 w-32 h-32 mx-auto mb-4 relative">
                    <Brain className="h-16 w-16 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex justify-center">
                    <Wine className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">IA que Evoluciona</h3>
                <p className="text-gray-600">Cada interacción mejora tu experiencia</p>
              </Card>

              <div className="space-y-6">
                <Card className="p-6 shadow-elegant rounded-2xl">
                  <CardContent className="p-0 flex items-center">
                    <div className="bg-primary-light rounded-full p-3 mr-4">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Filtrado Inteligente</h3>
                      <p className="text-gray-600 text-sm">Según tu perfil sensorial único</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 shadow-elegant rounded-2xl">
                  <CardContent className="p-0 flex items-center">
                    <div className="bg-primary-light rounded-full p-3 mr-4">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Vinos Perfectos</h3>
                      <p className="text-gray-600 text-sm">En primer plano siempre</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 shadow-elegant rounded-2xl">
                  <CardContent className="p-0 flex items-center">
                    <div className="bg-primary-light rounded-full p-3 mr-4">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Aprendizaje Continuo</h3>
                      <p className="text-gray-600 text-sm">Mejora con cada valoración</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="text-center">
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-4"
                onClick={() => navigate('/inteligencia-liquida')}
              >
                Explorar Inteligencia Líquida
                <Brain className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ¿TIENES MATCHRIM? PIDE WINERIM */}
      <section className="py-20 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                ¿Tienes Matchrim? Pide Winerim
              </h2>
              <p className="text-2xl text-primary mb-8 font-semibold">
                Tu perfil funciona en cualquier restaurante con Winerim.
              </p>
            </div>
            
            {/* Mockup del filtro preconfigurado */}
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Cuando llegues a un restaurante con Winerim:
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-2xl p-3 mr-4 mt-1">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Filtrado automático según tu perfil</h4>
                      <p className="text-gray-600">Solo vinos que encajan contigo aparecen destacados</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-2xl p-3 mr-4 mt-1">
                      <Wine className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Vinos recomendados en primer plano</h4>
                      <p className="text-gray-600">Tus mejores opciones siempre arriba de la carta</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-2xl p-3 mr-4 mt-1">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Comparte con tu sumiller</h4>
                      <p className="text-gray-600">Muestra tu perfil para recomendaciones expertas</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Card className="p-8 shadow-elegant rounded-2xl bg-white">
                <CardContent className="p-0 text-center">
                  <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-6">
                    <Smartphone className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Tu Código Matchrim</h3>
                  <div className="bg-gradient-to-r from-primary-light to-primary-light/50 p-4 rounded-2xl border-2 border-dashed border-primary/30 mb-6">
                    <code className="text-2xl font-mono text-primary font-bold">TEMP-PROF-2024</code>
                  </div>
                  <p className="text-gray-600 mb-6">Fácil de recordar y compartir con el personal</p>
                  <Button 
                    variant="outline" 
                    className="border-primary text-primary hover:bg-primary-light"
                  >
                    Compartir perfil
                    <Share2 className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sello de compatibilidad */}
            <div className="text-center mb-12">
              <Card className="p-6 bg-primary text-primary-foreground max-w-md mx-auto rounded-2xl shadow-elegant">
                <CardContent className="p-0 flex items-center justify-center">
                  <div className="bg-white/20 rounded-full p-3 mr-4">
                    <Wine className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-lg">Compatible con Winerim</h4>
                    <p className="text-white/80 text-sm">Experiencia optimizada</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-8">
                ¿Tu restaurante favorito aún no usa Winerim?<br />
                <strong className="text-primary">¡Háblales de nosotros!</strong>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary text-primary hover:bg-primary-light rounded-2xl px-8 py-4"
                >
                  Descubre qué restaurantes usan Winerim
                  <MapPin className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-4"
                >
                  ¿Eres restaurante? Conecta con nosotros
                  <Users className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. EVANGELIZACIÓN */}
      <section className="py-20 bg-gradient-to-br from-red-600 to-red-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Haz que el vino hable de ti</h2>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 mb-8">
              <h3 className="text-2xl font-semibold mb-4">Cada vez que vayas a un restaurante, pregunta:</h3>
              <div className="text-4xl font-bold text-yellow-300 mb-4">
                "¿Aquí tenéis Winerim?"
              </div>
              <p className="text-xl text-red-100">
                Si tienes Matchrim, no vuelves a beber vino igual.
              </p>
            </div>
            
            <Card className="p-6 bg-yellow-400 text-black max-w-md mx-auto">
              <CardContent className="p-0 text-center">
                <h4 className="font-bold text-xl mb-2">🍷 ¿Tienes Matchrim?</h4>
                <p className="font-semibold">Aquí tenemos Winerim</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 8. ZONA DE USUARIO */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-red-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">Tu Zona Personal</h2>
            
            {user ? (
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-6">
                  <CardHeader>
                    <User className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <CardTitle>Mi Perfil Matchrim</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => navigate('/profile')}
                    >
                      Ver mi perfil completo
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="p-6">
                  <CardHeader>
                    <Share2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <CardTitle>Compartir Perfil</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      Generar código QR
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8">
                <CardContent className="p-0">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    Accede a tu zona personal
                  </h3>
                  <p className="text-gray-600 mb-8">
                    Registra tu perfil para ver tu radar sensorial, historial de tests y recomendaciones personalizadas.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      size="lg"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => navigate('/auth')}
                    >
                      Iniciar Sesión
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      onClick={() => navigate('/registration')}
                    >
                      Crear Cuenta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="py-20 bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-8">
              Empieza a beber vino como si lo hubieras inventado tú.
            </h2>
            <p className="text-xl mb-12 opacity-90">
              Haz el test, descubre tu perfil y lleva Matchrim contigo.
            </p>
            <Button 
              size="lg" 
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-16 py-8 text-2xl rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/registration')}
            >
              Empezar ahora
              <ChevronRight className="ml-3 h-8 w-8" />
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-bold text-xl mb-4 flex items-center">
                  <img 
                    src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
                    alt="Winerim" 
                    className="h-8 w-8 mr-2"
                  />
                  Winerim
                </h3>
                <p className="text-gray-400">
                  Sistema inteligente de clasificación de vinos. Transformando la experiencia del comensal.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Producto</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><button onClick={() => navigate('/registration')} className="hover:text-white transition-colors">Test Matchrim</button></li>
                  <li><button onClick={() => navigate('/wine-styles')} className="hover:text-white transition-colors">Estilos de Vino</button></li>
                  <li><button onClick={() => navigate('/inteligencia-liquida')} className="hover:text-white transition-colors">Inteligencia Líquida</button></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Para Restaurantes</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Integrar Winerim</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Casos de Éxito</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Soporte</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Contacto</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="mailto:hola@winerim.com" className="hover:text-white transition-colors">hola@winerim.com</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 Winerim. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
