
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const AdminRoleAssignment = () => {
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const assignAdminRole = async (userId: string) => {
    try {
      console.log('Attempting to assign admin role to user:', userId);
      
      // First check if the user already has the admin role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing role:', checkError);
        throw checkError;
      }

      if (existingRole) {
        console.log('User already has admin role');
        toast({
          title: "Información",
          description: "El usuario ya tiene el rol de administrador",
        });
        return;
      }

      console.log('Inserting admin role for user:', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        })
        .select();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Error inserting admin role:', error);
        throw error;
      }

      console.log('Admin role assigned successfully:', data);
      toast({
        title: "Éxito",
        description: "Rol de administrador asignado correctamente",
      });
    } catch (error: any) {
      console.error('Full error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      
      let errorMessage = error.message || 'Error desconocido';
      
      // Handle specific error cases
      if (error.code === '42501') {
        errorMessage = 'No tienes permisos para asignar roles de administrador. Contacta con el administrador del sistema.';
      } else if (error.code === '23505') {
        errorMessage = 'El usuario ya tiene este rol asignado.';
      } else if (error.message?.includes('RLS')) {
        errorMessage = 'Error de permisos de seguridad. Verifica que estés autenticado correctamente.';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleAssignToSelf = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive"
      });
      return;
    }

    console.log('Current user:', user);
    console.log('User ID:', user.id);
    console.log('User email:', user.email);

    setIsLoading(true);
    await assignAdminRole(user.id);
    setIsLoading(false);
  };

  const handleAssignToOther = async () => {
    if (!targetUserId.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un ID de usuario válido",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    await assignAdminRole(targetUserId.trim());
    setIsLoading(false);
    setTargetUserId('');
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asignación de Rol de Administrador</CardTitle>
          <CardDescription>
            Debes estar autenticado para asignar roles de administrador
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asignación de Rol de Administrador</CardTitle>
        <CardDescription>
          Asigna roles de administrador para poder gestionar los datos de la aplicación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>Tu ID de usuario:</strong> {user.id}
            <br />
            <strong>Email:</strong> {user.email}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Asignar rol a ti mismo</h3>
            <p className="text-sm text-gray-600 mb-2">
              Asigna el rol de administrador a tu cuenta actual
            </p>
            <Button 
              onClick={handleAssignToSelf}
              disabled={isLoading}
            >
              {isLoading ? 'Asignando...' : 'Asignar Admin a Mi Cuenta'}
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium">Asignar rol a otro usuario</h3>
            <p className="text-sm text-gray-600 mb-2">
              Ingresa el ID del usuario al que deseas asignar el rol de administrador
            </p>
            <div className="space-y-2">
              <Label htmlFor="user-id">ID del Usuario</Label>
              <Input
                id="user-id"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Ingresa el ID del usuario"
                disabled={isLoading}
              />
              <Button 
                onClick={handleAssignToOther}
                disabled={isLoading || !targetUserId.trim()}
              >
                {isLoading ? 'Asignando...' : 'Asignar Admin'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRoleAssignment;
