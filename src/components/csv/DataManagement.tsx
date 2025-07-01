import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Database, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TableName = 'wines' | 'wine_styles' | 'matchrim_profiles';

const DataManagement = () => {
  const [isDeleting, setIsDeleting] = useState<TableName | null>(null);
  const [deleteResult, setDeleteResult] = useState<{ type: string; count: number } | null>(null);

  const deleteData = async (tableName: TableName, displayName: string) => {
    setIsDeleting(tableName);
    setDeleteResult(null);
    
    try {
      console.log(`Eliminando todos los datos de la tabla: ${tableName}`);
      
      // First, count how many records exist before deletion
      const { count: beforeCount, error: countBeforeError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (countBeforeError) {
        console.error(`Error contando registros antes de eliminar:`, countBeforeError);
      }
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (error) {
        console.error(`Error eliminando datos de ${tableName}:`, error);
        toast({
          title: "Error",
          description: `Error al eliminar ${displayName}: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      // Get count of remaining records to verify deletion
      const { count: afterCount, error: countAfterError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (countAfterError) {
        console.error(`Error contando registros restantes:`, countAfterError);
      }
      
      // Calculate how many records were deleted
      const deletedCount = (beforeCount || 0) - (afterCount || 0);
      
      setDeleteResult({ type: displayName, count: deletedCount });
      
      console.log(`Eliminados ${deletedCount} registros de ${tableName}`);
      toast({
        title: "Eliminación completada",
        description: `Se han eliminado ${deletedCount} ${displayName.toLowerCase()}`,
      });
      
    } catch (error: any) {
      console.error(`Error eliminando ${tableName}:`, error);
      toast({
        title: "Error",
        description: `Error inesperado al eliminar ${displayName}`,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const DeleteButton = ({ 
    tableName, 
    displayName, 
    description,
    variant = "destructive" as const
  }: { 
    tableName: TableName; 
    displayName: string; 
    description: string;
    variant?: "destructive" | "outline";
  }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant}
          disabled={isDeleting !== null}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting === tableName ? 'Eliminando...' : `Eliminar ${displayName}`}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            ¿Confirmar eliminación?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente todos los {displayName.toLowerCase()} de la base de datos.
            <br /><br />
            <strong>Esta acción no se puede deshacer.</strong>
            <br /><br />
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteData(tableName, displayName)}
            className="bg-red-600 hover:bg-red-700"
          >
            Sí, eliminar todo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Database className="h-5 w-5" />
          Gestión de Datos
        </CardTitle>
        <CardDescription>
          Elimina todos los registros de cada tipo de dato. <strong>Estas acciones son permanentes.</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Advertencia:</strong> Estas operaciones eliminarán permanentemente todos los datos del tipo seleccionado. 
            Asegúrate de tener respaldos si es necesario.
          </AlertDescription>
        </Alert>

        {deleteResult && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✓ Eliminación completada: {deleteResult.count} {deleteResult.type}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Vinos</h4>
            <p className="text-xs text-gray-600 mb-3">
              Elimina todos los vinos importados, incluyendo sus características organolépticas y descripciones.
            </p>
            <DeleteButton
              tableName="wines"
              displayName="Vinos"
              description="Esto incluye todos los vinos con sus características de potencia, acidez, dulzura, taninos, afrutado y descripciones detalladas."
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Estilos de Vino</h4>
            <p className="text-xs text-gray-600 mb-3">
              Elimina todos los estilos de vino con sus perfiles de características.
            </p>
            <DeleteButton
              tableName="wine_styles"
              displayName="Estilos de Vino"
              description="Esto incluye todos los estilos de vino Winerim con sus valores de potencia, acidez, dulzura, taninos y afrutado."
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Perfiles Matchrim</h4>
            <p className="text-xs text-gray-600 mb-3">
              Elimina todos los perfiles Matchrim con sus recomendaciones asociadas.
            </p>
            <DeleteButton
              tableName="matchrim_profiles"
              displayName="Perfiles Matchrim"
              description="Esto incluye todos los perfiles con sus características organolépticas y recomendaciones de uvas, regiones y estilos."
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Estado:</span>
            <span className={isDeleting ? "text-orange-600" : "text-green-600"}>
              {isDeleting ? `Eliminando ${isDeleting}...` : 'Listo'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataManagement;
