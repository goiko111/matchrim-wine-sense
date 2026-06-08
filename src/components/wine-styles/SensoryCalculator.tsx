import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Wine } from 'lucide-react';
import {
  DIAGNOSTIC_STYLE,
  WINE_TYPES,
  clasificarVino,
  type WineClassification,
  type WineType,
} from '@/lib/winerimClassifier';

interface SensoryProfile {
  potente: number;
  acidez: number;
  dulzura: number;
  taninos: number;
  afrutado: number;
}

const ATTRIBUTE_LABELS: Record<keyof SensoryProfile, string> = {
  potente: 'Potencia',
  acidez: 'Acidez',
  dulzura: 'Dulzor',
  taninos: 'Taninos',
  afrutado: 'Afrutado',
};

const ATTRIBUTE_DESCRIPTIONS: Record<keyof SensoryProfile, Record<number, string>> = {
  potente: {
    0: 'Sin intensidad',
    1: 'Muy ligero',
    2: 'Ligero',
    3: 'Moderado',
    4: 'Intenso',
    5: 'Muy intenso',
  },
  acidez: {
    0: 'Sin acidez',
    1: 'Muy baja',
    2: 'Baja',
    3: 'Equilibrada',
    4: 'Alta',
    5: 'Muy alta',
  },
  dulzura: {
    0: 'Muy seco',
    1: 'Seco',
    2: 'Ligeramente dulce',
    3: 'Semidulce',
    4: 'Dulce',
    5: 'Muy dulce',
  },
  taninos: {
    0: 'Sin taninos',
    1: 'Mínimos',
    2: 'Suaves',
    3: 'Equilibrados',
    4: 'Marcados',
    5: 'Intensos',
  },
  afrutado: {
    0: 'Sin fruta',
    1: 'Poco afrutado',
    2: 'Ligeramente afrutado',
    3: 'Moderadamente afrutado',
    4: 'Muy afrutado',
    5: 'Intensamente afrutado',
  },
};

const FLAG_LABELS: Record<WineClassification['flag'], string> = {
  directo: 'Directo',
  auto_reasignado: 'Reasignado',
  auto_reasignado_revisar: 'Revisar',
  sin_encaje: 'Solo admin',
};

const FLAG_CLASSES: Record<WineClassification['flag'], string> = {
  directo: 'bg-green-100 text-green-800 border-green-200',
  auto_reasignado: 'bg-blue-100 text-blue-800 border-blue-200',
  auto_reasignado_revisar: 'bg-amber-100 text-amber-800 border-amber-200',
  sin_encaje: 'bg-red-100 text-red-800 border-red-200',
};

const SensoryCalculator = () => {
  const [profile, setProfile] = useState<SensoryProfile>({
    potente: 2,
    acidez: 4,
    dulzura: 0,
    taninos: 0,
    afrutado: 3,
  });
  const [tipo, setTipo] = useState<WineType>('Blanco');

  const classification = useMemo(
    () => clasificarVino(profile.potente, profile.acidez, profile.dulzura, profile.taninos, profile.afrutado, tipo),
    [profile, tipo],
  );

  const updateProfile = (attribute: keyof SensoryProfile, value: number[]) => {
    setProfile((current) => ({
      ...current,
      [attribute]: value[0],
    }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Perfil Sensorial
          </CardTitle>
          <CardDescription>
            Clasificación híbrida V4.1 por atributos sensoriales y tipo físico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-8">
            <div className="space-y-6">
              <div>
                <label className="block font-medium text-red-800 mb-2">Tipo físico</label>
                <Select value={tipo} onValueChange={(value) => setTipo(value as WineType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINE_TYPES.map((wineType) => (
                      <SelectItem key={wineType} value={wineType}>
                        {wineType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-6">
                {(Object.keys(ATTRIBUTE_LABELS) as Array<keyof SensoryProfile>).map((attribute) => (
                  <div key={attribute}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-medium">{ATTRIBUTE_LABELS[attribute]}</label>
                      <span className="text-sm text-gray-600">{profile[attribute]}</span>
                    </div>
                    <Slider
                      value={[profile[attribute]]}
                      onValueChange={(value) => updateProfile(attribute, value)}
                      max={5}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {ATTRIBUTE_DESCRIPTIONS[attribute][profile[attribute]]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-red-100 bg-red-50/60 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Estilo final</p>
                    <h3 className="text-2xl font-bold text-red-950 mt-1">
                      {classification.estiloFinal}
                    </h3>
                  </div>
                  <Badge variant="outline" className={FLAG_CLASSES[classification.flag]}>
                    {FLAG_LABELS[classification.flag]}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-white p-3 border">
                    <p className="text-gray-500">Origen V3</p>
                    <p className="font-semibold text-gray-900">{classification.estiloOrigen}</p>
                  </div>
                  <div className="rounded-md bg-white p-3 border">
                    <p className="text-gray-500">Encaje</p>
                    <p className="font-semibold text-gray-900">{classification.encajePct}%</p>
                  </div>
                </div>

                {classification.estiloFinal === DIAGNOSTIC_STYLE && (
                  <p className="mt-4 text-sm text-red-800">
                    Este resultado queda fuera del catálogo público y entra en revisión interna.
                  </p>
                )}
              </div>

              <div className="rounded-lg border bg-white p-5">
                <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                  <Wine className="h-4 w-4 text-red-700" />
                  Alternativas por tipo
                </h4>
                {classification.alternativas.length ? (
                  <div className="space-y-3">
                    {classification.alternativas.map((alternative) => (
                      <div key={alternative.estilo} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-700">{alternative.estilo}</span>
                        <span className="text-sm font-semibold text-gray-900">{alternative.encaje}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    El estilo de origen ya es compatible con el tipo físico.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SensoryCalculator;
