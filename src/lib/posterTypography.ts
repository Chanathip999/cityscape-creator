/**
 * Shared typography configuration for poster rendering.
 * This is the single source of truth for font settings used by both
 * the detailed (tile) and minimalist (vector/canvas) render modes.
 */

import { FontFamily, FontSize } from '@/types/poster';

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
};

export const FONT_CSS_CLASSES: Record<FontFamily, string> = {
  mono: 'font-mono',
  sans: 'font-sans',
  serif: 'font-serif',
  display: 'font-display',
  elegant: 'font-elegant',
  condensed: 'font-condensed',
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
// From maptoposter Python script using ax.transAxes:
// https://github.com/Chanathip999/maptoposter/blob/main/create_map_poster.py
//
// Python y-coordinates (from bottom): Canvas y-coordinates (from top):
// - City:       y=0.14  → 1-0.14  = 0.86
// - Line:       y=0.125 → 1-0.125 = 0.875
// - Country:    y=0.10  → 1-0.10  = 0.90
// - Coords:     y=0.07  → 1-0.07  = 0.93
// - Attribution: y=0.02 → 1-0.02  = 0.98
//
// IMPORTANT: These exact values match the Python script for visual parity
// ─────────────────────────────────────────────────────────────────────────────

export const TEXT_POSITIONS = {
  title: 0.82,           // City name: ABOVE the decorative line
  decorativeLine: 0.86,  // Decorative line: between city and country
  subtitle: 0.895,       // Country name: BELOW the decorative line
  coords: 0.935,         // Coordinates: at the very bottom
  attribution: 0.98,     // Attribution: Python y=0.02
} as const;

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
