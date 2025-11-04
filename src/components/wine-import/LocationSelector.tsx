import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { MapPin, Home, Building2, Navigation, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LocationData {
  type: 'winerim_restaurant' | 'external_restaurant' | 'home' | 'other';
  place_name?: string;
  place_details?: any;
  restaurant_id?: string;
}

interface LocationSelectorProps {
  onLocationSelected: (location: LocationData) => void;
  onCancel: () => void;
}

export const LocationSelector = ({ onLocationSelected, onCancel }: LocationSelectorProps) => {
  const [locationType, setLocationType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [customPlaceName, setCustomPlaceName] = useState("");

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      const { data, error } = await supabase.functions.invoke('detect-location', {
        body: { latitude, longitude }
      });

      if (error) throw error;

      setNearbyPlaces(data.nearby_places || []);
      
      if (data.winerim_restaurants?.length > 0) {
        toast.success("¡Restaurante Winerim detectado!");
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      toast.error("No se pudo detectar tu ubicación");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleConfirm = () => {
    if (!locationType) {
      toast.error("Selecciona dónde estás tomando el vino");
      return;
    }

    const locationData: LocationData = {
      type: locationType as any,
    };

    if (locationType === 'external_restaurant' && selectedPlace) {
      locationData.place_name = selectedPlace.name;
      locationData.place_details = selectedPlace;
    } else if (locationType === 'other' && customPlaceName) {
      locationData.place_name = customPlaceName;
    }

    onLocationSelected(locationData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          ¿Dónde lo estás tomando?
        </CardTitle>
        <CardDescription>
          Esto nos ayuda a personalizar mejor tus recomendaciones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={detectLocation}
          disabled={detectingLocation}
          variant="outline"
          className="w-full gap-2"
        >
          {detectingLocation ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Detectando ubicación...
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              Detectar mi ubicación
            </>
          )}
        </Button>

        <RadioGroup value={locationType} onValueChange={setLocationType}>
          <div className="space-y-3">
            {/* Home */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                 onClick={() => setLocationType('home')}>
              <RadioGroupItem value="home" id="home" />
              <Label htmlFor="home" className="flex items-center gap-2 cursor-pointer flex-1">
                <Home className="h-4 w-4" />
                <div>
                  <p className="font-medium">En casa</p>
                  <p className="text-sm text-muted-foreground">Disfrutando en casa</p>
                </div>
              </Label>
            </div>

            {/* External Restaurant */}
            {nearbyPlaces.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                     onClick={() => setLocationType('external_restaurant')}>
                  <RadioGroupItem value="external_restaurant" id="external_restaurant" />
                  <Label htmlFor="external_restaurant" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <p className="font-medium">En un restaurante</p>
                      <p className="text-sm text-muted-foreground">Selecciona de los lugares cercanos</p>
                    </div>
                  </Label>
                </div>

                {locationType === 'external_restaurant' && (
                  <div className="ml-9 space-y-2 max-h-48 overflow-y-auto">
                    {nearbyPlaces.map((place) => (
                      <button
                        key={place.place_id}
                        onClick={() => setSelectedPlace(place)}
                        className={`w-full text-left p-3 rounded-md border transition-colors ${
                          selectedPlace?.place_id === place.place_id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <p className="font-medium text-sm">{place.name}</p>
                        <p className="text-xs text-muted-foreground">{place.address}</p>
                        {place.rating && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            ⭐ {place.rating}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Other */}
            <div className="space-y-2">
              <div className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                   onClick={() => setLocationType('other')}>
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="cursor-pointer flex-1">
                  <p className="font-medium">Otro lugar</p>
                  <p className="text-sm text-muted-foreground">Hotel, bar, evento...</p>
                </Label>
              </div>

              {locationType === 'other' && (
                <div className="ml-9">
                  <Input
                    placeholder="Nombre del lugar..."
                    value={customPlaceName}
                    onChange={(e) => setCustomPlaceName(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </RadioGroup>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="flex-1">
            Confirmar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
