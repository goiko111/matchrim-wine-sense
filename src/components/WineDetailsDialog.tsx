import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Wine, Thermometer, Award, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WineDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wine: {
    nombre: string;
    bodega: string;
    pais?: string;
    region?: string;
    tipo_de_uva?: string;
    puntuacion?: number;
    imagen_url?: string;
  };
}

interface WineDetails {
  descripcion: string;
  notas_cata: {
    vista: string;
    nariz: string;
    boca: string;
  };
  caracteristicas: {
    varietal: string;
    capacidad: string;
    alcohol: string;
    temperatura_servicio: string;
    potencial_guarda: string;
  };
  maridajes: string[];
  historia: string;
  premios: string[] | null;
}

export const WineDetailsDialog = ({ open, onOpenChange, wine }: WineDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<WineDetails | null>(null);

  const fetchWineDetails = async () => {
    if (details) return; // Ya tenemos los datos

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('wine-details', {
        body: {
          nombre: wine.nombre,
          bodega: wine.bodega,
          pais: wine.pais,
          region: wine.region,
          uva: wine.tipo_de_uva,
        },
      });

      if (error) throw error;

      setDetails(data);
    } catch (error) {
      console.error('Error fetching wine details:', error);
      toast.error("Error al cargar los detalles del vino");
    } finally {
      setLoading(false);
    }
  };

  // Fetch details when dialog opens
  useState(() => {
    if (open) {
      fetchWineDetails();
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-red-900 flex items-center gap-2">
            <Wine className="w-6 h-6" />
            {wine.nombre}
          </DialogTitle>
          <p className="text-gray-600">{wine.bodega}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-700" />
            <span className="ml-3 text-gray-600">Cargando información...</span>
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Image and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 flex justify-center">
                <img
                  src={wine.imagen_url || '/placeholder.svg'}
                  alt={wine.nombre}
                  className="max-h-80 object-contain rounded-lg shadow-lg"
                />
              </div>

              <div className="md:col-span-2 space-y-4">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Descripción</h3>
                  <p className="text-gray-700 leading-relaxed">{details.descripcion}</p>
                </div>

                {/* Characteristics */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-red-900">Varietal:</span>
                    <p className="text-gray-700">{details.caracteristicas.varietal}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-red-900">Capacidad:</span>
                    <p className="text-gray-700">{details.caracteristicas.capacidad}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-red-900">Alcohol:</span>
                    <p className="text-gray-700">{details.caracteristicas.alcohol}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-red-700" />
                    <span className="font-semibold text-red-900">Servir a:</span>
                    <p className="text-gray-700">{details.caracteristicas.temperatura_servicio}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-red-900">Guarda:</span>
                    <p className="text-gray-700">{details.caracteristicas.potencial_guarda}</p>
                  </div>
                </div>

                {wine.puntuacion && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-900">Puntuación:</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {wine.puntuacion}/100
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Tasting Notes */}
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-3">Notas de Cata</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-rose-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Vista</h4>
                  <p className="text-sm text-gray-700">{details.notas_cata.vista}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Nariz</h4>
                  <p className="text-sm text-gray-700">{details.notas_cata.nariz}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Boca</h4>
                  <p className="text-sm text-gray-700">{details.notas_cata.boca}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pairings */}
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Maridajes Recomendados
              </h3>
              <div className="flex flex-wrap gap-2">
                {details.maridajes.map((maridaje, index) => (
                  <Badge key={index} variant="outline" className="text-red-700 border-red-300">
                    {maridaje}
                  </Badge>
                ))}
              </div>
            </div>

            {/* History */}
            {details.historia && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Historia</h3>
                  <p className="text-gray-700 leading-relaxed">{details.historia}</p>
                </div>
              </>
            )}

            {/* Awards */}
            {details.premios && details.premios.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Premios y Reconocimientos
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {details.premios.map((premio, index) => (
                      <li key={index}>{premio}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
