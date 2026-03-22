export type Language = 
  | 'en' | 'de' | 'fr' | 'it' | 'es' | 'pt' | 'pl' | 'nl'
  | 'da' | 'sv' | 'no' | 'fi' | 'cs' | 'hu' | 'ro' | 'hr' | 'el' | 'tr';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

type TranslationKeys = {
  // Mode
  'mode.map': string;
  'mode.photo': string;
  // Header
  'header.title': string;
  'header.subtitle': string;
  // City search
  'citySearch.label': string;
  'citySearch.placeholder': string;
  // Theme
  'theme.label': string;
  // Format
  'format.label': string;
  // Tabs
  'tabs.layers': string;
  'tabs.text': string;
  'tabs.colors': string;
  'tabs.overlays': string;
  // Layers
  'layers.basis': string;
  'layers.landscape': string;
  'layers.streets': string;
  'layers.transport': string;
  'layers.buildings': string;
  'layers.landmarks': string;
  'layers.water': string;
  'layers.allBuildings': string;
  'layers.railways': string;
  'layers.parks': string;
  'layers.forests': string;
  'layers.coastlines': string;
  'layers.lakes': string;
  'layers.rivers': string;
  'layers.mainRoads': string;
  'layers.sideStreets': string;
  'layers.footpaths': string;
  'layers.cycleways': string;
  'layers.paths': string;
  'layers.airports': string;
  'layers.trainStations': string;
  'layers.cableways': string;
  'layers.residential': string;
  'layers.commercial': string;
  'layers.monuments': string;
  'layers.stadiums': string;
  // Text tab
  'text.style': string;
  'text.font': string;
  'text.sizePreset': string;
  'text.fineTuning': string;
  'text.fineTuningDesc': string;
  'text.position': string;
  'text.showCity': string;
  'text.showCountry': string;
  'text.showCoords': string;
  'text.gradients': string;
  // Colors tab
  'colors.textColor': string;
  'colors.motorways': string;
  'colors.sideStreets': string;
  'colors.background': string;
  'colors.reset': string;
  // Overlays
  'overlays.icons': string;
  'overlays.iconLabel': string;
  'overlays.iconSize': string;
  'overlays.iconDragHint': string;
  'overlays.routes': string;
  'overlays.startAddress': string;
  'overlays.endAddress': string;
  'overlays.routeColor': string;
  'overlays.addRoute': string;
  'overlays.activeRoutes': string;
  'overlays.routeAutoCalc': string;
  'overlays.addressNotFound': string;
  'overlays.routeAdded': string;
  'overlays.routeError': string;
  'overlays.enterBothAddresses': string;
  'overlays.images': string;
  'overlays.uploadImage': string;
  'overlays.uploadHint': string;
  'overlays.uploadedImages': string;
  'overlays.imageSize': string;
  'overlays.imageOpacity': string;
  'overlays.imagePlaceHint': string;
  'overlays.onlyImages': string;
  'overlays.imageTooLarge': string;
  'overlays.imageAdded': string;
  // Export
  'export.button': string;
  'export.title': string;
  'export.description': string;
  'export.fileFormat': string;
  'export.lossless': string;
  'export.compressed': string;
  'export.pricingTier': string;
  'export.withLogo': string;
  'export.budget': string;
  'export.budgetNotice': string;
  'export.quantity': string;
  'export.poster': string;
  'export.posters': string;
  'export.save': string;
  'export.resolution': string;
  'export.buildingData': string;
  'export.buildingsOnly4k': string;
  'export.vectorMode': string;
  'export.generating': string;
  'export.downloadSuccess': string;
  'export.savedAs': string;
  'export.exportError': string;
  'export.tryAgain': string;
  'export.download': string;
  'export.withLogoWatermark': string;
  // AI
  'ai.label': string;
  'ai.placeholder': string;
  'ai.failed': string;
  // Cache
  'cache.clear': string;
  'cache.cleared': string;
  'cache.clearFailed': string;
  // Zoom
  'zoom.in': string;
  'zoom.out': string;
  // Footer hint
  'footer.vectorHint': string;
  // Text styles
  'textStyle.classic': string;
  'textStyle.modern': string;
  'textStyle.minimal': string;
  'textStyle.editorial': string;
  // Payment
  'payment.cancelled': string;
  'payment.cancelledDesc': string;
  'payment.generating': string;
  'payment.budgetGenerating': string;
  'payment.pleaseWait': string;
  // Photo mode
  'photo.upload': string;
  'photo.uploadHint': string;
  'photo.metadata': string;
  'photo.noMetadata': string;
  'photo.replace': string;
  'photo.uploaded': string;
  'photo.onlyImages': string;
  'photo.tooLarge': string;
  'photo.uploadError': string;
};

