import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataViewerTabs from "@/components/data-viewer/DataViewerTabs";

export function AdminData() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Datos</CardTitle>
        <CardDescription>
          Visualiza y exporta datos de vinos, estilos y perfiles Matchrim
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataViewerTabs />
      </CardContent>
    </Card>
  );
}
