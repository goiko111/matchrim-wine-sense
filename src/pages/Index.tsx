
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
      <section className="relative min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 flex flex-col justify-center min-h-screen">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
              El vino empieza <span className="text-yellow-300">contigo.</span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 opacity-90 leading-relaxed">
              Descubre tu perfil Matchrim, conecta con tu estilo y lleva el vino a tu medida allá donde vayas.
            </p>
            <Button 
              size="lg" 
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-12 py-6 text-xl rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
              onClick={() => navigate('/registration')}
            >
              Hacer el test Matchrim
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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-red-100 rounded-full p-4 mr-4">
                <Brain className="h-8 w-8 text-red-700" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900">¿Qué es Matchrim?</h2>
            </div>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              <strong className="text-red-700">Descubre tu perfil sensorial. Explora el vino como nunca antes.</strong>
            </p>
            
            <p className="text-lg text-gray-700 mb-12 leading-relaxed">
              Matchrim es el primer test sensorial que traduce tus gustos personales en un perfil de cata único y memorable. 
              En menos de 1 minuto, sabrás si eres un perfil "Garnacha Terroir" o "Riesling Bruma", y obtendrás 
              recomendaciones precisas de vinos, regiones, estilos y uvas que encajan contigo.
            </p>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-red-700 text-red-700 hover:bg-red-50"
              onClick={() => navigate('/registration')}
            >
              Descubre tu perfil
              <Target className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* 3. TU PERFIL SENSITIVO */}
      <section className="py-20 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Tu Perfil Sensitivo: un nombre, una identidad
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Tu perfil no es solo un nombre bonito. Es el reflejo de tus gustos sensoriales: 
                potencia, acidez, dulzura, tanicidad, fruta. Descubre tu estilo, tus vinos ideales 
                y tu manera de vivir el vino.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <Card className="p-8 shadow-lg">
                <CardHeader className="text-center">
                  <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                    <Radar className="h-10 w-10 text-red-700" />
                  </div>
                  <CardTitle className="text-2xl text-red-900">Tu Radar Sensorial</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Potencia', 'Acidez', 'Dulzura', 'Tanicidad', 'Fruta'].map((attribute, index) => (
                      <div key={attribute} className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{attribute}</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${60 + (index * 10)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card className="p-6 bg-gradient-to-r from-red-600 to-red-700 text-white">
                  <CardContent className="p-0">
                    <h3 className="text-2xl font-bold mb-2">Tempranillo Profundo</h3>
                    <p className="text-red-100 mb-4">Tu perfil único te conecta con vinos intensos y estructurados</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-white/20 text-white">Rioja</Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white">Ribera del Duero</Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white">Toro</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <CardContent className="p-0 text-center">
                      <Wine className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">25+ Vinos</h4>
                      <p className="text-sm text-gray-600">Recomendados</p>
                    </CardContent>
                  </Card>
                  <Card className="p-4">
                    <CardContent className="p-0 text-center">
                      <MapPin className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-gray-900">8 Regiones</h4>
                      <p className="text-sm text-gray-600">Ideales</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LOS ESTILOS DE VINO */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-6">
                <Palette className="h-8 w-8 text-red-700 mr-3" />
                <h2 className="text-4xl font-bold text-gray-900">Los Estilos de Vino</h2>
              </div>
              <p className="text-xl text-gray-600 mb-8">
                <strong>Más allá del blanco, tinto o rosado.</strong>
              </p>
              <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
                Hemos clasificado el mundo del vino en 12 estilos sensoriales basados en patrones de potencia, 
                dulzor, acidez, tanicidad y fruta. ¿Te atraen los vinos "Jugosos y Frescos"? 
                ¿O prefieres los "Tensos y Minerales"? Conocer tu estilo es clave para acertar siempre.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
              {wineStyles.map((style, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 ${style.color} rounded-full mx-auto mb-4 opacity-80`}></div>
                    <h3 className="font-semibold text-gray-900 mb-2">{style.name}</h3>
                    <p className="text-sm text-gray-600">{style.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center">
              <Button 
                variant="outline" 
                size="lg"
                className="border-red-700 text-red-700 hover:bg-red-50"
                onClick={() => navigate('/wine-styles')}
              >
                Ver todos los estilos
                <Palette className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTELIGENCIA LÍQUIDA */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-8">
              <Brain className="h-8 w-8 text-blue-700 mr-3" />
              <h2 className="text-4xl font-bold text-gray-900">Inteligencia Líquida</h2>
            </div>
            
            <p className="text-xl text-gray-600 mb-8">
              <strong>Tu Matchrim evoluciona contigo.</strong>
            </p>
            
            <p className="text-lg text-gray-700 mb-12 leading-relaxed">
              Imagina que cada vez que pides vino, el sistema sabe lo que te gusta. 
              La Inteligencia Líquida de Winerim conecta tu perfil Matchrim con las cartas de vino reales. 
              Para que elijas rápido, disfrutes mejor y te sorprendas más.
            </p>
            
            <Card className="p-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white mb-8">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-blue-200" />
                    <h3 className="font-semibold mb-2">Filtrado Automático</h3>
                    <p className="text-blue-100 text-sm">Según tu perfil sensorial</p>
                  </div>
                  <div className="text-center">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-blue-200" />
                    <h3 className="font-semibold mb-2">Vinos que Encajan</h3>
                    <p className="text-blue-100 text-sm">En primer plano siempre</p>
                  </div>
                  <div className="text-center">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-blue-200" />
                    <h3 className="font-semibold mb-2">IA que Aprende</h3>
                    <p className="text-blue-100 text-sm">Mejores recomendaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => navigate('/inteligencia-liquida')}
            >
              Explorar Inteligencia Líquida
              <Brain className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* 6. ¿DÓNDE USARLO? */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                ¿Dónde usarlo? Winerim en restaurantes
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                <strong>Si tienes Matchrim, pide Winerim.</strong>
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  Cuando acudas a un restaurante que trabaje con Winerim, introduce tu código Matchrim 
                  y la carta se adaptará a ti:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                      <Target className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Filtrado automático según tu perfil</h3>
                      <p className="text-gray-600">Solo vinos que encajan contigo</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                      <Wine className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Vinos destacados en primer plano</h3>
                      <p className="text-gray-600">Tus mejores opciones arriba</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                      <Heart className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Recomendaciones más precisas</h3>
                      <p className="text-gray-600">Más disfrute en cada copa</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Card className="p-8 bg-gradient-to-br from-red-50 to-orange-50">
                <CardContent className="p-0 text-center">
                  <Smartphone className="h-16 w-16 text-red-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Tu Código Matchrim</h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-red-300 mb-6">
                    <code className="text-2xl font-mono text-red-700">TEMP-PROF-2024</code>
                  </div>
                  <p className="text-gray-600">Fácil de recordar y compartir</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center">
              <p className="text-lg text-gray-700 mb-8">
                ¿Tu restaurante favorito aún no usa Winerim?<br />
                <strong>¡Háblales de nosotros o compárteles tu perfil!</strong>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" size="lg" className="border-red-700 text-red-700 hover:bg-red-50">
                  Ver restaurantes con Winerim
                  <MapPin className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" className="bg-red-600 hover:bg-red-700">
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