const en: TranslationKeys = {
  'mode.map': 'Map Poster',
  'mode.photo': 'Photo Poster',
  'header.title': 'City Map Poster',
  'header.subtitle': 'Create beautiful city prints',
  'citySearch.label': 'City Search',
  'citySearch.placeholder': 'Search city...',
  'theme.label': 'Theme',
  'format.label': 'Format',
  'tabs.layers': 'Layers',
  'tabs.text': 'Text',
  'tabs.colors': 'Colors',
  'tabs.overlays': 'Overlays',
  'layers.basis': 'Base',
  'layers.landscape': 'Landscape',
  'layers.streets': 'Streets',
  'layers.transport': 'Transport',
  'layers.buildings': 'Buildings',
  'layers.landmarks': 'Landmarks',
  'layers.water': 'Water',
  'layers.allBuildings': 'All Buildings',
  'layers.railways': 'Railways',
  'layers.parks': 'Parks',
  'layers.forests': 'Forests',
  'layers.coastlines': 'Coastlines',
  'layers.lakes': 'Lakes',
  'layers.rivers': 'Rivers',
  'layers.mainRoads': 'Main Roads',
  'layers.sideStreets': 'Side Streets',
  'layers.footpaths': 'Footpaths',
  'layers.cycleways': 'Cycle Paths',
  'layers.paths': 'Trails',
  'layers.airports': 'Airports',
  'layers.trainStations': 'Train Stations',
  'layers.cableways': 'Cable Cars',
  'layers.residential': 'Residential',
  'layers.commercial': 'Commercial',
  'layers.monuments': 'Monuments',
  'layers.stadiums': 'Stadiums',
  'text.style': 'Text Style',
  'text.font': 'Font',
  'text.sizePreset': 'Size Preset',
  'text.fineTuning': 'Fine Tuning',
  'text.fineTuningDesc': '50% to 200% of preset value',
  'text.position': 'Text Position',
  'text.showCity': 'Show city name',
  'text.showCountry': 'Show country',
  'text.showCoords': 'Show coordinates',
  'text.gradients': 'Top/bottom gradients',
  'colors.textColor': 'Text Color',
  'colors.motorways': 'Motorways / Main Roads',
  'colors.sideStreets': 'Side Streets',
  'colors.background': 'Background',
  'colors.reset': 'Reset colors',
  'overlays.icons': 'Map Icons',
  'overlays.iconLabel': 'Label',
  'overlays.iconSize': 'Size',
  'overlays.iconDragHint': 'Drag & drop icons on the map to reposition.',
  'overlays.routes': 'Draw Routes',
  'overlays.startAddress': 'Start address (e.g. Central Park, New York)',
  'overlays.endAddress': 'End address (e.g. Times Square, New York)',
  'overlays.routeColor': 'Route color',
  'overlays.addRoute': 'Add Route',
  'overlays.activeRoutes': 'Active Routes',
  'overlays.routeAutoCalc': 'The route is calculated automatically between addresses.',
  'overlays.addressNotFound': 'Address not found',
  'overlays.routeAdded': 'Route added',
  'overlays.routeError': 'Error creating route',
  'overlays.enterBothAddresses': 'Please enter both addresses',
  'overlays.images': 'Custom Images',
  'overlays.uploadImage': 'Upload Image',
  'overlays.uploadHint': 'PNG, JPG, SVG (max. 5MB)',
  'overlays.uploadedImages': 'Uploaded Images',
  'overlays.imageSize': 'Size',
  'overlays.imageOpacity': 'Opacity',
  'overlays.imagePlaceHint': 'Images are placed at map center. Drag to reposition.',
  'overlays.onlyImages': 'Please upload image files only (PNG, JPG, etc.)',
  'overlays.imageTooLarge': 'Image too large (max. 5MB)',
  'overlays.imageAdded': 'Image added',
  'export.button': 'Export Poster',
  'export.title': 'Export Poster',
  'export.description': 'Choose format and resolution for your download.',
  'export.fileFormat': 'File Format',
  'export.lossless': 'Lossless',
  'export.compressed': 'Compressed',
  'export.pricingTier': 'Pricing Tier',
  'export.withLogo': 'With Logo',
  'export.budget': 'BUDGET',
  'export.budgetNotice': 'Budget version includes a subtle "MAPPOSTER" logo at the bottom. Perfect for personal use!',
  'export.quantity': 'Quantity',
  'export.poster': 'Poster',
  'export.posters': 'Posters',
  'export.save': 'SAVE',
  'export.resolution': 'Resolution',
  'export.buildingData': 'Building data',
  'export.buildingsOnly4k': 'Building data only available from 4K',
  'export.vectorMode': 'Vector mode: Poster is rendered server-side for perfect quality.',
  'export.generating': 'Generating...',
  'export.downloadSuccess': 'Download successful!',
  'export.savedAs': 'Poster saved as',
  'export.exportError': 'Export Error',
  'export.tryAgain': 'Please try again.',
  'export.download': 'Download',
  'export.withLogoWatermark': 'With logo watermark',
  'ai.label': 'AI Assistant',
  'ai.placeholder': "e.g. 'Dark poster of Paris with golden text'",
  'ai.failed': 'AI request failed. Please try again.',
  'cache.clear': 'Clear Cache',
  'cache.cleared': 'Map data cache cleared. Reloading...',
  'cache.clearFailed': 'Cache could not be fully cleared. Reloading anyway...',
  'zoom.in': 'Zoom in (less radius)',
  'zoom.out': 'Zoom out (more radius)',
  'footer.vectorHint': '💡 Vector mode: Stylized streets as sharp vector graphics.',
  'textStyle.classic': 'Classic',
  'textStyle.modern': 'Modern',
  'textStyle.minimal': 'Minimal',
  'textStyle.editorial': 'Editorial',
  'payment.cancelled': 'Payment cancelled',
  'payment.cancelledDesc': 'You can try again at any time.',
  'payment.generating': 'Poster is being generated...',
  'payment.budgetGenerating': 'Budget version with logo is being created...',
  'payment.pleaseWait': 'Please wait a moment.',
  'photo.upload': 'Upload Photo',
  'photo.uploadHint': 'JPG, PNG, HEIC — EXIF data will be extracted automatically',
  'photo.metadata': 'Extracted Metadata',
  'photo.noMetadata': 'No metadata found in this image',
  'photo.replace': 'Replace Photo',
  'photo.uploaded': 'Photo uploaded successfully',
  'photo.onlyImages': 'Please upload image files only',
  'photo.tooLarge': 'Image too large (max. 20MB)',
  'photo.uploadError': 'Upload failed',
};

