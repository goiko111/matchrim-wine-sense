import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Eye, MapPin, Home, Building2, Calendar } from "lucide-react";

interface PurchaseData {
  type: 'purchase' | 'seen' | 'consumed';
  place_name?: string;
  price?: number;
  purchase_date?: string;
  location_type?: 'store' | 'online' | 'restaurant' | 'home' | 'other';
}

interface PurchaseInfoSelectorProps {
  mode: 'collection' | 'wishlist' | 'tasted';
  onConfirm: (data: PurchaseData) => void;
  onCancel: () => void;
}

export const PurchaseInfoSelector = ({ mode, onConfirm, onCancel }: PurchaseInfoSelectorProps) => {
  const [locationType, setLocationType] = useState<string>('');
  const [placeName, setPlaceName] = useState("");
  const [price, setPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const getTitle = () => {
    switch (mode) {
      case 'collection': return '¿Dónde lo compraste?';
      case 'wishlist': return '¿Dónde lo viste?';
      case 'tasted': return '¿Dónde lo tomaste?';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'collection': return 'Información de compra para tu bodega';
      case 'wishlist': return 'Anota dónde lo viste para recordarlo';
      case 'tasted': return 'Detalles de tu experiencia';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'collection': return ShoppingCart;
      case 'wishlist': return Eye;
      case 'tasted': return MapPin;
    }
  };

  const Icon = getIcon();

  const handleConfirm = () => {
    const data: PurchaseData = {
      type: mode === 'collection' ? 'purchase' : mode === 'wishlist' ? 'seen' : 'consumed',
      location_type: locationType as any,
      place_name: placeName || undefined,
      price: price ? parseFloat(price) : undefined,
      purchase_date: purchaseDate,
    };

    onConfirm(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {getTitle()}
        </CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Type */}
        <div className="space-y-2">
          <Label>Tipo de lugar</Label>
          <RadioGroup value={locationType} onValueChange={setLocationType}>
            <div className="space-y-2">
              {mode === 'collection' && (
                <>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('store')}>
                    <RadioGroupItem value="store" id="store" />
                    <Label htmlFor="store" className="cursor-pointer flex-1 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Tienda / Vinoteca
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('online')}>
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="cursor-pointer flex-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Compra online
                    </Label>
                  </div>
                </>
              )}

              {mode === 'wishlist' && (
                <>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('store')}>
                    <RadioGroupItem value="store" id="store" />
                    <Label htmlFor="store" className="cursor-pointer flex-1 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      En tienda
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('restaurant')}>
                    <RadioGroupItem value="restaurant" id="restaurant" />
                    <Label htmlFor="restaurant" className="cursor-pointer flex-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      En restaurante
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('online')}>
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="cursor-pointer flex-1 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Online / Catálogo
                    </Label>
                  </div>
                </>
              )}

              {mode === 'tasted' && (
                <>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('restaurant')}>
                    <RadioGroupItem value="restaurant" id="restaurant" />
                    <Label htmlFor="restaurant" className="cursor-pointer flex-1 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Restaurante
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('home')}>
                    <RadioGroupItem value="home" id="home" />
                    <Label htmlFor="home" className="cursor-pointer flex-1 flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      En casa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                       onClick={() => setLocationType('other')}>
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="cursor-pointer flex-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Otro lugar
                    </Label>
                  </div>
                </>
              )}
            </div>
          </RadioGroup>
        </div>

        {/* Place Name */}
        <div className="space-y-2">
          <Label htmlFor="place">
            {mode === 'collection' && 'Nombre de la tienda (opcional)'}
            {mode === 'wishlist' && 'Nombre del lugar (opcional)'}
            {mode === 'tasted' && locationType === 'restaurant' && 'Nombre del restaurante'}
            {mode === 'tasted' && locationType === 'home' && 'Lugar de compra del vino (opcional)'}
            {mode === 'tasted' && locationType === 'other' && 'Nombre del lugar'}
          </Label>
          <Input
            id="place"
            placeholder={
              mode === 'collection' ? 'Ej: Vinoteca García' :
              mode === 'wishlist' ? 'Ej: Restaurante Casa Pepe' :
              locationType === 'home' ? 'Ej: Vinoteca García' :
              'Ej: Nombre del lugar'
            }
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price">
            Precio {mode === 'wishlist' ? '(opcional)' : ''}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">
            {mode === 'collection' && 'Fecha de compra'}
            {mode === 'wishlist' && 'Fecha'}
            {mode === 'tasted' && 'Fecha de consumo'}
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

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
