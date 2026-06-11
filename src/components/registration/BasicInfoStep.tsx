
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrationData } from '@/hooks/useRegistrationData';
import { useI18n } from '@/i18n';

interface BasicInfoStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
}

// Lightweight country code list (no external packages).
// Future enhancement: switch to Google Places / libphonenumber when API key is provisioned.
const COUNTRY_CODES: { code: string; dial: string; label: string }[] = [
  { code: 'ES', dial: '+34', label: '🇪🇸 España (+34)' },
  { code: 'FR', dial: '+33', label: '🇫🇷 France (+33)' },
  { code: 'PT', dial: '+351', label: '🇵🇹 Portugal (+351)' },
  { code: 'IT', dial: '+39', label: '🇮🇹 Italia (+39)' },
  { code: 'DE', dial: '+49', label: '🇩🇪 Deutschland (+49)' },
  { code: 'GB', dial: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { code: 'US', dial: '+1', label: '🇺🇸 United States (+1)' },
  { code: 'MX', dial: '+52', label: '🇲🇽 México (+52)' },
  { code: 'AR', dial: '+54', label: '🇦🇷 Argentina (+54)' },
  { code: 'CL', dial: '+56', label: '🇨🇱 Chile (+56)' },
  { code: 'CO', dial: '+57', label: '🇨🇴 Colombia (+57)' },
  { code: 'OTHER', dial: '+', label: '🌐 Otro' },
];

const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'España', label: '🇪🇸 España' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Portugal', label: '🇵🇹 Portugal' },
  { value: 'Italia', label: '🇮🇹 Italia' },
  { value: 'Deutschland', label: '🇩🇪 Deutschland' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'México', label: '🇲🇽 México' },
  { value: 'Argentina', label: '🇦🇷 Argentina' },
  { value: 'Chile', label: '🇨🇱 Chile' },
  { value: 'Colombia', label: '🇨🇴 Colombia' },
  { value: 'OTHER', label: '🌐 Otro' },
];

const splitPhone = (raw: string): { dial: string; rest: string } => {
  if (!raw) return { dial: '+34', rest: '' };
  const match = COUNTRY_CODES.find((c) => c.dial !== '+' && raw.startsWith(c.dial));
  if (match) return { dial: match.dial, rest: raw.slice(match.dial.length).trim() };
  return { dial: '+34', rest: raw };
};

const splitLocation = (raw: string): { country: string; city: string } => {
  if (!raw) return { country: '', city: '' };
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], country: parts.slice(1).join(', ') };
  return { city: '', country: parts[0] || '' };
};

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ data, onUpdate, onNext }) => {
  const { t, locale, setLocale } = useI18n();
  const { dial: initialDial, rest: initialRest } = splitPhone(data.phone);
  const [dial, setDial] = React.useState(initialDial);
  const [phoneLocal, setPhoneLocal] = React.useState(initialRest);

  const initialLocation = splitLocation(data.location);
  const [country, setCountry] = React.useState(initialLocation.country);
  const [customCountry, setCustomCountry] = React.useState(
    COUNTRY_OPTIONS.some((c) => c.value === initialLocation.country) ? '' : initialLocation.country
  );
  const [city, setCity] = React.useState(initialLocation.city);

  React.useEffect(() => {
    const finalCountry = country === 'OTHER' ? customCountry.trim() : country;
    const locationStr = [city, finalCountry].filter(Boolean).join(', ');
    if (locationStr !== data.location) {
      onUpdate({ location: locationStr });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, customCountry, city]);

  React.useEffect(() => {
    const combined = phoneLocal ? `${dial} ${phoneLocal.trim()}` : '';
    if (combined !== data.phone) onUpdate({ phone: combined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial, phoneLocal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onNext();
  };

  const isValid = !!(data.firstName && data.lastName && data.email && data.password && phoneLocal);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">{t('reg.basic.firstName')} *</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t('reg.basic.lastName')} *</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => onUpdate({ lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">{t('auth.email')} *</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="password">{t('auth.password')} *</Label>
        <Input
          id="password"
          type="password"
          value={data.password}
          onChange={(e) => onUpdate({ password: e.target.value })}
          required
          minLength={6}
        />
      </div>

      <div>
        <Label>{t('reg.basic.phone')} *</Label>
        <div className="flex gap-2">
          <div className="w-40">
            <Select value={dial} onValueChange={setDial}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.dial}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="tel"
            inputMode="tel"
            value={phoneLocal}
            onChange={(e) => setPhoneLocal(e.target.value)}
            placeholder="600 000 000"
            required
            className="flex-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="preferredLanguage">{t('reg.basic.preferredLanguage')}</Label>
        <Select
          value={data.preferredLanguage}
          onValueChange={(value) => {
            onUpdate({ preferredLanguage: value });
            if (value === 'ES' || value === 'EN' || value === 'FR') setLocale(value);
          }}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">{t('reg.basic.country')}</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder={t('reg.basic.countryHint')} />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {country === 'OTHER' && (
            <Input
              className="mt-2"
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
              placeholder={t('reg.basic.country')}
            />
          )}
        </div>
        <div>
          <Label htmlFor="city">{t('reg.basic.city')}</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('reg.basic.cityHint')}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="birthDate">{t('reg.basic.birthDate')}</Label>
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
        {t('common.continue')}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        {locale === 'EN'
          ? 'Tip: city autocomplete with Google Places will be enabled once the API key is provisioned.'
          : locale === 'FR'
          ? 'Astuce : l’autocomplétion de la ville via Google Places sera activée dès que la clé API sera disponible.'
          : 'Pronto: autocompletado de ciudad con Google Places cuando la API key esté disponible.'}
      </p>
    </form>
  );
};

export default BasicInfoStep;