const de: TranslationKeys = {
  'mode.map': 'Karten-Poster',
  'mode.photo': 'Foto-Poster',
  'header.title': 'City Map Poster',
  'header.subtitle': 'Erstelle wunderschöne Stadtposter',
  'citySearch.label': 'Stadtsuche',
  'citySearch.placeholder': 'Stadt suchen...',
  'theme.label': 'Theme',
  'format.label': 'Format',
  'tabs.layers': 'Ebenen',
  'tabs.text': 'Text',
  'tabs.colors': 'Farben',
  'tabs.overlays': 'Overlays',
  'layers.basis': 'Basis',
  'layers.landscape': 'Landschaft',
  'layers.streets': 'Straßen',
  'layers.transport': 'Transport',
  'layers.buildings': 'Gebäude',
  'layers.landmarks': 'Sehenswürdigkeiten',
  'layers.water': 'Wasser',
  'layers.allBuildings': 'Alle Gebäude',
  'layers.railways': 'Zugstrecken',
  'layers.parks': 'Parks',
  'layers.forests': 'Wälder',
  'layers.coastlines': 'Küstenlinien',
  'layers.lakes': 'Seen',
  'layers.rivers': 'Flüsse',
  'layers.mainRoads': 'Hauptstraßen',
  'layers.sideStreets': 'Nebenstraßen',
  'layers.footpaths': 'Fußwege',
  'layers.cycleways': 'Radwege',
  'layers.paths': 'Pfade',
  'layers.airports': 'Flughäfen',
  'layers.trainStations': 'Bahnhöfe',
  'layers.cableways': 'Seilbahnen',
  'layers.residential': 'Wohngebäude',
  'layers.commercial': 'Gewerbe/Büros',
  'layers.monuments': 'Denkmäler',
  'layers.stadiums': 'Stadien',
  'text.style': 'Text-Stil',
  'text.font': 'Schriftart',
  'text.sizePreset': 'Schriftgröße Preset',
  'text.fineTuning': 'Feineinstellung',
  'text.fineTuningDesc': '50% bis 200% des Preset-Werts',
  'text.position': 'Textposition',
  'text.showCity': 'Stadtname anzeigen',
  'text.showCountry': 'Land anzeigen',
  'text.showCoords': 'Koordinaten anzeigen',
  'text.gradients': 'Farbverläufe oben/unten',
  'colors.textColor': 'Textfarbe',
  'colors.motorways': 'Autobahnen / Hauptstraßen',
  'colors.sideStreets': 'Nebenstraßen',
  'colors.background': 'Hintergrund',
  'colors.reset': 'Farben zurücksetzen',
  'overlays.icons': 'Karten-Icons',
  'overlays.iconLabel': 'Label',
  'overlays.iconSize': 'Größe',
  'overlays.iconDragHint': 'Icons per Drag & Drop auf der Karte verschieben.',
  'overlays.routes': 'Routen zeichnen',
  'overlays.startAddress': 'Startadresse (z.B. Brandenburger Tor, Berlin)',
  'overlays.endAddress': 'Zieladresse (z.B. Alexanderplatz, Berlin)',
  'overlays.routeColor': 'Routenfarbe',
  'overlays.addRoute': 'Route hinzufügen',
  'overlays.activeRoutes': 'Aktive Routen',
  'overlays.routeAutoCalc': 'Die Route wird automatisch zwischen den Adressen berechnet.',
  'overlays.addressNotFound': 'Adresse nicht gefunden',
  'overlays.routeAdded': 'Route hinzugefügt',
  'overlays.routeError': 'Fehler beim Erstellen der Route',
  'overlays.enterBothAddresses': 'Bitte beide Adressen eingeben',
  'overlays.images': 'Eigene Bilder',
  'overlays.uploadImage': 'Bild hochladen',
  'overlays.uploadHint': 'PNG, JPG, SVG (max. 5MB)',
  'overlays.uploadedImages': 'Hochgeladene Bilder',
  'overlays.imageSize': 'Größe',
  'overlays.imageOpacity': 'Deckkraft',
  'overlays.imagePlaceHint': 'Bilder werden in der Kartenmitte platziert. Verschieben durch Drag & Drop.',
  'overlays.onlyImages': 'Bitte nur Bilddateien hochladen (PNG, JPG, etc.)',
  'overlays.imageTooLarge': 'Bild zu groß (max. 5MB)',
  'overlays.imageAdded': 'Bild hinzugefügt',
  'export.button': 'Export Poster',
  'export.title': 'Poster exportieren',
  'export.description': 'Wähle Format und Auflösung für deinen Download.',
  'export.fileFormat': 'Dateiformat',
  'export.lossless': 'Verlustfrei',
  'export.compressed': 'Komprimiert',
  'export.pricingTier': 'Preisstufe',
  'export.withLogo': 'Mit Logo',
  'export.budget': 'GÜNSTIG',
  'export.budgetNotice': 'Budget-Version enthält ein dezentes "MAPPOSTER" Logo am unteren Rand. Perfekt für den persönlichen Gebrauch!',
  'export.quantity': 'Anzahl',
  'export.poster': 'Poster',
  'export.posters': 'Poster',
  'export.save': 'SPARE',
  'export.resolution': 'Auflösung',
  'export.buildingData': 'Gebäudedaten',
  'export.buildingsOnly4k': 'Gebäudedaten nur ab 4K verfügbar',
  'export.vectorMode': '💾 Vektor-Modus: Poster wird serverseitig gerendert für perfekte Qualität.',
  'export.generating': 'Wird generiert...',
  'export.downloadSuccess': 'Download erfolgreich!',
  'export.savedAs': 'Poster wurde als',
  'export.exportError': 'Fehler beim Export',
  'export.tryAgain': 'Bitte versuche es erneut.',
  'export.download': 'Download',
  'export.withLogoWatermark': 'Mit Logo-Wasserzeichen',
  'ai.label': 'AI-Assistent',
  'ai.placeholder': "z.B. 'Dunkles Poster von Paris mit goldenem Text'",
  'ai.failed': 'AI-Anfrage fehlgeschlagen. Bitte versuche es erneut.',
  'cache.clear': 'Cache leeren',
  'cache.cleared': 'Kartendaten-Cache geleert. Seite wird neu geladen...',
  'cache.clearFailed': 'Cache konnte nicht vollständig geleert werden. Seite wird trotzdem neu geladen...',
  'zoom.in': 'Zoom in (weniger Radius)',
  'zoom.out': 'Zoom out (mehr Radius)',
  'footer.vectorHint': '💡 Vektor-Modus: Stilisierte Straßen als scharfe Vektorgrafik.',
  'textStyle.classic': 'Klassisch',
  'textStyle.modern': 'Modern',
  'textStyle.minimal': 'Minimal',
  'textStyle.editorial': 'Editorial',
  'payment.cancelled': 'Zahlung abgebrochen',
  'payment.cancelledDesc': 'Du kannst es jederzeit erneut versuchen.',
  'payment.generating': 'Poster wird generiert...',
  'payment.budgetGenerating': 'Budget-Version mit Logo wird erstellt...',
  'payment.pleaseWait': 'Bitte warte einen Moment.',
  'photo.upload': 'Foto hochladen',
  'photo.uploadHint': 'JPG, PNG, HEIC — EXIF-Daten werden automatisch ausgelesen',
  'photo.metadata': 'Erkannte Metadaten',
  'photo.noMetadata': 'Keine Metadaten in diesem Bild gefunden',
  'photo.replace': 'Foto ersetzen',
  'photo.uploaded': 'Foto erfolgreich hochgeladen',
  'photo.onlyImages': 'Bitte nur Bilddateien hochladen',
  'photo.tooLarge': 'Bild zu groß (max. 20MB)',
  'photo.uploadError': 'Upload fehlgeschlagen',
};

