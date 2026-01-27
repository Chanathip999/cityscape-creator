import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete theme list with all available themes
const THEMES = [
  { id: "ocean", name: "Ocean", keywords: ["blau", "blue", "ocean", "meer", "wasser", "water", "hell", "light", "standard"] },
  { id: "noir", name: "Noir", keywords: ["schwarz", "black", "noir", "dunkel", "dark", "nacht", "night"] },
  { id: "beige", name: "Warm Beige", keywords: ["beige", "warm", "braun", "brown", "sand", "vintage", "creme", "cream"] },
  { id: "midnight", name: "Midnight Blue", keywords: ["mitternacht", "midnight", "gold", "golden", "luxus", "luxury", "elegant", "royal"] },
  { id: "copper", name: "Copper Patina", keywords: ["kupfer", "copper", "grün", "green", "patina", "mint", "türkis", "teal"] },
  { id: "terracotta", name: "Terracotta", keywords: ["terrakotta", "terracotta", "orange", "rot", "red", "warm", "mediterran"] },
  { id: "forest", name: "Forest", keywords: ["wald", "forest", "natur", "nature", "grün", "green", "eco"] },
  { id: "contrast", name: "High Contrast", keywords: ["kontrast", "contrast", "schwarz-weiß", "black-white", "mono", "klar", "clean"] },
  { id: "sunset", name: "Sunset", keywords: ["sonnenuntergang", "sunset", "orange", "rot", "red", "abend", "evening", "warm"] },
  { id: "neon", name: "Neon Cyberpunk", keywords: ["neon", "cyberpunk", "pink", "cyan", "futuristisch", "futuristic", "retro", "80er", "80s"] },
];

// Font families
const FONTS = [
  { id: "mono", name: "Monospace", keywords: ["mono", "monospace", "code", "technisch", "technical"] },
  { id: "sans", name: "Sans-Serif", keywords: ["sans", "modern", "clean", "schlicht", "minimalistisch"] },
  { id: "serif", name: "Serif", keywords: ["serif", "klassisch", "classic", "traditionell", "elegant"] },
  { id: "display", name: "Display", keywords: ["display", "headline", "bold", "stark", "auffällig"] },
  { id: "elegant", name: "Elegant", keywords: ["elegant", "fancy", "cursive", "edel", "schön"] },
  { id: "condensed", name: "Condensed", keywords: ["condensed", "schmal", "narrow", "kompakt", "compact"] },
];

// Aspect ratios
const ASPECT_RATIOS = [
  { id: "1:1", name: "Quadrat", keywords: ["quadrat", "square", "1:1", "instagram", "post"] },
  { id: "2:3", name: "Foto Portrait", keywords: ["foto", "photo", "portrait", "2:3", "hochformat"] },
  { id: "3:2", name: "Foto Landscape", keywords: ["landscape", "querformat", "3:2"] },
  { id: "3:4", name: "Portrait", keywords: ["portrait", "hochformat", "3:4", "standard", "poster"] },
  { id: "4:3", name: "Landscape", keywords: ["landscape", "querformat", "4:3"] },
  { id: "4:5", name: "Instagram", keywords: ["instagram", "4:5", "social"] },
  { id: "5:4", name: "Large Print", keywords: ["print", "druck", "5:4", "groß"] },
  { id: "9:16", name: "Story", keywords: ["story", "stories", "9:16", "tiktok", "reels", "vertical", "vertikal"] },
  { id: "16:9", name: "Breitbild", keywords: ["breitbild", "widescreen", "16:9", "wide", "kino", "cinema"] },
  { id: "6:19", name: "Panorama Hoch", keywords: ["panorama", "hoch", "tall", "6:19", "lang"] },
  { id: "19:6", name: "Panorama Quer", keywords: ["panorama", "quer", "wide", "19:6", "breit"] },
];

