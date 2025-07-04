
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  User,
  Share2,
  Star,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const wineStyles = [
    { name: "Tinto Goloso", description: "Dulzura y placer", category: "golosos" },
    { name: "Blanco Vital", description: "Energía y vivacidad", category: "vibrantes" },
    { name: "Rosado Tenso", description: "Precisión y finura", category: "tensos" },
    { name: "Tinto Terroso", description: "Suelo y tradición", category: "terrosos" },
    { name: "Blanco Cremoso", description: "Textura y suavidad", category: "cremosos" },
    { name: "Tinto Potente", description: "Fuerza y carácter", category: "potentes" },
    { name: "Rosado Ligero", description: "Sutileza y gracia", category: "ligeros" },
    { name: "Tinto Complejo", description: "Capas y misterio", category: "complejos" },
    { name: "Blanco Mineral", description: "Pureza y transparencia", category: "minerales" },
    { name: "Espumoso Elegante", description: "Efervescencia refinada", category: "elegantes" },
    { name: "Tinto Estructurado", description: "Firmeza y arquitectura", category: "estructurados" },
    { name: "Blanco Aromático", description: "Perfume intenso", category: "aromaticos" }
  ];

  const testimonials = [
    {
      name: "María González",
      profile: "Tempranillo Bosque",
      quote: "Matchrim cambió mi forma de elegir vino. Ahora siempre acierto.",
      rating: 5
    },
    {
      name: "Carlos Mendoza",
      profile: "Albariño Mineral",
      quote: "En cada restaurante con Winerim encuentro mi vino perfecto al instante.",
      rating: 5
    },
    {
      name: "Ana Ruiz",
      profile: "Garnacha Solar",
      quote: "Mi sommelier personal en el bolsillo. Increíble precisión.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* 1. HERO RENOVADO */}
      <section className="relative min-h-screen winerim-bg text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"></div>
        <div className="relative container mx-auto px-4 py-20 flex flex-col justify-center min-h-screen">
          <div className="max-w-6xl mx-auto text-center">
            {/* Badge destacado */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/20">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold">Más de 10,000 perfiles creados</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1]">
              Tu <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">identidad vínica</span> en 60 segundos
            </h1>
            
            <p className="text-xl md:text-2xl mb-4 opacity-95 font-medium max-w-4xl mx-auto">
              Descubre tu perfil sensorial único entre <strong className="text-accent">7,776 combinaciones posibles</strong>
            </p>
            
            <p className="text-lg mb-12 opacity-80 max-w-3xl mx-auto">
              Un test científico que revela si eres "Tinto Goloso", "Blanco Mineral" o cualquiera de los otros estilos únicos
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-12 py-6 text-xl rounded-2xl shadow-2xl transform hover:scale-105 transition-smooth"
                onClick={() => navigate('/registration')}
              >
                <Brain className="mr-3 h-6 w-6" />
                Hacer mi test gratis
              </Button>
              
              <div className="flex items-center gap-4 text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <span className="text-sm">Sin registro</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <span className="text-sm">60 segundos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  <span className="text-sm">100% gratis</span>
                </div>
              </div>
            </div>

            {/* Testimonios rápidos */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-accent fill-current" />
                  ))}
                </div>
                <p className="text-sm italic mb-2">"Increíble precisión. Ahora siempre elijo el vino perfecto."</p>
                <p className="text-xs text-white/60">- María, Tempranillo Bosque</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-accent fill-current" />
                  ))}
                </div>
                <p className="text-sm italic mb-2">"Mi sommelier personal en el bolsillo."</p>
                <p className="text-xs text-white/60">- Carlos, Albariño Mineral</p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-accent fill-current" />
                  ))}
                </div>
                <p className="text-sm italic mb-2">"Cambió totalmente mi relación con el vino."</p>
                <p className="text-xs text-white/60">- Ana, Garnacha Solar</p>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUÉ ES MATCHRIM */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">¿Qué es Matchrim?</h2>
              <p className="text-xl md:text-2xl text-primary font-semibold mb-8">
                Matchrim analiza tus preferencias sensoriales para darte un perfil único, con recomendaciones de vinos adaptadas a ti.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              {/* Radar de atributos */}
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
                          <span className="text-sm text-gray-500">{60 + (index * 8)}%</span>
                        </div>
                        <div className="radar-bar">
                          <div 
                            className="radar-fill"
                            style={{ width: `${60 + (index * 8)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Explicación del sistema */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Cómo funciona el análisis sensorial
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-full p-3 mr-4 mt-1">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Test de 1 minuto</h4>
                      <p className="text-gray-600">Responde preguntas sobre tus gustos y preferencias</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-full p-3 mr-4 mt-1">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Algoritmo sensorial</h4>
                      <p className="text-gray-600">Analizamos tus respuestas para crear tu perfil único</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-full p-3 mr-4 mt-1">
                      <Wine className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Perfil personalizado</h4>
                      <p className="text-gray-600">Obtén un nombre único y recomendaciones precisas</p>
                    </div>
                  </div>
                </div>

                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-4 w-full"
                  onClick={() => navigate('/registration')}
                >
                  Descubrir mi perfil
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ESTILOS DE VINO */}
      <section className="py-20 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">Los Estilos de Vino</h2>
              <p className="text-2xl text-primary mb-8 font-semibold">
                ¿Eres un Tinto Goloso? ¿O quizás un Blanco Vital?
              </p>
              <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto mb-8">
                Los vinos se pueden agrupar por estilos sensoriales únicos. Más allá del color, descubre si tus gustos 
                te conectan con vinos <strong className="text-primary">Golosos</strong>, <strong className="text-primary">Vibrantes</strong>, 
                <strong className="text-primary"> Terrosos</strong> o <strong className="text-primary">Tensos</strong>.
              </p>
            </div>
            
            {/* Grid de estilos principales */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
              {wineStyles.map((style, index) => (
                <Card 
                  key={index} 
                  className="group hover:shadow-elegant transition-all duration-300 cursor-pointer rounded-2xl transform hover:scale-105"
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 shadow-md flex items-center justify-center">
                      <Wine className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-sm group-hover:text-primary transition-colors">
                      {style.name}
                    </h3>
                    <p className="text-xs text-gray-600">{style.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-6">
                Tu perfil Matchrim te dirá cuál es tu estilo y qué vinos específicos encajan contigo.
              </p>
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-4"
                onClick={() => navigate('/registration')}
              >
                Descubrir mi estilo
                <Palette className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTELIGENCIA LÍQUIDA */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">Inteligencia Líquida</h2>
              <p className="text-2xl text-primary mb-8 font-semibold">
                Cómo la IA de Winerim analiza cartas de vino y recomienda opciones personalizadas según tu Matchrim.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              {/* Ejemplo visual */}
              <Card className="p-8 shadow-elegant rounded-2xl bg-gradient-to-br from-primary-light to-white">
                <CardContent className="p-0 text-center">
                  <div className="mb-6">
                    <div className="bg-primary rounded-2xl p-4 w-20 h-20 mx-auto mb-4">
                      <User className="h-12 w-12 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-primary mb-2">Tú eres "Albariño Mineral"</h3>
                    <p className="text-gray-600 text-sm">Tu perfil sensorial</p>
                  </div>
                  
                  <div className="flex items-center justify-center mb-6">
                    <ArrowRight className="h-8 w-8 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <Card className="p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Godello Bierzo 2022</span>
                        <Badge className="bg-primary text-primary-foreground">98% match</Badge>
                      </div>
                    </Card>
                    <Card className="p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Riesling Mosel 2021</span>
                        <Badge className="bg-primary text-primary-foreground">95% match</Badge>
                      </div>
                    </Card>
                    <Card className="p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Chenin Loire 2023</span>
                        <Badge className="bg-primary text-primary-foreground">92% match</Badge>
                      </div>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Explicación */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Winerim te sugiere vinos similares en restaurantes cercanos
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-full p-3 mr-4 mt-1">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Análisis inteligente</h4>
                      <p className="text-gray-600">Nuestra IA analiza miles de cartas de vino en tiempo real</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-full p-3 mr-4 mt-1">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Matching preciso</h4>
                      <p className="text-gray-600">Encuentra vinos que coinciden con tu perfil sensorial</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary-light rounded-full p-3 mr-4 mt-1">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Ubicación personalizada</h4>
                      <p className="text-gray-600">Recomendaciones basadas en restaurantes de tu zona</p>
                    </div>
                  </div>
                </div>

                <Button 
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-8 py-4 w-full"
                  onClick={() => navigate('/registration')}
                >
                  Probarlo ahora
                  <Brain className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ¿Y PARA QUÉ SIRVE MATCHRIM? */}
      <section className="py-20 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">¿Y para qué sirve Matchrim?</h2>
              <p className="text-xl text-gray-700 mb-8">
                Tu perfil sensorial te abre un mundo de posibilidades
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <Card className="p-6 text-center shadow-elegant rounded-2xl transform hover:scale-105 transition-smooth">
                <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-4">
                  <Wine className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Usalo en restaurantes</h3>
                <p className="text-gray-600 text-sm">En cualquier restaurante que tenga Winerim</p>
              </Card>

              <Card className="p-6 text-center shadow-elegant rounded-2xl transform hover:scale-105 transition-smooth">
                <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Guarda favoritos</h3>
                <p className="text-gray-600 text-sm">Crea tu colección de vinos perfectos</p>
              </Card>

              <Card className="p-6 text-center shadow-elegant rounded-2xl transform hover:scale-105 transition-smooth">
                <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-4">
                  <Share2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Comparte tu perfil</h3>
                <p className="text-gray-600 text-sm">Con amigos y profesionales del sector</p>
              </Card>

              <Card className="p-6 text-center shadow-elegant rounded-2xl transform hover:scale-105 transition-smooth">
                <div className="bg-primary-light rounded-2xl p-4 w-16 h-16 mx-auto mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Recomendaciones</h3>
                <p className="text-gray-600 text-sm">IA que aprende de tus gustos</p>
              </Card>
            </div>

            <div className="text-center">
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-12 py-4"
                onClick={() => navigate('/registration')}
              >
                Crear mi Matchrim ahora
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECCIÓN EVANGELIZACIÓN */}
      <section className="py-20 winerim-bg text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">¿Tienes Matchrim? Pregunta si tienen Winerim</h2>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-semibold mb-6">Cada vez que vayas a un restaurante, pregunta:</h3>
              <div className="text-3xl md:text-4xl font-bold text-accent mb-6">
                "¿Aquí tenéis Winerim?"
              </div>
              <p className="text-xl text-white/90 mb-6">
                Si tienes Matchrim, no vuelves a beber vino igual.
              </p>
              <p className="text-lg text-white/80">
                Ayuda a que más restaurantes adopten la tecnología que mejora tu experiencia
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-2xl px-8 py-4 font-bold"
                onClick={() => navigate('/registration')}
              >
                Obtener mi Matchrim
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-primary rounded-2xl px-8 py-4"
              >
                Recomendar Winerim a tu restaurante favorito
                <Heart className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <Card className="p-6 bg-accent text-accent-foreground max-w-md mx-auto rounded-2xl shadow-2xl">
              <CardContent className="p-0 text-center">
                <h4 className="font-bold text-xl mb-2">🍷 ¿Tienes Matchrim?</h4>
                <p className="font-semibold">Aquí tenemos Winerim</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIOS */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">Lo que dicen nuestros usuarios</h2>
              <p className="text-xl text-gray-600 mb-8">
                Miles de personas ya han descubierto su perfil Matchrim
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6 shadow-elegant rounded-2xl">
                  <CardContent className="p-0">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-accent fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-4 italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center">
                      <div className="bg-primary-light rounded-full p-2 mr-3">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-primary font-medium">{testimonial.profile}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-6">
                Únete a miles de amantes del vino que ya conocen su perfil sensorial
              </p>
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-12 py-4"
                onClick={() => navigate('/registration')}
              >
                Descubrir mi perfil
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
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

      {/* 8. CIERRE EMOCIONAL + CTA FINAL */}
      <section className="py-20 winerim-bg text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
              No vuelvas a pedir vino al azar. Descubre quién eres entre copas.
            </h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90">
              Tu perfil sensorial te está esperando. Solo necesitas 1 minuto para conocerlo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-16 py-6 text-xl rounded-full shadow-2xl transform hover:scale-105 transition-smooth"
                onClick={() => navigate('/registration')}
              >
                👉 Hacer el test
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                className="border-white text-white hover:bg-white hover:text-primary font-bold px-12 py-6 text-lg rounded-full"
              >
                Compartir Matchrim
                <Share2 className="ml-2 h-6 w-6" />
              </Button>
            </div>
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