const fr: TranslationKeys = {
  'mode.map': 'Poster Carte',
  'mode.photo': 'Poster Photo',
  'header.title': 'City Map Poster',
  'header.subtitle': 'Créez de magnifiques affiches de villes',
  'citySearch.label': 'Recherche de ville',
  'citySearch.placeholder': 'Rechercher une ville...',
  'theme.label': 'Thème',
  'format.label': 'Format',
  'tabs.layers': 'Calques',
  'tabs.text': 'Texte',
  'tabs.colors': 'Couleurs',
  'tabs.overlays': 'Superpositions',
  'layers.basis': 'Base',
  'layers.landscape': 'Paysage',
  'layers.streets': 'Rues',
  'layers.transport': 'Transport',
  'layers.buildings': 'Bâtiments',
  'layers.landmarks': 'Points d\'intérêt',
  'layers.water': 'Eau',
  'layers.allBuildings': 'Tous les bâtiments',
  'layers.railways': 'Voies ferrées',
  'layers.parks': 'Parcs',
  'layers.forests': 'Forêts',
  'layers.coastlines': 'Littoral',
  'layers.lakes': 'Lacs',
  'layers.rivers': 'Rivières',
  'layers.mainRoads': 'Routes principales',
  'layers.sideStreets': 'Rues secondaires',
  'layers.footpaths': 'Chemins piétons',
  'layers.cycleways': 'Pistes cyclables',
  'layers.paths': 'Sentiers',
  'layers.airports': 'Aéroports',
  'layers.trainStations': 'Gares',
  'layers.cableways': 'Téléphériques',
  'layers.residential': 'Résidentiel',
  'layers.commercial': 'Commercial',
  'layers.monuments': 'Monuments',
  'layers.stadiums': 'Stades',
  'text.style': 'Style de texte',
  'text.font': 'Police',
  'text.sizePreset': 'Taille prédéfinie',
  'text.fineTuning': 'Réglage fin',
  'text.fineTuningDesc': '50% à 200% de la valeur prédéfinie',
  'text.position': 'Position du texte',
  'text.showCity': 'Afficher le nom de la ville',
  'text.showCountry': 'Afficher le pays',
  'text.showCoords': 'Afficher les coordonnées',
  'text.gradients': 'Dégradés haut/bas',
  'colors.textColor': 'Couleur du texte',
  'colors.motorways': 'Autoroutes / Routes principales',
  'colors.sideStreets': 'Rues secondaires',
  'colors.background': 'Arrière-plan',
  'colors.reset': 'Réinitialiser les couleurs',
  'overlays.icons': 'Icônes de carte',
  'overlays.iconLabel': 'Libellé',
  'overlays.iconSize': 'Taille',
  'overlays.iconDragHint': 'Glissez-déposez les icônes sur la carte.',
  'overlays.routes': 'Tracer des itinéraires',
  'overlays.startAddress': 'Adresse de départ (ex. Tour Eiffel, Paris)',
  'overlays.endAddress': 'Adresse d\'arrivée (ex. Arc de Triomphe, Paris)',
  'overlays.routeColor': 'Couleur de l\'itinéraire',
  'overlays.addRoute': 'Ajouter un itinéraire',
  'overlays.activeRoutes': 'Itinéraires actifs',
  'overlays.routeAutoCalc': 'L\'itinéraire est calculé automatiquement entre les adresses.',
  'overlays.addressNotFound': 'Adresse introuvable',
  'overlays.routeAdded': 'Itinéraire ajouté',
  'overlays.routeError': 'Erreur lors de la création de l\'itinéraire',
  'overlays.enterBothAddresses': 'Veuillez entrer les deux adresses',
  'overlays.images': 'Images personnalisées',
  'overlays.uploadImage': 'Télécharger une image',
  'overlays.uploadHint': 'PNG, JPG, SVG (max. 5 Mo)',
  'overlays.uploadedImages': 'Images téléchargées',
  'overlays.imageSize': 'Taille',
  'overlays.imageOpacity': 'Opacité',
  'overlays.imagePlaceHint': 'Les images sont placées au centre de la carte. Glissez pour repositionner.',
  'overlays.onlyImages': 'Veuillez télécharger uniquement des fichiers image (PNG, JPG, etc.)',
  'overlays.imageTooLarge': 'Image trop volumineuse (max. 5 Mo)',
  'overlays.imageAdded': 'Image ajoutée',
  'export.button': 'Exporter le poster',
  'export.title': 'Exporter le poster',
  'export.description': 'Choisissez le format et la résolution pour votre téléchargement.',
  'export.fileFormat': 'Format de fichier',
  'export.lossless': 'Sans perte',
  'export.compressed': 'Compressé',
  'export.pricingTier': 'Niveau de prix',
  'export.withLogo': 'Avec logo',
  'export.budget': 'ÉCONOMIQUE',
  'export.budgetNotice': 'La version économique inclut un logo "MAPPOSTER" discret en bas. Parfait pour un usage personnel !',
  'export.quantity': 'Quantité',
  'export.poster': 'Poster',
  'export.posters': 'Posters',
  'export.save': 'ÉCONOMISEZ',
  'export.resolution': 'Résolution',
  'export.buildingData': 'Données bâtiments',
  'export.buildingsOnly4k': 'Données bâtiments disponibles à partir du 4K',
  'export.vectorMode': 'Mode vectoriel : Le poster est rendu côté serveur pour une qualité parfaite.',
  'export.generating': 'Génération en cours...',
  'export.downloadSuccess': 'Téléchargement réussi !',
  'export.savedAs': 'Poster enregistré en',
  'export.exportError': 'Erreur d\'export',
  'export.tryAgain': 'Veuillez réessayer.',
  'export.download': 'Télécharger',
  'export.withLogoWatermark': 'Avec filigrane logo',
  'ai.label': 'Assistant IA',
  'ai.placeholder': "ex. 'Poster sombre de Paris avec texte doré'",
  'ai.failed': 'Requête IA échouée. Veuillez réessayer.',
  'cache.clear': 'Vider le cache',
  'cache.cleared': 'Cache de données cartographiques vidé. Rechargement...',
  'cache.clearFailed': 'Le cache n\'a pas pu être entièrement vidé. Rechargement quand même...',
  'zoom.in': 'Zoom avant (moins de rayon)',
  'zoom.out': 'Zoom arrière (plus de rayon)',
  'footer.vectorHint': '💡 Mode vectoriel : Rues stylisées en graphiques vectoriels nets.',
  'textStyle.classic': 'Classique',
  'textStyle.modern': 'Moderne',
  'textStyle.minimal': 'Minimal',
  'textStyle.editorial': 'Éditorial',
  'payment.cancelled': 'Paiement annulé',
  'payment.cancelledDesc': 'Vous pouvez réessayer à tout moment.',
  'payment.generating': 'Poster en cours de génération...',
  'payment.budgetGenerating': 'Version budget avec logo en cours de création...',
  'payment.pleaseWait': 'Veuillez patienter un instant.',
  'photo.upload': 'Télécharger une photo',
  'photo.uploadHint': 'JPG, PNG, HEIC — Les données EXIF seront extraites automatiquement',
  'photo.metadata': 'Métadonnées extraites',
  'photo.noMetadata': 'Aucune métadonnée trouvée',
  'photo.replace': 'Remplacer la photo',
  'photo.uploaded': 'Photo téléchargée avec succès',
  'photo.onlyImages': 'Veuillez télécharger uniquement des fichiers image',
  'photo.tooLarge': 'Image trop volumineuse (max. 20 Mo)',
  'photo.uploadError': 'Échec du téléchargement',
};

