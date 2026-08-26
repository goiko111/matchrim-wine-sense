import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

const sections = [
  {
    title: 'Datos que tratamos',
    items: [
      'Datos de cuenta: email, nombre y preferencias indicadas durante el registro.',
      'Perfil Matchrim: respuestas del test sensorial, codigo generado y atributos de gusto.',
      'Mis vinos: vinos guardados, puntuaciones, notas, afinidad y lugar de consumo cuando lo indiques.',
      'Uso en restaurantes: restaurante indicado, codigo Matchrim usado y senales de demanda para Winerim.',
      'Imagenes seleccionadas: etiquetas, botellas, expositores, cartas, pizarras, menus o platos que eliges analizar.',
      'Resultados del analisis: regiones detectadas, texto OCR, candidatos, correcciones, confianza y afinidad.',
      'Datos tecnicos necesarios para operar el servicio, seguridad, diagnostico y prevencion de abuso.',
    ],
  },
  {
    title: 'Para que usamos los datos',
    items: [
      'Crear y mantener tu cuenta.',
      'Generar tu perfil sensorial y recomendar vinos compatibles.',
      'Filtrar cartas Winerim con tu codigo Matchrim.',
      'Detectar e identificar vinos por regiones y analizar cartas, pizarras, menus y platos.',
      'Mejorar tu perfil en funcion de los vinos que guardas y puntuas.',
      'Detectar demanda de Winerim en restaurantes indicados por usuarios.',
      'Mantener la seguridad, disponibilidad y calidad del servicio.',
    ],
  },
  {
    title: 'Servicios y encargados',
    items: [
      'Supabase se usa para autenticacion, base de datos, almacenamiento operativo y funciones edge.',
      'Las funciones de vision usan actualmente Lovable AI Gateway y modelos Google Gemini para detectar regiones, leer texto y proponer candidatos. El proveedor o modelo puede cambiar y esta politica se actualizara antes de usar uno nuevo en produccion.',
      'Las imagenes y recortes necesarios se transmiten cifrados a esos servicios cuando pulsas analizar.',
      'No vendemos tus datos personales a terceros.',
      'No usamos tus datos para publicidad comportamental ni tracking publicitario salvo que se indique y se solicite consentimiento especifico.',
    ],
  },
  {
    title: 'Conservacion',
    items: [
      'Conservamos los datos de cuenta y perfil mientras mantengas la cuenta activa.',
      'Los vinos guardados y puntuaciones permanecen en tu cuenta hasta que los elimines o solicites la eliminacion.',
      'Matchrim no guarda por defecto la imagen original en tu cuenta. Se mantiene en memoria durante el analisis y puede permanecer localmente mientras reintentas o revisas el resultado.',
      'Los vinos y correcciones que confirmes si pueden guardarse en tu cuenta e historial hasta que los elimines.',
      'La retencion maxima aplicable en los proveedores de IA debe quedar validada y publicada antes de abrir el reconocimiento visual a usuarios externos.',
      'Podemos conservar registros tecnicos durante el tiempo necesario para seguridad, soporte y cumplimiento legal.',
    ],
  },
  {
    title: 'Camara, fotos y control',
    items: [
      'La app solicita camara solo al hacer una foto y fototeca solo al elegir una imagen. No recorre tu biblioteca completa.',
      'Puedes revocar esos permisos en Ajustes de iOS. Sin permiso puedes seguir usando las partes de Matchrim que no requieren imagen.',
      'Evita incluir personas, documentos, matriculas, direcciones u otros datos sensibles en el encuadre.',
      'Una identidad dudosa se muestra como candidata y puede corregirse o descartarse; Matchrim no debe convertir incertidumbre en una identidad confirmada.',
    ],
  },
  {
    title: 'Tus derechos',
    items: [
      'Puedes solicitar acceso, rectificacion, eliminacion, oposicion o limitacion del tratamiento.',
      'Puedes pedir la eliminacion de tu cuenta y datos asociados.',
      'Puedes retirar consentimientos cuando el tratamiento dependa de consentimiento.',
      'Para ejercer derechos, escribe a hola@winerim.com desde el email asociado a tu cuenta.',
    ],
  },
];

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-stone-50">
    <Header />

    <main className="mx-auto max-w-4xl px-4 py-10">
      <Button asChild variant="ghost" className="mb-6 gap-2 text-red-900">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Volver a Matchrim
        </Link>
      </Button>

      <section className="rounded-lg bg-red-950 px-6 py-8 text-white shadow-elegant">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-red-950">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Ultima actualizacion: 26 de agosto de 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold">Politica de privacidad</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
          Esta politica explica como Matchrim, operado por Winerim, trata los datos necesarios para
          crear tu perfil sensorial, analizar imagenes de vino y guardar tus decisiones.
        </p>
      </section>

      <section className="mt-8 space-y-6">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Responsable</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Winerim es el responsable del tratamiento de los datos asociados a Matchrim.
            Para consultas de privacidad, escribe a{' '}
            <a href="mailto:hola@winerim.com" className="font-medium text-red-800 hover:underline">
              hola@winerim.com
            </a>
            .
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-red-800" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
            <Mail className="h-5 w-5 text-red-800" />
            Contacto
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Para privacidad, soporte o eliminacion de cuenta: {' '}
            <a href="mailto:hola@winerim.com" className="font-medium text-red-800 hover:underline">
              hola@winerim.com
            </a>
            .
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tambien puedes iniciar una solicitud desde{' '}
            <Link to="/account/delete" className="font-medium text-red-800 hover:underline">
              eliminar cuenta
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  </div>
);

export default PrivacyPolicy;
