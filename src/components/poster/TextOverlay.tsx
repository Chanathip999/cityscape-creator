import { useState, useCallback, useRef, useEffect } from 'react';
import { PosterConfig, TextOverrides, TextElementConfig, TextPositionOffset } from '@/types/poster';
import { getTextPositions, getScaledFontSizes, FONT_STACKS, formatCoordinates, formatDisplayText } from '@/lib/posterTypography';

interface TextOverlayProps {
  config: PosterConfig;
  containerWidth: number;
  containerHeight: number;
  onConfigUpdate: (updates: Partial<PosterConfig>) => void;
}

type DragTarget = 'city' | 'country' | 'coordinates' | null;
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | null;

interface TextElement {
  id: 'city' | 'country' | 'coordinates';
  text: string;
  defaultY: number;
  visible: boolean;
  editable: boolean;
}

export const TextOverlay = ({ config, containerWidth, containerHeight, onConfigUpdate }: TextOverlayProps) => {
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [resizeTarget, setResizeTarget] = useState<DragTarget>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [editingElement, setEditingElement] = useState<'city' | 'country' | null>(null);
  const [showGuides, setShowGuides] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef<TextPositionOffset>({ x: 0.5, y: 0 });
  const initialScale = useRef(1);

  const TEXT_POSITIONS = getTextPositions(config.textPosition);
  const textColor = config.customTextColor || config.theme.text;
  const fontStack = FONT_STACKS[config.fontFamily];
  const baseFonts = getScaledFontSizes(containerHeight, config.fontSize);
  const fontSizeScale = config.fontSizeScale || 1;

  // Calculate effective sizes
  const getElementConfig = useCallback((elementId: 'city' | 'country' | 'coordinates'): TextElementConfig => {
    return config.textOverrides?.[elementId] || {};
  }, [config.textOverrides]);

  const getPosition = useCallback((elementId: 'city' | 'country' | 'coordinates', defaultY: number): TextPositionOffset => {
    const override = getElementConfig(elementId);
    return override.position || { x: 0.5, y: defaultY };
  }, [getElementConfig]);

  const getScale = useCallback((elementId: 'city' | 'country' | 'coordinates'): number => {
    const override = getElementConfig(elementId);
    return override.scale || 1;
  }, [getElementConfig]);

  const textElements: TextElement[] = [
    { id: 'city', text: formatDisplayText(config.city), defaultY: TEXT_POSITIONS.title, visible: config.showCity, editable: true },
    { id: 'country', text: formatDisplayText(config.countryLabel || config.country), defaultY: TEXT_POSITIONS.subtitle, visible: config.showCountry, editable: true },
    { id: 'coordinates', text: formatCoordinates(config.latitude, config.longitude), defaultY: TEXT_POSITIONS.coords, visible: config.showCoordinates, editable: false },
  ];

  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: DragTarget, isResize: boolean = false, handle: ResizeHandle = null) => {
    if (!elementId) return;
    e.preventDefault();
    e.stopPropagation();

    if (isResize) {
      setResizeTarget(elementId);
      setResizeHandle(handle);
      initialScale.current = getScale(elementId);
    } else {
      setDragTarget(elementId);
      const pos = getPosition(elementId, textElements.find(el => el.id === elementId)?.defaultY || 0.5);
      initialPos.current = pos;
    }
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setShowGuides(true);
  }, [getPosition, getScale, textElements]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!overlayRef.current) return;

    if (dragTarget) {
      const dx = (e.clientX - dragStartPos.current.x) / containerWidth;
      const dy = (e.clientY - dragStartPos.current.y) / containerHeight;

      const newPos: TextPositionOffset = {
        x: Math.max(0.1, Math.min(0.9, initialPos.current.x + dx)),
        y: Math.max(0.05, Math.min(0.95, initialPos.current.y + dy)),
      };

      const newOverrides: TextOverrides = {
        ...config.textOverrides,
        [dragTarget]: {
          ...config.textOverrides?.[dragTarget],
          position: newPos,
        },
      };

      onConfigUpdate({ textOverrides: newOverrides });
    }

    if (resizeTarget && resizeHandle) {
      const dy = (e.clientY - dragStartPos.current.y) / containerHeight;
      // Scale changes based on vertical drag (down = bigger)
      const scaleChange = resizeHandle.startsWith('s') ? dy * 2 : -dy * 2;
      const newScale = Math.max(0.3, Math.min(3, initialScale.current + scaleChange));

      const newOverrides: TextOverrides = {
        ...config.textOverrides,
        [resizeTarget]: {
          ...config.textOverrides?.[resizeTarget],
          scale: newScale,
        },
      };

      onConfigUpdate({ textOverrides: newOverrides });
    }
  }, [dragTarget, resizeTarget, resizeHandle, containerWidth, containerHeight, config.textOverrides, onConfigUpdate]);

  const handleMouseUp = useCallback(() => {
    setDragTarget(null);
    setResizeTarget(null);
    setResizeHandle(null);
    setShowGuides(false);
  }, []);

  useEffect(() => {
    if (dragTarget || resizeTarget) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragTarget, resizeTarget, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = useCallback((elementId: 'city' | 'country') => {
    setEditingElement(elementId);
  }, []);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, elementId: 'city' | 'country') => {
    if (elementId === 'city') {
      onConfigUpdate({ city: e.target.value });
    } else if (elementId === 'country') {
      onConfigUpdate({ countryLabel: e.target.value });
    }
  }, [onConfigUpdate]);

  const handleTextBlur = useCallback(() => {
    setEditingElement(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingElement(null);
    }
  }, []);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ fontFamily: fontStack }}
    >
      {/* Guides - shown while dragging */}
      {showGuides && (
        <>
          {/* Vertical center line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/50 pointer-events-none"
            style={{ left: '50%' }}
          />
          {/* Horizontal center line */}
          <div
            className="absolute left-0 right-0 h-px bg-primary/50 pointer-events-none"
            style={{ top: '50%' }}
          />
          {/* Thirds guides */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/30 pointer-events-none"
            style={{ left: '33.33%' }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/30 pointer-events-none"
            style={{ left: '66.66%' }}
          />
        </>
      )}

      {/* Text Elements */}
      {textElements.map((element) => {
        if (!element.visible) return null;

        const pos = getPosition(element.id, element.defaultY);
        const scale = getScale(element.id);
        const isActive = dragTarget === element.id || resizeTarget === element.id;
        const isEditing = editingElement === element.id;

        let fontSize = baseFonts.subtitle * fontSizeScale * scale;
        let fontWeight = 300;
        let letterSpacing = '0.15em';
        let opacity = 1;

        if (element.id === 'city') {
          fontSize = baseFonts.title * fontSizeScale * scale;
          fontWeight = 700;
          letterSpacing = '0.3em';
        } else if (element.id === 'coordinates') {
          fontSize = baseFonts.coords * fontSizeScale * scale;
          fontWeight = 400;
          letterSpacing = '0.05em';
          opacity = 0.7;
        }

        return (
          <div
            key={element.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-move transition-shadow ${
              isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background/50 rounded-md' : ''
            }`}
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            onDoubleClick={() => element.editable && handleDoubleClick(element.id as 'city' | 'country')}
          >
            {isEditing && element.editable ? (
              <input
                type="text"
                value={element.id === 'city' ? config.city : (config.countryLabel || config.country)}
                onChange={(e) => handleTextChange(e, element.id as 'city' | 'country')}
                onBlur={handleTextBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-background/80 backdrop-blur-sm border border-primary rounded px-2 py-1 text-center outline-none"
                style={{
                  color: textColor,
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  letterSpacing,
                  minWidth: '100px',
                }}
              />
            ) : (
              <span
                className="select-none whitespace-nowrap px-2 py-1"
                style={{
                  color: textColor,
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  letterSpacing,
                  opacity,
                  textTransform: 'uppercase',
                }}
              >
                {element.text}
              </span>
            )}

            {/* Resize handles - only show when active */}
            {isActive && !isEditing && (
              <>
                {/* Corner resize handles */}
                {['nw', 'ne', 'sw', 'se'].map((handle) => (
                  <div
                    key={handle}
                    className="absolute w-3 h-3 bg-primary border-2 border-background rounded-sm cursor-nwse-resize"
                    style={{
                      top: handle.startsWith('n') ? '-6px' : undefined,
                      bottom: handle.startsWith('s') ? '-6px' : undefined,
                      left: handle.endsWith('w') ? '-6px' : undefined,
                      right: handle.endsWith('e') ? '-6px' : undefined,
                      cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, element.id, true, handle as ResizeHandle)}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};