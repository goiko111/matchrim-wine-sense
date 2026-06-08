
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Wine, ExternalLink, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Wine {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  tipo: string;
  estilo: string;
  estilo_origen: string | null;
  encaje_pct: number | null;
  flag_reasignacion: string | null;
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
  const navigate = useNavigate();

  const cleanStyleName = (name: string) => {
    return name.replace(/^\d+;\d+;\d+;\d+;\d+;/, '').replace(/\s*\(\d+\)$/, '').trim();
  };

  const generateSlug = (wineName: string) => {
    return wineName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const navigateToWine = (wine: Wine) => {
    const slug = generateSlug(wine.name);
    navigate(`/wines/${wine.id}/${slug}`);
  };

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
    } catch (error) {
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
      const filtered = wines.filter(wine => {
        const cleanedStyle = cleanStyleName(wine.estilo);
        return wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wine.producer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wine.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wine.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wine.flag_reasignacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cleanedStyle.toLowerCase().includes(searchTerm.toLowerCase());
      });
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
                <TableHead>Tipo</TableHead>
                <TableHead>Estilo</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Encaje</TableHead>
                <TableHead>Añada</TableHead>
                <TableHead>Potencia</TableHead>
                <TableHead>Acidez</TableHead>
                <TableHead>Dulzura</TableHead>
                <TableHead>Taninos</TableHead>
                <TableHead>Afrutado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron vinos que coincidan con la búsqueda' : 'No hay vinos cargados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredWines.map((wine) => (
                  <TableRow 
                    key={wine.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigateToWine(wine)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Wine className="h-4 w-4 text-primary" />
                        {wine.name}
                      </div>
                    </TableCell>
                    <TableCell>{wine.producer || '-'}</TableCell>
                    <TableCell>{wine.region || '-'}</TableCell>
                    <TableCell>{wine.tipo || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {cleanStyleName(wine.estilo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wine.flag_reasignacion === 'sin_encaje' ? 'destructive' : 'outline'} className="text-xs">
                        {wine.flag_reasignacion || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{wine.encaje_pct ?? '-'}</TableCell>
                    <TableCell>{wine.vintage || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{wine.potencia}</span>
                        <div className="w-8 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${(wine.potencia / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{wine.acidez}</span>
                        <div className="w-8 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${(wine.acidez / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{wine.dulzura}</span>
                        <div className="w-8 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${(wine.dulzura / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{wine.taninos}</span>
                        <div className="w-8 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${(wine.taninos / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{wine.afrutado}</span>
                        <div className="w-8 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-primary rounded-full"
                            style={{ width: `${(wine.afrutado / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToWine(wine);
                        }}
                        className="hover:bg-primary hover:text-primary-foreground"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
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
