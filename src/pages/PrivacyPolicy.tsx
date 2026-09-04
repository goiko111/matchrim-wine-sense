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
      'Cartas escaneadas: imagen o PDF que subes para analizar una carta de vinos y mostrar recomendaciones.',
      'Datos tecnicos necesarios para operar el servicio, seguridad, diagnostico y prevencion de abuso.',
    ],
  },
  {
    title: 'Para que usamos los datos',
    items: [
      'Crear y mantener tu cuenta.',
      'Generar tu perfil sensorial y recomendar vinos compatibles.',
      'Filtrar cartas Winerim con tu codigo Matchrim.',
      'Analizar cartas de restaurantes que aun no usan Winerim.',
      'Mejorar tu perfil en funcion de los vinos que guardas y puntuas.',
      'Detectar demanda de Winerim en restaurantes indicados por usuarios.',
      'Mantener la seguridad, disponibilidad y calidad del servicio.',
    ],
  },
  {
    title: 'Servicios y encargados',
    items: [
      'Supabase se usa para autenticacion, base de datos, almacenamiento operativo y funciones edge.',
      'Las funciones de analisis pueden usar APIs de Winerim y servicios de inteligencia artificial para extraer vinos y calcular afinidad.',
      'No vendemos tus datos personales a terceros.',
      'No usamos tus datos para publicidad comportamental ni tracking publicitario salvo que se indique y se solicite consentimiento especifico.',
    ],
  },
  {
    title: 'Conservacion',
    items: [
      'Conservamos los datos de cuenta y perfil mientras mantengas la cuenta activa.',
      'Los vinos guardados y puntuaciones permanecen en tu cuenta hasta que los elimines o solicites la eliminacion.',
      'Las cartas subidas se tratan para prestar el servicio de escaneo y se conservan solo durante el tiempo necesario para operar, mejorar o proteger el servicio.',
      'Podemos conservar registros tecnicos durante el tiempo necesario para seguridad, soporte y cumplimiento legal.',
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
          Volver a Winerim
        </Link>
      </Button>

      <section className="rounded-lg bg-red-950 px-6 py-8 text-white shadow-elegant">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-red-950">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Ultima actualizacion: 9 de junio de 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold">Politica de privacidad</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
          Esta politica explica como Winerim trata los datos personales necesarios para crear tu
          perfil Matchrim, filtrar cartas de vino, analizar cartas escaneadas y guardar tus vinos.
        </p>
      </section>

      <section className="mt-8 space-y-6">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Responsable</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Winerim es el responsable del tratamiento de los datos asociados a la app Winerim.
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