// Text colors
const TEXT_COLORS = [
  { id: "theme", name: "Theme-Farbe", keywords: ["theme", "standard", "default", "original"] },
  { id: "white", name: "Weiß", color: "#FFFFFF", keywords: ["weiß", "white", "hell", "light"] },
  { id: "black", name: "Schwarz", color: "#1A1A1A", keywords: ["schwarz", "black", "dunkel", "dark"] },
  { id: "gold", name: "Gold", color: "#D4A853", keywords: ["gold", "golden", "luxus", "luxury", "edel"] },
  { id: "cyan", name: "Cyan", color: "#00D4FF", keywords: ["cyan", "türkis", "blau", "blue", "neon"] },
  { id: "coral", name: "Koralle", color: "#FF6B6B", keywords: ["koralle", "coral", "rot", "red", "pink"] },
  { id: "sage", name: "Salbei", color: "#87AE73", keywords: ["salbei", "sage", "grün", "green", "natur"] },
  { id: "navy", name: "Navy", color: "#1B4965", keywords: ["navy", "marine", "blau", "blue", "dunkelblau"] },
  { id: "terracotta", name: "Terrakotta", color: "#C04000", keywords: ["terrakotta", "terracotta", "orange", "rot"] },
];

// Extended cities database
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
  "munich": { lat: 48.1351, lon: 11.582, country: "Germany" },
  "hamburg": { lat: 53.5511, lon: 9.9937, country: "Germany" },
  "wien": { lat: 48.2082, lon: 16.3738, country: "Austria" },
  "vienna": { lat: 48.2082, lon: 16.3738, country: "Austria" },
  "zürich": { lat: 47.3769, lon: 8.5417, country: "Switzerland" },
  "zurich": { lat: 47.3769, lon: 8.5417, country: "Switzerland" },
  "köln": { lat: 50.9375, lon: 6.9603, country: "Germany" },
  "cologne": { lat: 50.9375, lon: 6.9603, country: "Germany" },
  "frankfurt": { lat: 50.1109, lon: 8.6821, country: "Germany" },
  "madrid": { lat: 40.4168, lon: -3.7038, country: "Spain" },
  "lisbon": { lat: 38.7223, lon: -9.1393, country: "Portugal" },
  "lissabon": { lat: 38.7223, lon: -9.1393, country: "Portugal" },
  "prag": { lat: 50.0755, lon: 14.4378, country: "Czech Republic" },
  "prague": { lat: 50.0755, lon: 14.4378, country: "Czech Republic" },
  "kopenhagen": { lat: 55.6761, lon: 12.5683, country: "Denmark" },
  "copenhagen": { lat: 55.6761, lon: 12.5683, country: "Denmark" },
  "stockholm": { lat: 59.3293, lon: 18.0686, country: "Sweden" },
  "oslo": { lat: 59.9139, lon: 10.7522, country: "Norway" },
  "helsinki": { lat: 60.1699, lon: 24.9384, country: "Finland" },
  "venedig": { lat: 45.4408, lon: 12.3155, country: "Italy" },
  "venice": { lat: 45.4408, lon: 12.3155, country: "Italy" },
  "florenz": { lat: 43.7696, lon: 11.2558, country: "Italy" },
  "florence": { lat: 43.7696, lon: 11.2558, country: "Italy" },
  "mailand": { lat: 45.4642, lon: 9.19, country: "Italy" },
  "milan": { lat: 45.4642, lon: 9.19, country: "Italy" },
  "brüssel": { lat: 50.8503, lon: 4.3517, country: "Belgium" },
  "brussels": { lat: 50.8503, lon: 4.3517, country: "Belgium" },
  "athen": { lat: 37.9838, lon: 23.7275, country: "Greece" },
  "athens": { lat: 37.9838, lon: 23.7275, country: "Greece" },
  "istanbul": { lat: 41.0082, lon: 28.9784, country: "Turkey" },
  "singapur": { lat: 1.3521, lon: 103.8198, country: "Singapore" },
  "singapore": { lat: 1.3521, lon: 103.8198, country: "Singapore" },
  "hongkong": { lat: 22.3193, lon: 114.1694, country: "Hong Kong" },
  "hong kong": { lat: 22.3193, lon: 114.1694, country: "Hong Kong" },
  "peking": { lat: 39.9042, lon: 116.4074, country: "China" },
  "beijing": { lat: 39.9042, lon: 116.4074, country: "China" },
  "shanghai": { lat: 31.2304, lon: 121.4737, country: "China" },
  "seoul": { lat: 37.5665, lon: 126.978, country: "South Korea" },
  "los angeles": { lat: 34.0522, lon: -118.2437, country: "USA" },
  "chicago": { lat: 41.8781, lon: -87.6298, country: "USA" },
  "san francisco": { lat: 37.7749, lon: -122.4194, country: "USA" },
  "miami": { lat: 25.7617, lon: -80.1918, country: "USA" },
  "toronto": { lat: 43.6532, lon: -79.3832, country: "Canada" },
  "vancouver": { lat: 49.2827, lon: -123.1207, country: "Canada" },
  "rio de janeiro": { lat: -22.9068, lon: -43.1729, country: "Brazil" },
  "buenos aires": { lat: -34.6037, lon: -58.3816, country: "Argentina" },
  "kapstadt": { lat: -33.9249, lon: 18.4241, country: "South Africa" },
  "cape town": { lat: -33.9249, lon: 18.4241, country: "South Africa" },
  "kairo": { lat: 30.0444, lon: 31.2357, country: "Egypt" },
  "cairo": { lat: 30.0444, lon: 31.2357, country: "Egypt" },
  "marrakesch": { lat: 31.6295, lon: -7.9811, country: "Morocco" },
  "marrakech": { lat: 31.6295, lon: -7.9811, country: "Morocco" },
  "melbourne": { lat: -37.8136, lon: 144.9631, country: "Australia" },
  "auckland": { lat: -36.8509, lon: 174.7645, country: "New Zealand" },
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

    // Build comprehensive system prompt with ALL available settings
    const systemPrompt = `Du bist ein intelligenter Poster-Design-Assistent für eine Stadt-Karten-Poster-App. Du kannst ALLE Einstellungen des Posters steuern.

# AKTUELLE KONFIGURATION:
- Stadt: ${currentConfig.city}
- Land: ${currentConfig.country}
- Koordinaten: ${currentConfig.latitude?.toFixed(4) || 0}, ${currentConfig.longitude?.toFixed(4) || 0}
- Zoom/Distanz: ${currentConfig.distance}m
- Theme: ${currentConfig.theme?.name || currentConfig.theme?.id || "Ocean"}
- Seitenverhältnis: ${currentConfig.aspectRatio || "3:4"}
- Schriftart: ${currentConfig.fontFamily || "mono"}
- Schriftgröße-Skala: ${currentConfig.fontSizeScale || 1.0}
- Textfarbe: ${currentConfig.customTextColor || "Theme-Standard"}
- Hintergrundfarbe: ${currentConfig.customBackgroundColor || "Theme-Standard"}
- Straßenfarbe: ${currentConfig.customRoadColor || "Theme-Standard"}
- Autobahnfarbe: ${currentConfig.customMotorwayColor || "Theme-Standard"}
- Textposition: ${currentConfig.textPosition || "bottom"}
- Stadtname anzeigen: ${currentConfig.showCity !== false}
- Land anzeigen: ${currentConfig.showCountry !== false}
- Koordinaten anzeigen: ${currentConfig.showCoordinates !== false}
- Verläufe/Gradients: ${currentConfig.showGradients !== false}

# LAYER-SICHTBARKEIT:
- Wasser: ${currentConfig.layerVisibility?.water !== false}
- Parks: ${currentConfig.layerVisibility?.parks !== false}
- Wälder: ${currentConfig.layerVisibility?.forests !== false}
- Eisenbahnen: ${currentConfig.layerVisibility?.railways !== false}
- Flugplätze: ${currentConfig.layerVisibility?.aeroways !== false}
- Küstenlinien: ${currentConfig.layerVisibility?.coastlines !== false}
- Gebäude: ${currentConfig.layerVisibility?.buildings || false}

# VERFÜGBARE OPTIONEN:

## Themes:
${THEMES.map(t => `- ${t.id}: ${t.name}`).join("\n")}

## Schriftarten:
${FONTS.map(f => `- ${f.id}: ${f.name}`).join("\n")}

## Seitenverhältnisse:
${ASPECT_RATIOS.map(a => `- ${a.id}: ${a.name}`).join("\n")}

## Textfarben:
${TEXT_COLORS.map(c => `- ${c.id}: ${c.name}${c.color ? ` (${c.color})` : ""}`).join("\n")}

## Textpositionen:
- bottom: Unten
- center: Mitte
- top: Oben

## Distanz-Empfehlungen:
- 2000-4000m: Sehr kleine/dichte Gebiete (Altstadt, Venedig)
- 5000-8000m: Kleine/mittlere Städte, Stadtzentrum
- 10000-15000m: Große Städte
- 20000-30000m: Metropolen, Überblick

# STEUERBARE EINSTELLUNGEN:

Du kannst folgende Felder in "configUpdates" setzen:
- city: Stadtname (String)
- country: Land (String)
- latitude: Breitengrad (Number)
- longitude: Längengrad (Number)
- distance: Zoom-Distanz in Metern (2000-30000)
- theme: { id: "theme-id" } - Eines der oben genannten Themes
- aspectRatio: Seitenverhältnis-ID (z.B. "3:4", "16:9")
- fontFamily: Schriftart-ID (mono, sans, serif, display, elegant, condensed)
- fontSizeScale: Schriftgröße-Multiplikator (0.5 bis 2.0)
- customTextColor: Hex-Farbcode für Text (z.B. "#D4A853" für Gold)
- customBackgroundColor: Hex-Farbcode für Hintergrund
- customRoadColor: Hex-Farbcode für Straßen
- customMotorwayColor: Hex-Farbcode für Autobahnen
- textPosition: Position des Textes ("bottom", "center", "top")
- showCity: Stadtname anzeigen (true/false)
- showCountry: Land anzeigen (true/false)
- showCoordinates: Koordinaten anzeigen (true/false)
- showGradients: Verläufe anzeigen (true/false)
- layerVisibility: Objekt mit Layer-Sichtbarkeit:
  - water: true/false
  - parks: true/false
  - forests: true/false
  - railways: true/false
  - aeroways: true/false
  - coastlines: true/false
  - buildings: true/false
- layerColors: Objekt mit benutzerdefinierten Farben für Layer:
  - water: Hex-Farbcode
  - parks: Hex-Farbcode
  - forests: Hex-Farbcode
  - railways: Hex-Farbcode

# ANTWORT-FORMAT:

Antworte IMMER auf Deutsch und im JSON-Format:
{
  "message": "Deine freundliche Nachricht an den Benutzer, die erklärt was du änderst",
  "configUpdates": {
    // Nur die Felder, die sich ändern sollen
  }
}

Wenn keine Änderungen nötig sind (z.B. bei Fragen), lasse configUpdates weg.

# BEISPIELE:

Benutzer: "Mach das Poster dunkel mit goldener Schrift"
Antwort: {"message": "Ich habe das Poster auf das elegante Midnight Blue Theme mit goldener Schrift umgestellt!", "configUpdates": {"theme": {"id": "midnight"}, "customTextColor": "#D4A853"}}

Benutzer: "Zeig mir Paris ohne Wasser"
Antwort: {"message": "Hier ist Paris! Ich habe das Wasser ausgeblendet.", "configUpdates": {"city": "Paris", "country": "France", "latitude": 48.8566, "longitude": 2.3522, "layerVisibility": {"water": false}}}

Benutzer: "Mach die Schrift größer und zentriert"
Antwort: {"message": "Die Schrift ist jetzt größer und in der Mitte des Posters platziert!", "configUpdates": {"fontSizeScale": 1.4, "textPosition": "center"}}

Benutzer: "Instagram-Format bitte"
Antwort: {"message": "Perfekt! Das Poster hat jetzt das Instagram-optimierte 4:5 Format.", "configUpdates": {"aspectRatio": "4:5"}}

Benutzer: "Füge die Gebäude hinzu und mach das Wasser blau"
Antwort: {"message": "Gebäude sind jetzt sichtbar und das Wasser leuchtet in einem schönen Blau!", "configUpdates": {"layerVisibility": {"buildings": true}, "layerColors": {"water": "#4A90D9"}}}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    // Process theme if only ID is provided
    if (parsedResponse.configUpdates?.theme?.id) {
      const themeId = parsedResponse.configUpdates.theme.id;
      const themeInfo = THEMES.find(t => t.id === themeId);
      if (themeInfo) {
        // Just pass the ID, the frontend will resolve the full theme
        parsedResponse.configUpdates.theme = { id: themeId };
      }
    }

    // Handle layerVisibility - merge with current config to avoid resetting other layers
    if (parsedResponse.configUpdates?.layerVisibility) {
      parsedResponse.configUpdates.layerVisibility = {
        ...(currentConfig.layerVisibility || {}),
        ...parsedResponse.configUpdates.layerVisibility,
      };
    }

    // Handle layerColors - merge with current config
    if (parsedResponse.configUpdates?.layerColors) {
      parsedResponse.configUpdates.layerColors = {
        ...(currentConfig.layerColors || {}),
        ...parsedResponse.configUpdates.layerColors,
      };
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
