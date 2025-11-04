import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();
    
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

    // First, check if there's a Winerim restaurant nearby (within 100m)
    // TODO: When we have restaurants table, query it here
    // For now, return empty Winerim restaurants

    let googlePlaces = [];
    
    if (GOOGLE_MAPS_API_KEY) {
      // Call Google Places API for nearby restaurants
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=500&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`;
      
      const placesResponse = await fetch(placesUrl);
      const placesData = await placesResponse.json();
      
      if (placesData.results) {
        googlePlaces = placesData.results.slice(0, 10).map((place: any) => ({
          place_id: place.place_id,
          name: place.name,
          address: place.vicinity,
          location: place.geometry?.location,
          rating: place.rating,
          types: place.types,
        }));
      }
    }

    return new Response(
      JSON.stringify({
        winerim_restaurants: [], // TODO: Add when restaurants table is ready
        nearby_places: googlePlaces,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-location:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});