// Helper to create partial translations that fall back to English
const createTranslation = (overrides: Partial<TranslationKeys>): TranslationKeys => ({
  ...en,
  ...overrides,
});

const it = createTranslation({
  'header.subtitle': 'Crea bellissime stampe di città',
  'citySearch.label': 'Ricerca città',
  'citySearch.placeholder': 'Cerca città...',
  'theme.label': 'Tema',
  'tabs.layers': 'Livelli',
  'tabs.text': 'Testo',
  'tabs.colors': 'Colori',
  'tabs.overlays': 'Sovrapposizioni',
  'layers.basis': 'Base',
  'layers.landscape': 'Paesaggio',
  'layers.streets': 'Strade',
  'layers.buildings': 'Edifici',
  'layers.landmarks': 'Punti d\'interesse',
  'layers.water': 'Acqua',
  'layers.allBuildings': 'Tutti gli edifici',
  'layers.railways': 'Ferrovie',
  'layers.parks': 'Parchi',
  'layers.forests': 'Foreste',
  'layers.coastlines': 'Coste',
  'layers.lakes': 'Laghi',
  'layers.rivers': 'Fiumi',
  'layers.mainRoads': 'Strade principali',
  'layers.sideStreets': 'Strade secondarie',
  'layers.footpaths': 'Sentieri pedonali',
  'layers.cycleways': 'Piste ciclabili',
  'layers.paths': 'Sentieri',
  'layers.airports': 'Aeroporti',
  'layers.trainStations': 'Stazioni',
  'layers.cableways': 'Funivie',
  'layers.residential': 'Residenziale',
  'layers.commercial': 'Commerciale',
  'layers.monuments': 'Monumenti',
  'layers.stadiums': 'Stadi',
  'text.style': 'Stile testo',
  'text.font': 'Carattere',
  'text.sizePreset': 'Dimensione predefinita',
  'text.fineTuning': 'Regolazione fine',
  'text.position': 'Posizione testo',
  'text.showCity': 'Mostra nome città',
  'text.showCountry': 'Mostra paese',
  'text.showCoords': 'Mostra coordinate',
  'text.gradients': 'Gradienti sopra/sotto',
  'colors.textColor': 'Colore testo',
  'colors.background': 'Sfondo',
  'colors.reset': 'Reimposta colori',
  'overlays.icons': 'Icone mappa',
  'overlays.routes': 'Disegna percorsi',
  'overlays.addRoute': 'Aggiungi percorso',
  'overlays.images': 'Immagini personalizzate',
  'overlays.uploadImage': 'Carica immagine',
  'export.button': 'Esporta poster',
  'export.title': 'Esporta poster',
  'cache.clear': 'Svuota cache',
  'ai.label': 'Assistente IA',
});

