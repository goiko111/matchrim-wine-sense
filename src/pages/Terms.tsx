import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

const sections = [
  {
    title: 'Uso de la app',
    body: 'Winerim te ayuda a crear un perfil sensorial Matchrim, filtrar cartas Winerim, analizar cartas escaneadas y guardar vinos. Las recomendaciones son orientativas y no sustituyen el criterio personal, medico o profesional.',
  },
  {
    title: 'Edad legal',
    body: 'La app esta dirigida a personas con edad legal para consumir alcohol en su pais o region. Winerim no vende alcohol ni promueve el consumo irresponsable.',
  },
  {
    title: 'Cuenta de usuario',
    body: 'Debes usar datos veraces, mantener la confidencialidad de tu acceso y avisar si detectas un uso no autorizado. Algunas funciones, como guardar vinos o escanear cartas asociadas a un restaurante, requieren iniciar sesion.',
  },
  {
    title: 'Contenido que subes',
    body: 'Al subir cartas, imagenes o notas, confirmas que tienes derecho a usarlas para recibir el servicio. No debes subir contenido ilegal, ofensivo, con datos de terceros innecesarios o que infrinja derechos de propiedad intelectual.',
  },
  {
    title: 'Restaurantes sin Winerim',
    body: 'Cuando indicas un restaurante sin Winerim, la app puede guardar una senal de demanda para mostrar interes comercial agregado. Esa informacion se usa para mejorar el servicio y orientar acciones comerciales.',
  },
  {
    title: 'Disponibilidad',
    body: 'Winerim puede depender de servicios externos como Supabase, APIs de Winerim y servicios de analisis. El servicio puede interrumpirse por mantenimiento, incidencias tecnicas o cambios de proveedores.',
  },
  {
    title: 'Cambios',
    body: 'Podemos actualizar estos terminos para reflejar cambios del producto, requisitos legales o mejoras operativas. Si el cambio es material, se comunicara por medios razonables dentro de la app o por email.',
  },
];

const Terms = () => (
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
          <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Ultima actualizacion: 9 de junio de 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold">Terminos de uso</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
          Estos terminos resumen las condiciones de uso de la app Winerim y de sus funciones
          para perfil sensorial, cartas de vino, escaneo y coleccion personal.
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
            <Link to="/privacy" className="font-medium text-red-800 hover:underline">
              politica de privacidad
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  </div>
);

export default Terms;
