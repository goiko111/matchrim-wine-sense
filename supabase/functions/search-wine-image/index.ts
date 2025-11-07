import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wineName, producer, vintage } = await req.json();
    
    if (!wineName) {
      return new Response(
        JSON.stringify({ error: 'Wine name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create search query
    const searchQuery = `${wineName}${producer ? ' ' + producer : ''}${vintage ? ' ' + vintage : ''} wine bottle image`;
    
    console.log('Searching for wine image:', searchQuery);

    // Use Lovable AI to search for the wine bottle image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a wine expert assistant. When given wine information, search for and return a direct URL to a high-quality image of the wine bottle. Return ONLY the image URL, nothing else. If you cannot find an image, return "NOT_FOUND".'
          },
          {
            role: 'user',
            content: `Find a high-quality image URL for this wine bottle: ${searchQuery}. Return only the direct image URL (must end in .jpg, .png, .webp, etc.) or "NOT_FOUND".`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', aiResponse.status);
      const errorText = await aiResponse.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          imageUrl: null,
          error: 'Failed to search for wine image'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.content?.trim();

    console.log('AI response:', imageUrl);

    // Validate the URL
    if (imageUrl && imageUrl !== 'NOT_FOUND' && imageUrl.startsWith('http')) {
      // Verify it's an actual image URL
      if (imageUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) || imageUrl.includes('image')) {
        return new Response(
          JSON.stringify({ imageUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If no valid image found, return null
    return new Response(
      JSON.stringify({ imageUrl: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-wine-image function:', error);
    return new Response(
      JSON.stringify({ 
        imageUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