const es = createTranslation({
  'header.subtitle': 'Crea hermosos pósters de ciudades',
  'citySearch.label': 'Buscar ciudad',
  'citySearch.placeholder': 'Buscar ciudad...',
  'theme.label': 'Tema',
  'tabs.layers': 'Capas',
  'tabs.text': 'Texto',
  'tabs.colors': 'Colores',
  'tabs.overlays': 'Superposiciones',
  'layers.basis': 'Base',
  'layers.landscape': 'Paisaje',
  'layers.streets': 'Calles',
  'layers.buildings': 'Edificios',
  'layers.landmarks': 'Lugares de interés',
  'layers.water': 'Agua',
  'layers.allBuildings': 'Todos los edificios',
  'layers.railways': 'Ferrocarriles',
  'layers.parks': 'Parques',
  'layers.forests': 'Bosques',
  'layers.coastlines': 'Costas',
  'layers.lakes': 'Lagos',
  'layers.rivers': 'Ríos',
  'layers.mainRoads': 'Carreteras principales',
  'layers.sideStreets': 'Calles secundarias',
  'layers.footpaths': 'Senderos peatonales',
  'layers.cycleways': 'Carriles bici',
  'layers.paths': 'Caminos',
  'layers.airports': 'Aeropuertos',
  'layers.trainStations': 'Estaciones',
  'layers.cableways': 'Teleféricos',
  'layers.residential': 'Residencial',
  'layers.commercial': 'Comercial',
  'layers.monuments': 'Monumentos',
  'layers.stadiums': 'Estadios',
  'text.style': 'Estilo de texto',
  'text.font': 'Fuente',
  'text.position': 'Posición del texto',
  'text.showCity': 'Mostrar nombre de ciudad',
  'text.showCountry': 'Mostrar país',
  'text.showCoords': 'Mostrar coordenadas',
  'text.gradients': 'Degradados arriba/abajo',
  'colors.textColor': 'Color del texto',
  'colors.background': 'Fondo',
  'colors.reset': 'Restablecer colores',
  'overlays.icons': 'Iconos del mapa',
  'overlays.routes': 'Dibujar rutas',
  'overlays.addRoute': 'Añadir ruta',
  'overlays.images': 'Imágenes personalizadas',
  'overlays.uploadImage': 'Subir imagen',
  'export.button': 'Exportar póster',
  'export.title': 'Exportar póster',
  'cache.clear': 'Vaciar caché',
  'ai.label': 'Asistente IA',
});

