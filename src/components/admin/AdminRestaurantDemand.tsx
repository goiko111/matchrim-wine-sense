import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, ScanLine, Sparkles, TrendingUp, Users, Wine } from 'lucide-react';

type RestaurantSession = {
  id: string;
  created_at: string;
  restaurant_name: string;
  restaurant_address: string | null;
  restaurant_place_id: string | null;
  is_winerim_restaurant: boolean;
  matchrim_code: string;
  menu_scan_used: boolean;
  wines_detected: number | null;
  user_id: string | null;
};

type RestaurantDemandRow = {
  restaurantName: string;
  address: string | null;
  placeId: string | null;
  sessions: number;
  uniqueUsers: number;
  winerimSessions: number;
  scans: number;
  winesDetected: number;
  lastUsed: string;
  codes: string[];
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

export function AdminRestaurantDemand() {
  const [sessions, setSessions] = useState<RestaurantSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDemand = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('restaurant_matchrim_sessions')
        .select('id, created_at, restaurant_name, restaurant_address, restaurant_place_id, is_winerim_restaurant, matchrim_code, menu_scan_used, wines_detected, user_id')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error loading restaurant demand:', error);
        setError('No se pudo cargar la demanda de restaurantes. Revisa que la migración esté aplicada.');
        setSessions([]);
      } else {
        setSessions((data as RestaurantSession[]) || []);
      }

      setLoading(false);
    };

    fetchDemand();
  }, []);

  const demandRows = useMemo(() => {
    const map = new Map<string, RestaurantDemandRow & { userIds: Set<string>; codeSet: Set<string> }>();

    sessions.forEach((session) => {
      const key = `${session.restaurant_name.toLowerCase()}|${session.restaurant_place_id || session.restaurant_address || ''}`;
      const existing = map.get(key) || {
        restaurantName: session.restaurant_name,
        address: session.restaurant_address,
        placeId: session.restaurant_place_id,
        sessions: 0,
        uniqueUsers: 0,
        winerimSessions: 0,
        scans: 0,
        winesDetected: 0,
        lastUsed: session.created_at,
        codes: [],
        userIds: new Set<string>(),
        codeSet: new Set<string>(),
      };

      existing.sessions += 1;
      if (session.user_id) existing.userIds.add(session.user_id);
      if (session.is_winerim_restaurant) existing.winerimSessions += 1;
      if (session.menu_scan_used) existing.scans += 1;
      existing.winesDetected += session.wines_detected || 0;
      existing.codeSet.add(session.matchrim_code);
      if (new Date(session.created_at) > new Date(existing.lastUsed)) {
        existing.lastUsed = session.created_at;
      }

      map.set(key, existing);
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        uniqueUsers: row.userIds.size,
        codes: Array.from(row.codeSet).slice(0, 3),
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [sessions]);

  const summary = useMemo(() => {
    const uniqueRestaurants = new Set(demandRows.map((row) => `${row.restaurantName}|${row.placeId || row.address || ''}`));
    const uniqueUsers = new Set(sessions.map((session) => session.user_id).filter(Boolean));
    return {
      totalSessions: sessions.length,
      uniqueRestaurants: uniqueRestaurants.size,
      uniqueUsers: uniqueUsers.size,
      winerimSessions: sessions.filter((session) => session.is_winerim_restaurant).length,
      nonWinerimScans: sessions.filter((session) => !session.is_winerim_restaurant && session.menu_scan_used).length,
      winesDetected: sessions.reduce((sum, session) => sum + (session.wines_detected || 0), 0),
    };
  }, [demandRows, sessions]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usos Matchrim en restaurantes</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              {summary.totalSessions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Restaurantes con demanda</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Building2 className="h-6 w-6 text-primary" />
              {summary.uniqueRestaurants}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usuarios que han usado código</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Users className="h-6 w-6 text-primary" />
              {summary.uniqueUsers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sesiones en restaurantes Winerim</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Sparkles className="h-6 w-6 text-primary" />
              {summary.winerimSessions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cartas escaneadas no Winerim</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <ScanLine className="h-6 w-6 text-primary" />
              {summary.nonWinerimScans}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Vinos detectados en cartas</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Wine className="h-6 w-6 text-primary" />
              {summary.winesDetected}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurantes con más demanda</CardTitle>
          <CardDescription>
            Señales comerciales generadas por usuarios que intentan usar su código Winerim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demandRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Todavía no hay sesiones de restaurante registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead className="text-right">Usuarios</TableHead>
                  <TableHead className="text-right">Escaneos</TableHead>
                  <TableHead>Códigos frecuentes</TableHead>
                  <TableHead>Último uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandRows.slice(0, 25).map((row) => (
                  <TableRow key={`${row.restaurantName}-${row.placeId || row.address || 'unknown'}`}>
                    <TableCell>
                      <div className="font-medium">{row.restaurantName}</div>
                      <div className="text-xs text-muted-foreground">{row.address || row.placeId || 'Sin ubicación'}</div>
                    </TableCell>
                    <TableCell>
                      {row.winerimSessions > 0 ? (
                        <Badge className="bg-green-700">Winerim</Badge>
                      ) : (
                        <Badge variant="outline">No Winerim</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.sessions}</TableCell>
                    <TableCell className="text-right">{row.uniqueUsers}</TableCell>
                    <TableCell className="text-right">{row.scans}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.codes.map((code) => (
                          <Badge key={code} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(row.lastUsed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
