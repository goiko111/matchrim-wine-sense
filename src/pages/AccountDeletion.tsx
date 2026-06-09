import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { toast } from 'sonner';

type DeletionRequest = {
  id: string;
  status: string;
  requested_at: string;
};

const AccountDeletion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<DeletionRequest | null>(null);

  useEffect(() => {
    const loadExistingRequest = async () => {
      if (!user) {
        setExistingRequest(null);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('id, status, requested_at')
        .eq('user_id', user.id)
        .in('status', ['requested', 'processing'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading account deletion request:', error);
      }

      setExistingRequest(data);
      setIsLoading(false);
    };

    loadExistingRequest();
  }, [user]);

  const submitDeletionRequest = async () => {
    if (!user?.email) {
      navigate(buildAuthRedirectPath('/account/delete'));
      return;
    }

    if (!isConfirmed) {
      toast.error('Confirma que quieres iniciar la eliminacion de tu cuenta');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        reason: reason.trim() || null,
      })
      .select('id, status, requested_at')
      .single();

    setIsSubmitting(false);

    if (error) {
      console.error('Error creating account deletion request:', error);
      toast.error('No se pudo crear la solicitud de eliminacion');
      return;
    }

    setExistingRequest(data);
    setReason('');
    setIsConfirmed(false);
    toast.success('Solicitud de eliminacion creada');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <Button asChild variant="ghost" className="mb-6 gap-2 text-red-900">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Volver a Winerim
          </Link>
        </Button>

        <section className="rounded-lg bg-red-950 px-6 py-8 text-white shadow-elegant">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-white text-red-950">
            <Trash2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Eliminar cuenta</h1>
          <p className="mt-4 text-sm leading-6 text-white/80">
            Desde aqui puedes iniciar la eliminacion de tu cuenta Winerim y los datos personales
            asociados a la app.
          </p>
        </section>

        <div className="mt-8 space-y-5">
          {!user ? (
            <Card>
              <CardHeader>
                <CardTitle>Inicia sesion para solicitar la eliminacion</CardTitle>
                <CardDescription>
                  Para proteger tu cuenta, necesitamos verificar tu identidad antes de crear la solicitud.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => navigate(buildAuthRedirectPath('/account/delete'))} className="bg-red-800 hover:bg-red-900">
                  Iniciar sesion
                </Button>
                <p className="text-sm leading-6 text-muted-foreground">
                  Tambien puedes escribir desde el email de tu cuenta a{' '}
                  <a href="mailto:hola@winerim.com" className="font-medium text-red-800 hover:underline">
                    hola@winerim.com
                  </a>
                  {' '}indicando que quieres eliminar tu cuenta Winerim.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {isLoading ? (
                <div className="flex min-h-28 items-center justify-center rounded-lg border bg-white">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-red-800" />
                  Revisando solicitudes...
                </div>
              ) : existingRequest ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <AlertTitle>Solicitud creada</AlertTitle>
                  <AlertDescription>
                    Tu solicitud esta en estado <strong>{existingRequest.status}</strong>. La revisaremos y
                    completaremos en un plazo razonable. Referencia: {existingRequest.id}.
                  </AlertDescription>
                </Alert>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Solicitar eliminacion de cuenta</CardTitle>
                    <CardDescription>
                      Crearemos una solicitud vinculada a {user.email}. Revisaremos y eliminaremos los
                      datos asociados segun la politica de privacidad y las obligaciones legales aplicables.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      <AlertTitle>Antes de continuar</AlertTitle>
                      <AlertDescription>
                        La eliminacion puede borrar tu perfil Matchrim, vinos guardados, puntuaciones,
                        historial de restaurantes y datos de cuenta. Algunos registros tecnicos o legales
                        pueden conservarse durante el tiempo necesario.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="deletion-reason">Motivo opcional</Label>
                      <Textarea
                        id="deletion-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Cuéntanos si hay algo que podamos mejorar"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        onChange={(event) => setIsConfirmed(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        Entiendo que estoy iniciando la eliminacion de mi cuenta Winerim y los datos
                        personales asociados a la app.
                      </span>
                    </label>

                    <Button
                      onClick={submitDeletionRequest}
                      disabled={isSubmitting || !isConfirmed}
                      className="w-full gap-2 bg-red-800 hover:bg-red-900"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Solicitar eliminacion
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Privacidad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Puedes consultar que datos tratamos en la{' '}
                <Link to="/privacy" className="font-medium text-red-800 hover:underline">
                  politica de privacidad
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AccountDeletion;