const pt = createTranslation({
  'header.subtitle': 'Crie belos pôsteres de cidades',
  'citySearch.label': 'Buscar cidade',
  'citySearch.placeholder': 'Buscar cidade...',
  'tabs.layers': 'Camadas',
  'tabs.text': 'Texto',
  'tabs.colors': 'Cores',
  'tabs.overlays': 'Sobreposições',
  'layers.basis': 'Base',
  'layers.landscape': 'Paisagem',
  'layers.streets': 'Ruas',
  'layers.buildings': 'Edifícios',
  'layers.water': 'Água',
  'layers.railways': 'Ferrovias',
  'layers.parks': 'Parques',
  'layers.forests': 'Florestas',
  'layers.airports': 'Aeroportos',
  'text.font': 'Fonte',
  'colors.textColor': 'Cor do texto',
  'colors.background': 'Fundo',
  'colors.reset': 'Redefinir cores',
  'overlays.icons': 'Ícones do mapa',
  'overlays.routes': 'Desenhar rotas',
  'overlays.addRoute': 'Adicionar rota',
  'overlays.images': 'Imagens personalizadas',
  'overlays.uploadImage': 'Enviar imagem',
  'export.button': 'Exportar pôster',
  'cache.clear': 'Limpar cache',
  'ai.label': 'Assistente IA',
});

const pl = createTranslation({
  'header.subtitle': 'Twórz piękne plakaty miast',
  'citySearch.label': 'Szukaj miasta',
  'citySearch.placeholder': 'Szukaj miasta...',
  'tabs.layers': 'Warstwy',
  'tabs.text': 'Tekst',
  'tabs.colors': 'Kolory',
  'tabs.overlays': 'Nakładki',
  'layers.basis': 'Podstawa',
  'layers.landscape': 'Krajobraz',
  'layers.streets': 'Ulice',
  'layers.buildings': 'Budynki',
  'layers.water': 'Woda',
  'layers.parks': 'Parki',
  'layers.forests': 'Lasy',
  'layers.airports': 'Lotniska',
  'text.font': 'Czcionka',
  'colors.textColor': 'Kolor tekstu',
  'colors.background': 'Tło',
  'colors.reset': 'Resetuj kolory',
  'overlays.icons': 'Ikony mapy',
  'overlays.routes': 'Rysuj trasy',
  'overlays.addRoute': 'Dodaj trasę',
  'overlays.images': 'Własne obrazy',
  'overlays.uploadImage': 'Prześlij obraz',
  'export.button': 'Eksportuj plakat',
  'cache.clear': 'Wyczyść pamięć',
  'ai.label': 'Asystent AI',
});

const nl = createTranslation({
  'header.subtitle': 'Maak prachtige stadsposters',
  'citySearch.label': 'Stad zoeken',
  'citySearch.placeholder': 'Zoek stad...',
  'tabs.layers': 'Lagen',
  'tabs.text': 'Tekst',
  'tabs.colors': 'Kleuren',
  'tabs.overlays': 'Overlays',
  'layers.basis': 'Basis',
  'layers.landscape': 'Landschap',
  'layers.streets': 'Straten',
  'layers.buildings': 'Gebouwen',
  'layers.water': 'Water',
  'text.font': 'Lettertype',
  'colors.textColor': 'Tekstkleur',
  'colors.background': 'Achtergrond',
  'colors.reset': 'Kleuren resetten',
  'export.button': 'Poster exporteren',
  'cache.clear': 'Cache wissen',
  'ai.label': 'AI-Assistent',
});

const da = createTranslation({
  'header.subtitle': 'Lav smukke byplakater',
  'citySearch.label': 'Søg by',
  'citySearch.placeholder': 'Søg by...',
  'tabs.layers': 'Lag',
  'tabs.text': 'Tekst',
  'tabs.colors': 'Farver',
  'tabs.overlays': 'Overlejringer',
  'layers.basis': 'Basis',
  'layers.streets': 'Gader',
  'layers.buildings': 'Bygninger',
  'layers.water': 'Vand',
  'text.font': 'Skrifttype',
  'colors.textColor': 'Tekstfarve',
  'colors.background': 'Baggrund',
  'colors.reset': 'Nulstil farver',
  'export.button': 'Eksporter plakat',
  'cache.clear': 'Ryd cache',
  'ai.label': 'AI-Assistent',
});

const sv = createTranslation({
  'header.subtitle': 'Skapa vackra stadsaffischer',
  'citySearch.label': 'Sök stad',
  'citySearch.placeholder': 'Sök stad...',
  'tabs.layers': 'Lager',
  'tabs.text': 'Text',
  'tabs.colors': 'Färger',
  'tabs.overlays': 'Överlagringar',
  'layers.basis': 'Bas',
  'layers.streets': 'Gator',
  'layers.buildings': 'Byggnader',
  'layers.water': 'Vatten',
  'text.font': 'Typsnitt',
  'colors.textColor': 'Textfärg',
  'colors.background': 'Bakgrund',
  'colors.reset': 'Återställ färger',
  'export.button': 'Exportera affisch',
  'cache.clear': 'Rensa cache',
  'ai.label': 'AI-Assistent',
});

const no = createTranslation({
  'header.subtitle': 'Lag vakre byplakater',
  'citySearch.label': 'Søk by',
  'citySearch.placeholder': 'Søk by...',
  'tabs.layers': 'Lag',
  'tabs.text': 'Tekst',
  'tabs.colors': 'Farger',
  'tabs.overlays': 'Overlegg',
  'layers.basis': 'Basis',
  'layers.streets': 'Gater',
  'layers.buildings': 'Bygninger',
  'layers.water': 'Vann',
  'text.font': 'Skrifttype',
  'colors.textColor': 'Tekstfarge',
  'colors.background': 'Bakgrunn',
  'colors.reset': 'Tilbakestill farger',
  'export.button': 'Eksporter plakat',
  'cache.clear': 'Tøm hurtigbuffer',
  'ai.label': 'AI-Assistent',
});

