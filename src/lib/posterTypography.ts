/**
 * Shared typography configuration for poster rendering.
 * This is the single source of truth for font settings used by both
 * the detailed (tile) and minimalist (vector/canvas) render modes.
 */

import { FontFamily, FontSize, TextPosition } from '@/types/poster';

export type TextPositions = {
  title: number;
  decorativeLine: number;
  subtitle: number;
  coords: number;
  attribution: number;
};

export type AdaptiveTextLayoutOptions = {
  canvasHeight: number;
  fontSize: FontSize;
  fontSizeScale?: number;
  showCity?: boolean;
  showCountry?: boolean;
  showCoordinates?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Font Families
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_STACKS: Record<FontFamily, string> = {
  mono: '"Roboto Mono", ui-monospace, monospace',
  sans: 'Inter, system-ui, sans-serif',
  serif: '"Cormorant Garamond", Georgia, serif',
  display: '"Bebas Neue", Impact, sans-serif',
  elegant: '"Playfair Display", Georgia, serif',
  condensed: 'Oswald, "Arial Narrow", sans-serif',
  script: '"Dancing Script", cursive',
  retro: '"Righteous", cursive',
  minimal: '"Raleway", sans-serif',
  brutalist: '"Space Grotesk", sans-serif',
};

export const FONT_CSS_CLASSES: Record<FontFamily, string> = {
  mono: 'font-mono',
  sans: 'font-sans',
  serif: 'font-serif',
  display: 'font-display',
  elegant: 'font-elegant',
  condensed: 'font-condensed',
  script: 'font-script',
  retro: 'font-retro',
  minimal: 'font-minimal',
  brutalist: 'font-brutalist',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tracking (Letter Spacing)
// ─────────────────────────────────────────────────────────────────────────────

/** Letter-spacing in em units for each text element */
export const TRACKING = {
  title: 0.3,      // City name
  subtitle: 0.15,  // Country name
  coords: 0.05,    // Coordinates
} as const;

/** CSS tracking classes for Tailwind */
export const TRACKING_CLASSES = {
  title: 'tracking-[0.3em]',
  subtitle: 'tracking-[0.15em]',
  coords: 'tracking-[0.05em]',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Positioning (relative to canvas height, 0 = top, 1 = bottom)
// ─────────────────────────────────────────────────────────────────────────────

/** Text positions for 'bottom' placement (default) */
export const TEXT_POSITIONS_BOTTOM: TextPositions = {
  title: 0.82,
  decorativeLine: 0.86,
  subtitle: 0.895,
  coords: 0.935,
  attribution: 0.98,
} as const;

/** Text positions for 'center' placement */
export const TEXT_POSITIONS_CENTER: TextPositions = {
  title: 0.46,
  decorativeLine: 0.50,
  subtitle: 0.535,
  coords: 0.575,
  attribution: 0.98,
} as const;

/** Text positions for 'top' placement */
export const TEXT_POSITIONS_TOP: TextPositions = {
  title: 0.08,
  decorativeLine: 0.12,
  subtitle: 0.155,
  coords: 0.195,
  attribution: 0.98,
} as const;

/**
 * Get text positions.
 *
 * If `opts` is provided, we compute an adaptive layout that keeps consistent
 * spacing across aspect ratios and avoids overlap.
 */
export const getTextPositions = (position: TextPosition, opts?: AdaptiveTextLayoutOptions): TextPositions => {
  if (opts) return getAdaptiveTextPositions(position, opts);
  switch (position) {
    case 'top': return TEXT_POSITIONS_TOP;
    case 'center': return TEXT_POSITIONS_CENTER;
    default: return TEXT_POSITIONS_BOTTOM;
  }
};

/** Legacy export for backward compatibility */
export const TEXT_POSITIONS = TEXT_POSITIONS_BOTTOM;

function clamp01(v: number, min = 0.02, max = 0.98) {
  return Math.max(min, Math.min(max, v));
}

function getAnchor(position: TextPosition): TextPositions {
  switch (position) {
    case 'top':
      return TEXT_POSITIONS_TOP;
    case 'center':
      return TEXT_POSITIONS_CENTER;
    default:
      return TEXT_POSITIONS_BOTTOM;
  }
}

function getAdaptiveTextPositions(position: TextPosition, opts: AdaptiveTextLayoutOptions): TextPositions {
  const {
    canvasHeight,
    fontSize,
    fontSizeScale = 1,
    showCity = true,
    showCountry = true,
    showCoordinates = true,
  } = opts;

  const anchor = getAnchor(position);
  const base = getScaledFontSizes(canvasHeight, fontSize);

  const sizes = {
    title: base.title * fontSizeScale,
    subtitle: base.subtitle * fontSizeScale,
    coords: base.coords * fontSizeScale,
  };

  // Spacing derived from font sizes (keeps consistent rhythm across formats)
  const gapTitleToLine = Math.max(canvasHeight * 0.01, sizes.title * 0.22);
  const gapLineToSubtitle = Math.max(canvasHeight * 0.01, sizes.subtitle * 0.55);
  const gapSubtitleToCoords = Math.max(canvasHeight * 0.01, sizes.coords * 0.9);

  // Anchor around the coords position (matches current visual intent)
  const coordsY = canvasHeight * anchor.coords;

  let subtitleY = canvasHeight * anchor.subtitle;
  let titleY = canvasHeight * anchor.title;
  let decorativeLineY = canvasHeight * anchor.decorativeLine;

  // Build from bottom-up so the block stays stable and never overlaps
  let cursorY = coordsY;
  if (showCoordinates) {
    cursorY = coordsY - sizes.coords / 2;
  }

  if (showCountry) {
    const subtitleCenter = cursorY - gapSubtitleToCoords - sizes.subtitle / 2;
    subtitleY = subtitleCenter;
    cursorY = subtitleCenter - sizes.subtitle / 2;
  }

  if (showCity) {
    // Decorative line sits between title and subtitle
    const lineCenter = cursorY - gapLineToSubtitle - (gapTitleToLine * 0.45);
    decorativeLineY = lineCenter;
    const titleCenter = lineCenter - gapTitleToLine - sizes.title / 2;
    titleY = titleCenter;
  }

  // Normalize
  const title = clamp01(titleY / canvasHeight);
  const decorativeLine = clamp01(decorativeLineY / canvasHeight);
  const subtitle = clamp01(subtitleY / canvasHeight);
  const coords = clamp01(coordsY / canvasHeight);

  return {
    title,
    decorativeLine,
    subtitle,
    coords,
    attribution: anchor.attribution,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Font Sizes
// ─────────────────────────────────────────────────────────────────────────────

/** Base font sizes in pixels at 1000px canvas height (scale proportionally) */
export const BASE_FONT_SIZES = {
  title: 72,
  subtitle: 28,
  coords: 18,
  attribution: 10,
} as const;

/** Multipliers for different font size settings */
export const FONT_SIZE_MULTIPLIERS: Record<FontSize, number> = {
  small: 0.8,
  medium: 1.0,
  large: 1.2,
};

/** CSS font size classes for tile/detailed mode */
export const FONT_SIZE_CLASSES: Record<FontSize, {
  title: string;
  subtitle: string;
  coords: string;
}> = {
  small: {
    title: 'text-2xl md:text-3xl',
    subtitle: 'text-xs md:text-sm',
    coords: 'text-[10px] md:text-xs',
  },
  medium: {
    title: 'text-3xl md:text-4xl',
    subtitle: 'text-sm md:text-base',
    coords: 'text-xs md:text-sm',
  },
  large: {
    title: 'text-4xl md:text-5xl',
    subtitle: 'text-base md:text-lg',
    coords: 'text-sm md:text-base',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Font Weights
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_WEIGHTS = {
  title: 700,      // Bold
  subtitle: 300,   // Light
  coords: 400,     // Regular
  attribution: 400,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lon: number): string => {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} / ${lonStr}`;
};

/**
 * Convert text to uppercase (for poster display)
 * Note: We use CSS letter-spacing (tracking) for spacing, not injected spaces.
 */
export const formatDisplayText = (text: string): string => {
  return text.toUpperCase();
};

/**
 * Calculate scaled font sizes based on canvas height
 */
export const getScaledFontSizes = (
  canvasHeight: number,
  fontSize: FontSize
) => {
  const scale = canvasHeight / 1000;
  const multiplier = FONT_SIZE_MULTIPLIERS[fontSize];
  
  return {
    title: BASE_FONT_SIZES.title * scale * multiplier,
    subtitle: BASE_FONT_SIZES.subtitle * scale * multiplier,
    coords: BASE_FONT_SIZES.coords * scale * multiplier,
    attribution: BASE_FONT_SIZES.attribution * scale,
  };
};

/**
 * Draw text with letter-spacing (tracking) on a canvas.
 * This simulates CSS letter-spacing for canvas rendering.
 */
export const drawTextWithTracking = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  trackingEm: number,
  fontSizePx: number
) => {
  const spacing = trackingEm * fontSizePx;
  const chars = text.split('');
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((acc, w) => acc + w, 0) + spacing * Math.max(0, chars.length - 1);

  let cursor = x - totalWidth / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    ctx.fillText(ch, cursor + widths[i] / 2, y);
    cursor += widths[i] + spacing;
  }
};
