
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (!error) {
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleRegisterRedirect = () => {
    navigate('/registration');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
            alt="Logo Winerim" 
            className="h-16 w-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-red-900">Winerim</h1>
          <p className="text-red-600">Descubre tu perfil de vino perfecto</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-900">Bienvenido</CardTitle>
            <CardDescription className="text-center">
              Inicia sesión o crea una cuenta para guardar tus resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Contraseña"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-red-700 hover:bg-red-800"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <div className="space-y-4">
                  <p className="text-center text-sm text-gray-600">
                    Crea tu cuenta y descubre tu perfil de vino personalizado
                  </p>
                  <Button 
                    onClick={handleRegisterRedirect}
                    className="w-full bg-red-700 hover:bg-red-800"
                  >
                    Crear Cuenta Completa
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    El registro incluye preferencias de vino, sabores y experiencias personalizadas
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