const fi = createTranslation({
  'header.subtitle': 'Luo kauniita kaupunkijulisteita',
  'citySearch.label': 'Hae kaupunki',
  'citySearch.placeholder': 'Hae kaupunki...',
  'tabs.layers': 'Tasot',
  'tabs.text': 'Teksti',
  'tabs.colors': 'Värit',
  'layers.basis': 'Perusta',
  'layers.streets': 'Kadut',
  'layers.buildings': 'Rakennukset',
  'layers.water': 'Vesi',
  'text.font': 'Fontti',
  'colors.textColor': 'Tekstin väri',
  'colors.background': 'Tausta',
  'colors.reset': 'Palauta värit',
  'export.button': 'Vie juliste',
  'cache.clear': 'Tyhjennä välimuisti',
  'ai.label': 'Tekoälyavustaja',
});

const cs = createTranslation({
  'header.subtitle': 'Vytvořte krásné městské plakáty',
  'citySearch.label': 'Hledat město',
  'citySearch.placeholder': 'Hledat město...',
  'tabs.layers': 'Vrstvy',
  'tabs.text': 'Text',
  'tabs.colors': 'Barvy',
  'layers.basis': 'Základ',
  'layers.streets': 'Ulice',
  'layers.buildings': 'Budovy',
  'layers.water': 'Voda',
  'text.font': 'Písmo',
  'colors.textColor': 'Barva textu',
  'colors.background': 'Pozadí',
  'colors.reset': 'Obnovit barvy',
  'export.button': 'Exportovat plakát',
  'cache.clear': 'Vymazat mezipaměť',
  'ai.label': 'AI Asistent',
});

const hu = createTranslation({
  'header.subtitle': 'Készíts gyönyörű városi plakátokat',
  'citySearch.label': 'Város keresése',
  'citySearch.placeholder': 'Város keresése...',
  'tabs.layers': 'Rétegek',
  'tabs.text': 'Szöveg',
  'tabs.colors': 'Színek',
  'layers.basis': 'Alap',
  'layers.streets': 'Utcák',
  'layers.buildings': 'Épületek',
  'layers.water': 'Víz',
  'text.font': 'Betűtípus',
  'colors.textColor': 'Szöveg szín',
  'colors.background': 'Háttér',
  'colors.reset': 'Színek visszaállítása',
  'export.button': 'Plakát exportálása',
  'cache.clear': 'Gyorsítótár törlése',
  'ai.label': 'AI Asszisztens',
});

const ro = createTranslation({
  'header.subtitle': 'Creează postere frumoase ale orașelor',
  'citySearch.label': 'Căutare oraș',
  'citySearch.placeholder': 'Caută oraș...',
  'tabs.layers': 'Straturi',
  'tabs.text': 'Text',
  'tabs.colors': 'Culori',
  'layers.streets': 'Străzi',
  'layers.buildings': 'Clădiri',
  'layers.water': 'Apă',
  'export.button': 'Exportă poster',
  'cache.clear': 'Golește cache',
  'ai.label': 'Asistent AI',
});

const hr = createTranslation({
  'header.subtitle': 'Izradite prekrasne gradske plakate',
  'citySearch.label': 'Pretraži grad',
  'citySearch.placeholder': 'Pretraži grad...',
  'tabs.layers': 'Slojevi',
  'tabs.text': 'Tekst',
  'tabs.colors': 'Boje',
  'layers.streets': 'Ulice',
  'layers.buildings': 'Zgrade',
  'layers.water': 'Voda',
  'export.button': 'Izvezi plakat',
  'cache.clear': 'Očisti predmemoriju',
  'ai.label': 'AI Asistent',
});

const el = createTranslation({
  'header.subtitle': 'Δημιουργήστε όμορφες αφίσες πόλεων',
  'citySearch.label': 'Αναζήτηση πόλης',
  'citySearch.placeholder': 'Αναζήτηση πόλης...',
  'tabs.layers': 'Επίπεδα',
  'tabs.text': 'Κείμενο',
  'tabs.colors': 'Χρώματα',
  'layers.streets': 'Δρόμοι',
  'layers.buildings': 'Κτίρια',
  'layers.water': 'Νερό',
  'export.button': 'Εξαγωγή αφίσας',
  'cache.clear': 'Εκκαθάριση cache',
  'ai.label': 'Βοηθός AI',
});

const tr = createTranslation({
  'header.subtitle': 'Güzel şehir posterleri oluşturun',
  'citySearch.label': 'Şehir ara',
  'citySearch.placeholder': 'Şehir ara...',
  'tabs.layers': 'Katmanlar',
  'tabs.text': 'Metin',
  'tabs.colors': 'Renkler',
  'tabs.overlays': 'Kaplamalar',
  'layers.basis': 'Temel',
  'layers.streets': 'Sokaklar',
  'layers.buildings': 'Binalar',
  'layers.water': 'Su',
  'text.font': 'Yazı tipi',
  'colors.textColor': 'Metin rengi',
  'colors.background': 'Arka plan',
  'colors.reset': 'Renkleri sıfırla',
  'export.button': 'Posteri dışa aktar',
  'cache.clear': 'Önbelleği temizle',
  'ai.label': 'AI Asistan',
});

export const translations: Record<Language, TranslationKeys> = {
  en, de, fr, it, es, pt, pl, nl, da, sv, no, fi, cs, hu, ro, hr, el, tr,
};

export type TranslationKey = keyof TranslationKeys;
