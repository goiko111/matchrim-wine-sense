import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AppErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string | null;
  isRecoverableAssetError: boolean;
}

const recoverableAssetErrorPattern =
  /Failed to fetch dynamically imported module|Unable to preload CSS|Loading chunk|Importing a module script failed|dynamically imported module/i;

const isRecoverableAssetError = (message: string) => recoverableAssetErrorPattern.test(message);

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: null,
    isRecoverableAssetError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    const message = error.message || 'Error inesperado';
    return {
      hasError: true,
      message,
      isRecoverableAssetError: isRecoverableAssetError(message),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App render error:', error, errorInfo);

    const message = error.message || '';
    if (!isRecoverableAssetError(message)) return;

    const reloadKey = `matchrim:asset-reload:${this.props.resetKey || window.location.pathname}`;
    if (window.sessionStorage.getItem(reloadKey)) return;

    window.sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: null, isRecoverableAssetError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-950 via-red-900 to-stone-950 px-4 py-10">
        <Card className="w-full max-w-lg border-red-100">
          <CardHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-800">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <CardTitle>No se ha podido cargar esta pantalla</CardTitle>
            <CardDescription>
              {this.state.isRecoverableAssetError
                ? 'Hemos actualizado la app y esta pantalla necesita recargarse.'
                : 'Winerim sigue funcionando, pero esta vista ha tenido un error puntual.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.message && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                {this.state.message}
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button className="gap-2 bg-red-800 hover:bg-red-900" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
                {this.state.isRecoverableAssetError ? 'Actualizar app' : 'Reintentar'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => window.location.assign('/')}>
                <Home className="h-4 w-4" />
                Ir al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
