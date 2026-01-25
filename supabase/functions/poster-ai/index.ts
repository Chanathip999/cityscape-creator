import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THEMES = [
  { id: "ocean", name: "Ocean", keywords: ["blau", "blue", "ocean", "meer", "wasser", "water", "hell", "light"] },
  { id: "noir", name: "Noir", keywords: ["schwarz", "black", "noir", "dunkel", "dark", "nacht", "night"] },
  { id: "beige", name: "Warm Beige", keywords: ["beige", "warm", "braun", "brown", "sand", "terracotta", "vintage"] },
  { id: "midnight", name: "Midnight Blue", keywords: ["mitternacht", "midnight", "gold", "golden", "luxus", "luxury", "elegant"] },
  { id: "copper", name: "Copper Patina", keywords: ["kupfer", "copper", "grün", "green", "patina", "mint", "türkis"] },
];

const CITIES_DB: Record<string, { lat: number; lon: number; country: string }> = {
  "paris": { lat: 48.8566, lon: 2.3522, country: "France" },
  "london": { lat: 51.5074, lon: -0.1278, country: "UK" },
  "berlin": { lat: 52.52, lon: 13.405, country: "Germany" },
  "tokyo": { lat: 35.6762, lon: 139.6503, country: "Japan" },
  "new york": { lat: 40.7128, lon: -74.006, country: "USA" },
  "amsterdam": { lat: 52.3676, lon: 4.9041, country: "Netherlands" },
  "barcelona": { lat: 41.3851, lon: 2.1734, country: "Spain" },
  "rome": { lat: 41.9028, lon: 12.4964, country: "Italy" },
  "dubai": { lat: 25.2048, lon: 55.2708, country: "UAE" },
  "sydney": { lat: -33.8688, lon: 151.2093, country: "Australia" },
  "münchen": { lat: 48.1351, lon: 11.582, country: "Germany" },
  "hamburg": { lat: 53.5511, lon: 9.9937, country: "Germany" },
  "wien": { lat: 48.2082, lon: 16.3738, country: "Austria" },
  "zürich": { lat: 47.3769, lon: 8.5417, country: "Switzerland" },
  "köln": { lat: 50.9375, lon: 6.9603, country: "Germany" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, currentConfig } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du bist ein Poster-Design-Assistent. Der Benutzer möchte ein Stadt-Plakat erstellen.

Aktuelle Konfiguration:
- Stadt: ${currentConfig.city}
- Land: ${currentConfig.country}
- Koordinaten: ${currentConfig.latitude}, ${currentConfig.longitude}
- Zoom/Distanz: ${currentConfig.distance}m
- Theme: ${currentConfig.theme?.name || "Ocean"}

Verfügbare Themes:
${THEMES.map(t => `- ${t.id}: ${t.name} (Keywords: ${t.keywords.join(", ")})`).join("\n")}

Distanz-Empfehlungen:
- 3000-6000m: Für kleine/dichte Städte (Venedig, Altstadt)
- 8000-12000m: Für mittlere Städte, Stadtzentrum
- 15000-25000m: Für große Metropolen

Du kannst folgende Änderungen vorschlagen:
1. Stadt ändern (mit Koordinaten)
2. Theme wechseln
3. Distanz/Zoom anpassen

Antworte IMMER auf Deutsch und freundlich. Erkläre kurz, was du änderst.

WICHTIG: Antworte im JSON-Format mit:
{
  "message": "Deine Nachricht an den Benutzer",
  "configUpdates": {
    // Optional: Nur die Felder die sich ändern
    "city": "Stadtname",
    "country": "Land",
    "latitude": 0.0,
    "longitude": 0.0,
    "distance": 10000,
    "theme": { "id": "theme-id" }
  }
}

Wenn keine Änderungen nötig sind, lasse configUpdates weg.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            message: "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
            configUpdates: null 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI raw response:", content);

    // Parse the JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { message: content, configUpdates: null };
      }
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      parsedResponse = { message: content, configUpdates: null };
    }

    // Process city lookups if needed
    if (parsedResponse.configUpdates?.city && !parsedResponse.configUpdates.latitude) {
      const cityLower = parsedResponse.configUpdates.city.toLowerCase();
      const cityData = CITIES_DB[cityLower];
      if (cityData) {
        parsedResponse.configUpdates.latitude = cityData.lat;
        parsedResponse.configUpdates.longitude = cityData.lon;
        if (!parsedResponse.configUpdates.country) {
          parsedResponse.configUpdates.country = cityData.country;
        }
      }
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in poster-ai function:", error);
    return new Response(
      JSON.stringify({
        message: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.",
        configUpdates: null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
