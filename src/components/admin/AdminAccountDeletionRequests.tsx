import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock3,
  Copy,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DeletionRequest = Database['public']['Tables']['account_deletion_requests']['Row'];
type DeletionStatus = 'requested' | 'processing' | 'completed' | 'cancelled';

const statusConfig: Record<
  DeletionStatus,
  {
    label: string;
    badge: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }
> = {
  requested: { label: 'Pendiente', badge: 'destructive' },
  processing: { label: 'En proceso', badge: 'secondary', className: 'bg-amber-100 text-amber-900' },
  completed: { label: 'Completada', badge: 'secondary', className: 'bg-green-100 text-green-900' },
  cancelled: { label: 'Cancelada', badge: 'outline' },
};

const statusOptions: DeletionStatus[] = ['requested', 'processing', 'completed', 'cancelled'];

const formatDateTime = (date: string | null) => {
  if (!date) return '-';

  return format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: es });
};

const getStatusConfig = (status: string) =>
  statusConfig[status as DeletionStatus] || {
    label: status,
    badge: 'outline' as const,
  };

function RequestStatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);

  return (
    <Badge variant={config.badge} className={config.className}>
      {config.label}
    </Badge>
  );
}

export function AdminAccountDeletionRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error loading account deletion requests:', error);
      setError('No se pudieron cargar las solicitudes de eliminacion.');
      setRequests([]);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const summary = useMemo(() => {
    const requested = requests.filter((request) => request.status === 'requested').length;
    const processing = requests.filter((request) => request.status === 'processing').length;
    const completed = requests.filter((request) => request.status === 'completed').length;
    const cancelled = requests.filter((request) => request.status === 'cancelled').length;

    return {
      open: requested + processing,
      requested,
      processing,
      completed,
      cancelled,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) return requests;

    return requests.filter((request) => {
      const haystack = [
        request.email,
        request.reason,
        request.status,
        request.user_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [requests, searchTerm]);

  const updateRequestStatus = async (request: DeletionRequest, status: DeletionStatus) => {
    if (request.status === status) return;

    setUpdatingId(request.id);

    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({
        status,
        completed_at: completedAt,
      })
      .eq('id', request.id);

    if (error) {
      console.error('Error updating account deletion request:', error);
      toast.error('No se pudo actualizar la solicitud');
    } else {
      setRequests((currentRequests) =>
        currentRequests.map((currentRequest) =>
          currentRequest.id === request.id
            ? {
                ...currentRequest,
                status,
                completed_at: completedAt,
                updated_at: new Date().toISOString(),
              }
            : currentRequest
        )
      );
      toast.success('Solicitud actualizada');
    }

    setUpdatingId(null);
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copiado');
    } catch (error) {
      console.error('Error copying email:', error);
      toast.error('No se pudo copiar el email');
    }
  };

  const renderStatusSelect = (request: DeletionRequest) => (
    <Select
      value={request.status}
      onValueChange={(value) => updateRequestStatus(request, value as DeletionStatus)}
      disabled={updatingId === request.id}
    >
      <SelectTrigger className="w-full md:w-[155px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {statusConfig[status].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderRequestDialog = (request: DeletionRequest) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Solicitud de eliminacion</DialogTitle>
          <DialogDescription>
            Datos operativos para tramitar la peticion del usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <Badge variant="outline">Solicitada {formatDateTime(request.requested_at)}</Badge>
            {request.completed_at && (
              <Badge variant="outline">
                Completada {formatDateTime(request.completed_at)}
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{request.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User id</p>
              <p className="break-all font-mono text-sm">{request.user_id || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actualizada</p>
              <p className="font-medium">{formatDateTime(request.updated_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Request id</p>
              <p className="break-all font-mono text-sm">{request.id}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Motivo indicado</p>
            <p className="mt-1 rounded-md border bg-muted/30 p-3 text-sm">
              {request.reason || 'El usuario no indico motivo.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="gap-2">
              <a href={`mailto:${request.email}`}>
                <Mail className="h-4 w-4" />
                Escribir email
              </a>
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => copyEmail(request.email)}
            >
              <Copy className="h-4 w-4" />
              Copiar email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error al cargar solicitudes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Cola operativa de privacidad</AlertTitle>
        <AlertDescription>
          Esta vista permite seguir las solicitudes y cambiar su estado. El borrado definitivo de
          datos y cuenta debe ejecutarse con el procedimiento interno aprobado antes de marcar una
          solicitud como completada.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Abiertas</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              {summary.open}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Clock3 className="h-6 w-6 text-amber-700" />
              {summary.requested}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <CheckCircle2 className="h-6 w-6 text-green-700" />
              {summary.completed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Canceladas</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <XCircle className="h-6 w-6 text-muted-foreground" />
              {summary.cancelled}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de eliminacion de cuenta</CardTitle>
          <CardDescription>
            {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? 'es' : ''} visible
            {filteredRequests.length !== 1 ? 's' : ''} de {requests.length} registrada
            {requests.length !== 1 ? 's' : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar solicitud..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={fetchRequests} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay solicitudes de eliminacion con esos filtros.
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border p-4">
                    <div className="mb-4 space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="break-all">{request.email}</span>
                      </div>
                      <div className="break-all font-mono text-xs text-muted-foreground">
                        {request.user_id || 'Sin user id'}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Estado</p>
                        {renderStatusSelect(request)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Solicitada</p>
                          <p>{formatDateTime(request.requested_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">Completada</p>
                          <p>{formatDateTime(request.completed_at)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Motivo</p>
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {request.reason || 'Sin motivo indicado'}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyEmail(request.email)}
                          aria-label={`Copiar email de ${request.email}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {renderRequestDialog(request)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Solicitada</TableHead>
                      <TableHead>Completada</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {request.email}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {request.user_id || 'Sin user id'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{renderStatusSelect(request)}</TableCell>
                        <TableCell>{formatDateTime(request.requested_at)}</TableCell>
                        <TableCell>{formatDateTime(request.completed_at)}</TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {request.reason || 'Sin motivo indicado'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyEmail(request.email)}
                              aria-label={`Copiar email de ${request.email}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {renderRequestDialog(request)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
