
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrationData } from '@/hooks/useRegistrationData';

interface BasicInfoStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, onUpdate, onNext }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.firstName && data.lastName && data.email && data.password && data.phone) {
      onNext();
    }
  };

  const isValid = data.firstName && data.lastName && data.email && data.password && data.phone;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Nombre *</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Apellido *</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => onUpdate({ lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Contraseña *</Label>
        <Input
          id="password"
          type="password"
          value={data.password}
          onChange={(e) => onUpdate({ password: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Teléfono *</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          placeholder="+34 600 000 000"
          required
        />
      </div>

      <div>
        <Label htmlFor="preferredLanguage">Idioma Preferido</Label>
        <Select 
          value={data.preferredLanguage} 
          onValueChange={(value) => onUpdate({ preferredLanguage: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ES">Español</SelectItem>
            <SelectItem value="EN">English</SelectItem>
            <SelectItem value="FR">Français</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          value={data.location}
          onChange={(e) => onUpdate({ location: e.target.value })}
          placeholder="Ciudad, País"
        />
      </div>

      <div>
        <Label htmlFor="birthDate">Fecha de Nacimiento (opcional)</Label>
        <Input
          id="birthDate"
          type="date"
          value={data.birthDate}
          onChange={(e) => onUpdate({ birthDate: e.target.value })}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-red-700 hover:bg-red-800"
        disabled={!isValid}
      >
        Continuar
      </Button>
    </form>
  );
};

export default BasicInfoStep;
