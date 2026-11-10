import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

const sections = [
  {
    title: 'Uso de la app',
    body: 'Winerim te ayuda a crear un perfil sensorial Matchrim, filtrar cartas Winerim, analizar cartas escaneadas y guardar vinos. Las recomendaciones son orientativas y no sustituyen el criterio personal, médico o profesional.',
  },
  {
    title: 'Edad legal',
    body: 'La app está dirigida a personas con edad legal para consumir alcohol en su país o región. Winerim no vende alcohol ni promueve el consumo irresponsable.',
  },
  {
    title: 'Cuenta de usuario',
    body: 'Debes usar datos veraces, mantener la confidencialidad de tu acceso y avisar si detectas un uso no autorizado. Algunas funciones, como guardar vinos o escanear cartas asociadas a un restaurante, requieren iniciar sesión.',
  },
  {
    title: 'Contenido que subes',
    body: 'Al subir cartas, imágenes o notas, confirmas que tienes derecho a usarlas para recibir el servicio. No debes subir contenido ilegal, ofensivo, con datos de terceros innecesarios o que infrinja derechos de propiedad intelectual.',
  },
  {
    title: 'Restaurantes sin Winerim',
    body: 'Cuando indicas un restaurante sin Winerim, la app puede guardar una señal de demanda para mostrar interés comercial agregado. Esa información se usa para mejorar el servicio y orientar acciones comerciales.',
  },
  {
    title: 'Disponibilidad',
    body: 'Winerim puede depender de servicios externos como Supabase, APIs de Winerim y servicios de análisis. El servicio puede interrumpirse por mantenimiento, incidencias técnicas o cambios de proveedores.',
  },
  {
    title: 'Cambios',
    body: 'Podemos actualizar estos términos para reflejar cambios del producto, requisitos legales o mejoras operativas. Si el cambio es material, se comunicará por medios razonables dentro de la app o por email.',
  },
];

// 136: `embedded` renders only the terms (no header/back link) inside the registration sheet.
// `onOpenPrivacy` (embedded only) swaps the sheet to the policy instead of leaving the registration form.
const Terms = ({ embedded = false, onOpenPrivacy }: { embedded?: boolean; onOpenPrivacy?: () => void } = {}) => (
  <div className={embedded ? 'bg-stone-50' : 'min-h-screen bg-stone-50'}>
    {!embedded && <Header />}

    <main className={embedded ? 'mx-auto max-w-4xl pb-6' : 'mx-auto max-w-4xl px-4 py-10'}>
      {!embedded && <Button asChild variant="ghost" className="mb-6 gap-2 text-red-900">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Volver a Winerim
        </Link>
      </Button>}

      <section className="rounded-lg bg-red-950 px-6 py-8 text-white shadow-elegant">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-red-950">
          <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Última actualización: 9 de junio de 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold">Términos de uso</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
          Estos términos resumen las condiciones de uso de la app Winerim y de sus funciones
          para perfil sensorial, cartas de vino, escaneo y colección personal.
        </p>
      </section>

      <section className="mt-8 space-y-5">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{section.body}</p>
          </div>
        ))}

        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Privacidad</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El tratamiento de datos personales se explica en la{' '}
            {embedded ? <button type="button" className="font-medium text-red-800 hover:underline" onClick={onOpenPrivacy}>
              política de privacidad
            </button> : <Link to="/privacy" className="font-medium text-red-800 hover:underline">
              política de privacidad
            </Link>}
            .
          </p>
        </div>
      </section>
    </main>
  </div>
);

export default Terms;
