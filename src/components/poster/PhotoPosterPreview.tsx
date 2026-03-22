import { useEffect, useRef, useCallback, useMemo } from 'react';
import { PosterConfig, ASPECT_RATIOS, TEXT_LAYOUT_STYLES } from '@/types/poster';
import { FONT_STACKS, TRACKING, getScaledFontSizes, drawTextWithTracking, FONT_WEIGHTS } from '@/lib/posterTypography';

interface PhotoPosterPreviewProps {
  config: PosterConfig;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const PhotoPosterPreview = ({ config, containerRef: externalRef }: PhotoPosterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalRef || internalRef;
  const imageRef = useRef<HTMLImageElement | null>(null);

  const {
    photoDataUrl,
    photoExif,
    theme,
    fontFamily,
    fontSize,
    fontSizeScale = 1,
    aspectRatio,
    customTextColor,
    customBackgroundColor,
    showGradients,
    textPosition,
    textLayoutStyle = 'classic',
  } = config;

  const textStyle = useMemo(
    () => TEXT_LAYOUT_STYLES.find(s => s.id === textLayoutStyle) || TEXT_LAYOUT_STYLES[0],
    [textLayoutStyle]
  );

  const aspectRatioConfig = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[3];
  const aspectValue = aspectRatioConfig.width / aspectRatioConfig.height;

  // Load the uploaded image
  useEffect(() => {
    if (!photoDataUrl) { imageRef.current = null; return; }
    const img = new Image();
    img.onload = () => { imageRef.current = img; drawPoster(); };
    img.src = photoDataUrl;
  }, [photoDataUrl]);

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const bgColor = customBackgroundColor || theme.bg;
    const textColor = customTextColor || theme.text;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw uploaded image (cover fit)
    const img = imageRef.current;
    if (img) {
      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgAspect > canvasAspect) {
        // Image is wider - crop sides
        sw = img.height * canvasAspect;
        sx = (img.width - sw) / 2;
      } else {
        // Image is taller - crop top/bottom
        sh = img.width / canvasAspect;
        sy = (img.height - sh) / 2;
      }

      // Leave space for text at bottom/top
      const textAreaRatio = 0.15; // 15% for text area
      let drawY = 0, drawH = height;

      if (textPosition === 'bottom') {
        drawH = height * (1 - textAreaRatio);
      } else if (textPosition === 'top') {
        drawY = height * textAreaRatio;
        drawH = height * (1 - textAreaRatio);
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, drawY, width, drawH);

      // Gradient overlay for text readability
      if (showGradients) {
        const gradH = height * 0.3;
        if (textPosition === 'bottom' || textPosition === 'center') {
          const grad = ctx.createLinearGradient(0, height - gradH, 0, height);
          grad.addColorStop(0, `${bgColor}00`);
          grad.addColorStop(1, bgColor);
          ctx.fillStyle = grad;
          ctx.fillRect(0, height - gradH, width, gradH);
        }
        if (textPosition === 'top' || textPosition === 'center') {
          const grad = ctx.createLinearGradient(0, gradH, 0, 0);
          grad.addColorStop(0, `${bgColor}00`);
          grad.addColorStop(1, bgColor);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, gradH);
        }
      }
    }

    // Build metadata lines
    const lines: string[] = [];
    const exif = photoExif;

    if (exif?.location) lines.push(exif.location);
    if (exif?.camera) lines.push(exif.camera);

    const techParts = [exif?.focalLength, exif?.aperture, exif?.shutterSpeed, exif?.iso].filter(Boolean);
    if (techParts.length) lines.push(techParts.join(' · '));
    if (exif?.dateTime) lines.push(exif.dateTime);

    if (lines.length === 0 && !img) {
      // Show placeholder
      ctx.fillStyle = textColor;
      ctx.font = `${Math.round(width * 0.03)}px ${FONT_STACKS[fontFamily]}`;
      ctx.textAlign = 'center';
      ctx.fillText('Upload a photo to get started', width / 2, height / 2);
      return;
    }

    // Draw text
    const fontSizes = getScaledFontSizes(fontSize, fontSizeScale, height);
    const fontStack = FONT_STACKS[fontFamily];
    ctx.fillStyle = textColor;

    // Determine text position
    let startY: number;
    const lineHeight = fontSizes.country * 1.6;
    const totalTextH = lines.length * lineHeight;

    if (textPosition === 'top') {
      startY = height * 0.05 + fontSizes.city;
    } else if (textPosition === 'center') {
      startY = (height - totalTextH) / 2 + fontSizes.city;
    } else {
      startY = height - totalTextH - height * 0.04;
    }

    const textAlign = textStyle.textAlign;
    let textX = width / 2;
    if (textAlign === 'left') textX = width * 0.06;
    else if (textAlign === 'right') textX = width * 0.94;

    ctx.textAlign = textAlign as CanvasTextAlign;

    // First line (location) - larger, like city name
    if (lines.length > 0) {
      const mainLine = lines[0];
      const displayText = textStyle.cityUppercase ? mainLine.toUpperCase() : mainLine;
      ctx.font = `${FONT_WEIGHTS.city} ${Math.round(fontSizes.city * 0.8)}px ${fontStack}`;
      const tracking = TRACKING[fontFamily] || 4;
      drawTextWithTracking(ctx, displayText, textX, startY, tracking * (height / 1000));
    }

    // Separator line (classic style)
    if (textStyle.showSeparatorLine && lines.length > 1) {
      const lineY = startY + fontSizes.city * 0.4;
      const lineW = width * 0.15;
      ctx.strokeStyle = textColor;
      ctx.lineWidth = Math.max(1, height * 0.001);
      ctx.beginPath();
      if (textAlign === 'center') {
        ctx.moveTo(width / 2 - lineW / 2, lineY);
        ctx.lineTo(width / 2 + lineW / 2, lineY);
      } else if (textAlign === 'left') {
        ctx.moveTo(textX, lineY);
        ctx.lineTo(textX + lineW, lineY);
      } else {
        ctx.moveTo(textX - lineW, lineY);
        ctx.lineTo(textX, lineY);
      }
      ctx.stroke();
      startY += fontSizes.city * 0.6;
    }

    // Remaining lines - smaller
    for (let i = 1; i < lines.length; i++) {
      const y = startY + i * lineHeight;
      const text = textStyle.countryUppercase ? lines[i].toUpperCase() : lines[i];
      ctx.font = `${FONT_WEIGHTS.country} ${Math.round(fontSizes.coords * 0.9)}px ${fontStack}`;
      const tracking = (TRACKING[fontFamily] || 2) * (height / 1000);
      drawTextWithTracking(ctx, text, textX, y, tracking);
    }
  }, [config, photoExif, theme, fontFamily, fontSize, fontSizeScale, textPosition, textLayoutStyle, customTextColor, customBackgroundColor, showGradients]);

  // Redraw on config changes
  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => drawPoster());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, drawPoster]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};
