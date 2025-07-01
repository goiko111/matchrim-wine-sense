
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WinesTable from './WinesTable';
import WineStylesTable from './WineStylesTable';
import MatchrimProfilesTable from './MatchrimProfilesTable';
import { Wine, Palette, Users } from 'lucide-react';

const DataViewerTabs = () => {
  return (
    <Tabs defaultValue="wines" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="wines" className="flex items-center gap-2">
          <Wine className="h-4 w-4" />
          Vinos
        </TabsTrigger>
        <TabsTrigger value="styles" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Estilos
        </TabsTrigger>
        <TabsTrigger value="profiles" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Perfiles Matchrim
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="wines" className="mt-6">
        <WinesTable />
      </TabsContent>
      
      <TabsContent value="styles" className="mt-6">
        <WineStylesTable />
      </TabsContent>
      
      <TabsContent value="profiles" className="mt-6">
        <MatchrimProfilesTable />
      </TabsContent>
    </Tabs>
  );
};

export default DataViewerTabs;
