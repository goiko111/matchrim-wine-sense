
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Wine } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Wine {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  estilo: string;
  potencia: number;
  acidez: number;
  dulzura: number;
  taninos: number;
  afrutado: number;
  vintage: number | null;
  description: string | null;
}

const WinesTable = () => {
  const [wines, setWines] = useState<Wine[]>([]);
  const [filteredWines, setFilteredWines] = useState<Wine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchWines = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wines')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching wines:', error);
        toast({
          title: "Error",
          description: `Error al cargar vinos: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      setWines(data || []);
      setFilteredWines(data || []);
    } catch (error: any) {
      console.error('Error fetching wines:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar vinos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWines();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredWines(wines);
    } else {
      const filtered = wines.filter(wine =>
        wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.producer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.estilo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWines(filtered);
    }
  }, [searchTerm, wines]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wine className="h-5 w-5" />
            Vinos Cargados
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
          <Wine className="h-5 w-5" />
          Vinos Cargados ({filteredWines.length})
        </CardTitle>
        <CardDescription>
          Lista de todos los vinos importados en la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, productor, región o estilo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={fetchWines} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Región</TableHead>
                <TableHead>Estilo</TableHead>
                <TableHead>Añada</TableHead>
                <TableHead>Potencia</TableHead>
                <TableHead>Acidez</TableHead>
                <TableHead>Dulzura</TableHead>
                <TableHead>Taninos</TableHead>
                <TableHead>Afrutado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron vinos que coincidan con la búsqueda' : 'No hay vinos cargados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredWines.map((wine) => (
                  <TableRow key={wine.id}>
                    <TableCell className="font-medium">{wine.name}</TableCell>
                    <TableCell>{wine.producer || '-'}</TableCell>
                    <TableCell>{wine.region || '-'}</TableCell>
                    <TableCell>{wine.estilo}</TableCell>
                    <TableCell>{wine.vintage || '-'}</TableCell>
                    <TableCell>{wine.potencia}</TableCell>
                    <TableCell>{wine.acidez}</TableCell>
                    <TableCell>{wine.dulzura}</TableCell>
                    <TableCell>{wine.taninos}</TableCell>
                    <TableCell>{wine.afrutado}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WinesTable;
