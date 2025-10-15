
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MatchrimProfile {
  id: string;
  name: string;
  description: string | null;
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
  grape_recommendations: string[] | null;
  region_recommendations: string[] | null;
  style_recommendations: string[] | null;
  created_at: string;
}

const MatchrimProfilesTable = () => {
  const [profiles, setProfiles] = useState<MatchrimProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<MatchrimProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('matchrim_profiles')
        .select('*')
        .order('name')
        .limit(100);

      if (error) {
        console.error('Error fetching matchrim profiles:', error);
        toast({
          title: "Error",
          description: `Error al cargar perfiles: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching matchrim profiles:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar perfiles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProfiles(profiles);
    } else {
      const filtered = profiles.filter(profile =>
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProfiles(filtered);
    }
  }, [searchTerm, profiles]);

  const renderRecommendations = (recommendations: string[] | null, maxShow: number = 3) => {
    if (!recommendations || recommendations.length === 0) return '-';
    
    const showMore = recommendations.length > maxShow;
    const toShow = recommendations.slice(0, maxShow);
    
    return (
      <div className="flex flex-wrap gap-1">
        {toShow.map((rec, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {rec}
          </Badge>
        ))}
        {showMore && (
          <Badge variant="outline" className="text-xs">
            +{recommendations.length - maxShow}
          </Badge>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Perfiles Matchrim Cargados
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
          <Users className="h-5 w-5" />
          Perfiles Matchrim Cargados ({filteredProfiles.length})
        </CardTitle>
        <CardDescription>
          Lista de todos los perfiles Matchrim importados en la base de datos
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
          <Button onClick={fetchProfiles} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Potente</TableHead>
                <TableHead>Acidez</TableHead>
                <TableHead>Dulce</TableHead>
                <TableHead>Tánico</TableHead>
                <TableHead>Afrutado</TableHead>
                <TableHead>Uvas Recomendadas</TableHead>
                <TableHead>Regiones</TableHead>
                <TableHead>Estilos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron perfiles que coincidan con la búsqueda' : 'No hay perfiles cargados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>{profile.potente}</TableCell>
                    <TableCell>{profile.acidez}</TableCell>
                    <TableCell>{profile.dulce}</TableCell>
                    <TableCell>{profile.tanico}</TableCell>
                    <TableCell>{profile.afrutado}</TableCell>
                    <TableCell className="max-w-xs">
                      {renderRecommendations(profile.grape_recommendations)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {renderRecommendations(profile.region_recommendations)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {renderRecommendations(profile.style_recommendations)}
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

export default MatchrimProfilesTable;
