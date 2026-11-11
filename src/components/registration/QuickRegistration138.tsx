import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalLink136 } from '@/components/registration/LegalLink136';
import type { RegistrationData } from '@/hooks/useRegistrationData';

interface QuickRegistration138Props {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onComplete: () => void;
  isSaving: boolean;
}

// 138: the iOS account is email + password. The nine-field first step (phone, surname, country, city, birth date)
// and the two preference steps were the main reason people gave up before their first scan.
const QuickRegistration138: React.FC<QuickRegistration138Props> = ({ data, onUpdate, onComplete, isSaving }) => {
  const accepted = data.termsAccepted && data.privacyAccepted;
  const emailValid = /^\S+@\S+\.\S+$/.test(data.email.trim());
  const isValid = emailValid && data.password.length >= 6 && accepted;
  const legalClass = 'inline-flex min-h-[44px] items-center font-medium text-red-700 underline underline-offset-2';
  return (
    <form className="min-w-0 space-y-5 [&_input]:min-w-0" data-testid="quick-registration138"
      onSubmit={event => { event.preventDefault(); if (isValid && !isSaving) onComplete(); }}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off"
          value={data.email} onChange={event => onUpdate({ email: event.target.value })} required />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" autoComplete="new-password" value={data.password}
          onChange={event => onUpdate({ password: event.target.value })} required minLength={6} aria-describedby="password-hint" />
        <p id="password-hint" className={`mt-1 text-xs ${data.password && data.password.length < 6 ? 'text-red-700' : 'text-muted-foreground'}`}>Mínimo 6 caracteres.</p>
      </div>
      <div>
        <Label htmlFor="firstName">Tu nombre <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input id="firstName" autoComplete="given-name" value={data.firstName} onChange={event => onUpdate({ firstName: event.target.value })} />
      </div>
      <div className="min-w-0">
        <div className="relative min-w-0">
          <Checkbox id="legal138" className="absolute left-[12px] top-[14px] z-10 h-[16px] w-[16px]" checked={accepted}
            onCheckedChange={checked => onUpdate({ termsAccepted: checked === true, privacyAccepted: checked === true })} />
          <Label htmlFor="legal138" className="block min-h-[44px] w-full min-w-0 cursor-pointer py-[10px] pl-[40px] pr-[12px] text-sm leading-relaxed">
            Acepto las condiciones de uso y de privacidad
          </Label>
        </div>
        <p className="flex flex-wrap gap-x-5 pl-[40px] text-sm">
          <LegalLink136 doc="terms" className={legalClass}>Leer los términos y condiciones</LegalLink136>
          <LegalLink136 doc="privacy" className={legalClass}>Leer la política de privacidad</LegalLink136>
        </p>
      </div>
      <Button type="submit" disabled={!isValid || isSaving}
        className="h-auto min-h-[48px] w-full min-w-0 whitespace-normal bg-red-700 px-[12px] py-[12px] text-base hover:bg-red-800">
        {isSaving ? 'Creando cuenta...' : 'Crear mi cuenta'}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">Después podrás hacer el test de gustos y completar tu perfil cuando quieras.</p>
    </form>
  );
};

export default QuickRegistration138;
