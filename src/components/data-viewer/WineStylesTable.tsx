
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WineStyle {
  id: string;
  name: string;
  description: string | null;
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
  created_at: string;
}

const WineStylesTable = () => {
  const [styles, setStyles] = useState<WineStyle[]>([]);
  const [filteredStyles, setFilteredStyles] = useState<WineStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const cleanName = (name: string) => {
    return name.replace(/^\d+;\d+;\d+;\d+;\d+;/, '').replace(/\s*\(\d+\)$/, '').trim();
  };

  const extractSensoryValues = (name: string) => {
    const match = name.match(/^(\d+);(\d+);(\d+);(\d+);(\d+);/);
    if (match) {
      return {
        potente: parseInt(match[1]),
        acidez: parseInt(match[2]),
        dulce: parseInt(match[3]),
        tanico: parseInt(match[4]),
        afrutado: parseInt(match[5])
      };
    }
    return null;
  };

  const fetchStyles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wine_styles')
        .select('*')
        .order('name')
        .limit(100);

      if (error) {
        console.error('Error fetching wine styles:', error);
        toast({
          title: "Error",
          description: `Error al cargar estilos: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      setStyles(data || []);
      setFilteredStyles(data || []);
    } catch (error: any) {
      console.error('Error fetching wine styles:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar estilos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredStyles(styles);
    } else {
      const filtered = styles.filter(style => {
        const cleanedName = cleanName(style.name);
        return cleanedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          style.description?.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredStyles(filtered);
    }
  }, [searchTerm, styles]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Estilos de Vino Cargados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Estilos de Vino Cargados ({filteredStyles.length})
        </CardTitle>
        <CardDescription>
          Lista de todos los estilos de vino importados en la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={fetchStyles} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Potente</TableHead>
                <TableHead>Acidez</TableHead>
                <TableHead>Dulce</TableHead>
                <TableHead>Tánico</TableHead>
                <TableHead>Afrutado</TableHead>
                <TableHead>Fecha Creación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStyles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron estilos que coincidan con la búsqueda' : 'No hay estilos cargados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStyles.map((style) => {
                  const sensoryValues = extractSensoryValues(style.name);
                  return (
                    <TableRow key={style.id}>
                      <TableCell className="font-medium">{cleanName(style.name)}</TableCell>
                      <TableCell className="max-w-xs truncate">{style.description || '-'}</TableCell>
                      <TableCell>{sensoryValues?.potente ?? style.potente}</TableCell>
                      <TableCell>{sensoryValues?.acidez ?? style.acidez}</TableCell>
                      <TableCell>{sensoryValues?.dulce ?? style.dulce}</TableCell>
                      <TableCell>{sensoryValues?.tanico ?? style.tanico}</TableCell>
                      <TableCell>{sensoryValues?.afrutado ?? style.afrutado}</TableCell>
                      <TableCell>{new Date(style.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WineStylesTable;
