import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserX, Mail, Calendar, MapPin, Eye, Wine, Utensils, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface WinePreferences {
  wine_types: string[] | null;
  taste_preferences: string[] | null;
  price_range: string | null;
  experience_type: string[] | null;
}

interface DietaryPreferences {
  dietary_restrictions: string[] | null;
  food_pairings: string[] | null;
}

interface QuizResult {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
  profile_description: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  preferred_language: string | null;
  created_at: string;
  birth_date: string | null;
  terms_accepted: boolean | null;
  privacy_accepted: boolean | null;
  wine_preferences: WinePreferences | null;
  dietary_preferences: DietaryPreferences | null;
  quiz_results: QuizResult[];
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch related data for each user
      const usersWithDetails = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const [winePrefs, dietaryPrefs, quizResults] = await Promise.all([
            supabase
              .from("wine_preferences")
              .select("*")
              .eq("user_id", profile.id)
              .maybeSingle(),
            supabase
              .from("dietary_preferences")
              .select("*")
              .eq("user_id", profile.id)
              .maybeSingle(),
            supabase
              .from("quiz_results")
              .select("*")
              .eq("user_id", profile.id)
              .order("created_at", { ascending: false })
          ]);

          return {
            ...profile,
            wine_preferences: winePrefs.data,
            dietary_preferences: dietaryPrefs.data,
            quiz_results: quizResults.data || []
          };
        })
      );

      setUsers(usersWithDetails);
      setFilteredUsers(usersWithDetails);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          {filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""} registrado{filteredUsers.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Idioma</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <UserX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No se encontraron usuarios</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : "Sin nombre"}
                        </span>
                        {user.birth_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(user.birth_date), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.email || "Sin email"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{user.location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.preferred_language || "ES"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(user.created_at), "dd MMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.terms_accepted && (
                          <Badge variant="secondary" className="text-xs">
                            Términos
                          </Badge>
                        )}
                        {user.privacy_accepted && (
                          <Badge variant="secondary" className="text-xs">
                            Privacidad
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Perfil Completo de {user.first_name || user.last_name
                                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                : "Usuario"}
                            </DialogTitle>
                            <DialogDescription>
                              Información detallada del usuario y sus preferencias
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6">
                            {/* Información Personal */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Información Personal
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Email</p>
                                  <p className="font-medium">{user.email || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Ubicación</p>
                                  <p className="font-medium">{user.location || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                                  <p className="font-medium">
                                    {user.birth_date ? format(new Date(user.birth_date), "dd/MM/yyyy") : "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Idioma Preferido</p>
                                  <p className="font-medium">{user.preferred_language || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                                  <p className="font-medium">
                                    {format(new Date(user.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Consentimientos</p>
                                  <div className="flex gap-2 mt-1">
                                    {user.terms_accepted && <Badge variant="secondary">Términos</Badge>}
                                    {user.privacy_accepted && <Badge variant="secondary">Privacidad</Badge>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Preferencias de Vino */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Wine className="h-5 w-5" />
                                Preferencias de Vino
                              </h3>
                              {user.wine_preferences ? (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Tipos de Vino</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {user.wine_preferences.wine_types?.map((type, idx) => (
                                        <Badge key={idx} variant="outline">{type}</Badge>
                                      )) || <span className="text-sm">-</span>}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Preferencias de Sabor</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {user.wine_preferences.taste_preferences?.map((pref, idx) => (
                                        <Badge key={idx} variant="outline">{pref}</Badge>
                                      )) || <span className="text-sm">-</span>}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Rango de Precio</p>
                                    <p className="font-medium">{user.wine_preferences.price_range || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Tipo de Experiencia</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {user.wine_preferences.experience_type?.map((exp, idx) => (
                                        <Badge key={idx} variant="outline">{exp}</Badge>
                                      )) || <span className="text-sm">-</span>}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-muted-foreground">No hay preferencias de vino registradas</p>
                              )}
                            </div>

                            <Separator />

                            {/* Preferencias Dietéticas */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Utensils className="h-5 w-5" />
                                Preferencias Dietéticas
                              </h3>
                              {user.dietary_preferences ? (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Restricciones Dietéticas</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {user.dietary_preferences.dietary_restrictions?.map((restriction, idx) => (
                                        <Badge key={idx} variant="outline">{restriction}</Badge>
                                      )) || <span className="text-sm">-</span>}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Maridajes Favoritos</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {user.dietary_preferences.food_pairings?.map((pairing, idx) => (
                                        <Badge key={idx} variant="outline">{pairing}</Badge>
                                      )) || <span className="text-sm">-</span>}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-muted-foreground">No hay preferencias dietéticas registradas</p>
                              )}
                            </div>

                            <Separator />

                            {/* Resultados del Quiz */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Resultados del Quiz Matchrim ({user.quiz_results.length})
                              </h3>
                              {user.quiz_results.length > 0 ? (
                                <div className="space-y-4">
                                  {user.quiz_results.map((result, idx) => (
                                    <div key={idx} className="p-4 border rounded-lg">
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {format(new Date(result.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                                      </p>
                                      <p className="mb-3">{result.profile_description}</p>
                                      <div className="grid grid-cols-5 gap-3">
                                        <div className="text-center">
                                          <p className="text-xs text-muted-foreground">Potente</p>
                                          <p className="text-lg font-bold">{result.potente}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-muted-foreground">Acidez</p>
                                          <p className="text-lg font-bold">{result.acidez}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-muted-foreground">Dulce</p>
                                          <p className="text-lg font-bold">{result.dulce}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-muted-foreground">Tánico</p>
                                          <p className="text-lg font-bold">{result.tanico}</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-xs text-muted-foreground">Afrutado</p>
                                          <p className="text-lg font-bold">{result.afrutado}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">No hay resultados del quiz registrados</p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
}
