import { useState, useCallback, useRef, useEffect } from 'react';
import { PosterConfig, TextOverrides, TextElementConfig, TextPositionOffset, TextOrientation } from '@/types/poster';
import { getTextPositions, getScaledFontSizes, FONT_STACKS, formatCoordinates, formatDisplayText } from '@/lib/posterTypography';
import { RotateCw } from 'lucide-react';

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

// Snap threshold - how close to center before snapping (in normalized units 0-1)
const SNAP_THRESHOLD = 0.03; // 3% of container dimension

export const TextOverlay = ({ config, containerWidth, containerHeight, onConfigUpdate }: TextOverlayProps) => {
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [resizeTarget, setResizeTarget] = useState<DragTarget>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [editingElement, setEditingElement] = useState<'city' | 'country' | null>(null);
  const [selectedElement, setSelectedElement] = useState<DragTarget>(null);
  const [showGuides, setShowGuides] = useState(false);
  const [snappedX, setSnappedX] = useState(false);
  const [snappedY, setSnappedY] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef<TextPositionOffset>({ x: 0.5, y: 0 });
  const initialScale = useRef(1);

  const TEXT_POSITIONS = getTextPositions(config.textPosition, {
    canvasHeight: containerHeight,
    fontSize: config.fontSize,
    fontSizeScale: config.fontSizeScale || 1,
    showCity: config.showCity,
    showCountry: config.showCountry,
    showCoordinates: config.showCoordinates,
  });
  const textColor = config.customTextColor || config.theme.text;
  const fontStack = FONT_STACKS[config.fontFamily];
  const baseFonts = getScaledFontSizes(containerHeight, config.fontSize);
  const fontSizeScale = config.fontSizeScale || 1;

  // Always sync textOverrides with adaptive TEXT_POSITIONS when format/typography changes
  // This keeps text properly positioned across different aspect ratios
  const prevPositionsRef = useRef({ title: 0, subtitle: 0, coords: 0 });
  
  useEffect(() => {
    const positionsChanged = 
      prevPositionsRef.current.title !== TEXT_POSITIONS.title ||
      prevPositionsRef.current.subtitle !== TEXT_POSITIONS.subtitle ||
      prevPositionsRef.current.coords !== TEXT_POSITIONS.coords;
    
    // Update if no overrides exist OR if positions changed AND user hasn't manually moved elements
    const hasCustomPosition = (id: 'city' | 'country' | 'coordinates') => {
      const override = config.textOverrides?.[id];
      if (!override?.position) return false;
      // Check if position differs significantly from previous default (user moved it)
      const prevDefault = id === 'city' ? prevPositionsRef.current.title 
        : id === 'country' ? prevPositionsRef.current.subtitle 
        : prevPositionsRef.current.coords;
      return Math.abs(override.position.y - prevDefault) > 0.01;
    };
    
    if (!config.textOverrides || (positionsChanged && !hasCustomPosition('city') && !hasCustomPosition('country') && !hasCustomPosition('coordinates'))) {
      onConfigUpdate({
        textOverrides: {
          city: { 
            ...config.textOverrides?.city,
            position: { x: config.textOverrides?.city?.position?.x ?? 0.5, y: TEXT_POSITIONS.title } 
          },
          country: { 
            ...config.textOverrides?.country,
            position: { x: config.textOverrides?.country?.position?.x ?? 0.5, y: TEXT_POSITIONS.subtitle } 
          },
          coordinates: { 
            ...config.textOverrides?.coordinates,
            position: { x: config.textOverrides?.coordinates?.position?.x ?? 0.5, y: TEXT_POSITIONS.coords } 
          },
        },
      });
    }
    
    prevPositionsRef.current = { 
      title: TEXT_POSITIONS.title, 
      subtitle: TEXT_POSITIONS.subtitle, 
      coords: TEXT_POSITIONS.coords 
    };
  }, [
    config.aspectRatio, // Re-sync when aspect ratio changes
    containerHeight,
    config.fontSize,
    config.fontSizeScale,
    config.textPosition,
    TEXT_POSITIONS.title,
    TEXT_POSITIONS.subtitle,
    TEXT_POSITIONS.coords,
    onConfigUpdate,
  ]);

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

  const getOrientation = useCallback((elementId: 'city' | 'country' | 'coordinates'): TextOrientation => {
    const override = getElementConfig(elementId);
    return override.orientation || 'horizontal';
  }, [getElementConfig]);

  const textElements: TextElement[] = [
    { id: 'city', text: formatDisplayText(config.city), defaultY: TEXT_POSITIONS.title, visible: config.showCity, editable: true },
    { id: 'country', text: formatDisplayText(config.countryLabel || config.country), defaultY: TEXT_POSITIONS.subtitle, visible: config.showCountry, editable: true },
    { id: 'coordinates', text: formatCoordinates(config.latitude, config.longitude), defaultY: TEXT_POSITIONS.coords, visible: config.showCoordinates, editable: false },
  ];

  // Toggle orientation for an element
  const toggleOrientation = useCallback((elementId: 'city' | 'country' | 'coordinates', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentOrientation = getOrientation(elementId);
    const newOrientation: TextOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    
    const newOverrides: TextOverrides = {
      ...config.textOverrides,
      [elementId]: {
        ...config.textOverrides?.[elementId],
        orientation: newOrientation,
      },
    };
    onConfigUpdate({ textOverrides: newOverrides });
  }, [config.textOverrides, getOrientation, onConfigUpdate]);

  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: DragTarget, isResize: boolean = false, handle: ResizeHandle = null) => {
    if (!elementId) return;
    e.preventDefault();
    e.stopPropagation();

    // Select the element
    setSelectedElement(elementId);
    // Clear editing mode when starting to drag
    setEditingElement(null);

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
    setSnappedX(false);
    setSnappedY(false);
  }, [getPosition, getScale, textElements]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!overlayRef.current) return;

    if (dragTarget) {
      const dx = (e.clientX - dragStartPos.current.x) / containerWidth;
      const dy = (e.clientY - dragStartPos.current.y) / containerHeight;

      let newX = Math.max(0.1, Math.min(0.9, initialPos.current.x + dx));
      let newY = Math.max(0.05, Math.min(0.95, initialPos.current.y + dy));

      // Snap to center horizontally
      const isNearCenterX = Math.abs(newX - 0.5) < SNAP_THRESHOLD;
      if (isNearCenterX) {
        newX = 0.5;
        setSnappedX(true);
      } else {
        setSnappedX(false);
      }

      // Snap to center vertically
      const isNearCenterY = Math.abs(newY - 0.5) < SNAP_THRESHOLD;
      if (isNearCenterY) {
        newY = 0.5;
        setSnappedY(true);
      } else {
        setSnappedY(false);
      }

      const newPos: TextPositionOffset = { x: newX, y: newY };

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
    setSnappedX(false);
    setSnappedY(false);
  }, []);

  // Global click listener to deselect when clicking outside text elements
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the overlay's text elements
      if (overlayRef.current && !overlayRef.current.contains(target)) {
        setSelectedElement(null);
        setEditingElement(null);
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedElement(null);
        setEditingElement(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
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

  // Double-click to start editing text
  const handleDoubleClick = useCallback((e: React.MouseEvent, elementId: 'city' | 'country' | 'coordinates', isEditable: boolean) => {
    e.stopPropagation();
    if (isEditable) {
      setEditingElement(elementId as 'city' | 'country');
    }
  }, []);

  // Single click to select
  const handleTextClick = useCallback((e: React.MouseEvent, elementId: 'city' | 'country' | 'coordinates') => {
    e.stopPropagation();
    setSelectedElement(elementId);
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
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ fontFamily: fontStack }}
    >
      {/* Guides - shown while dragging */}
      {showGuides && (
        <>
          {/* Vertical center line - highlight when snapped */}
          <div
            className={`absolute top-0 bottom-0 w-px pointer-events-none transition-colors ${
              snappedX ? 'bg-primary w-0.5' : 'bg-primary/50'
            }`}
            style={{ left: '50%' }}
          />
          {/* Horizontal center line - highlight when snapped */}
          <div
            className={`absolute left-0 right-0 h-px pointer-events-none transition-colors ${
              snappedY ? 'bg-primary h-0.5' : 'bg-primary/50'
            }`}
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
        const orientation = getOrientation(element.id);
        const isSelected = selectedElement === element.id;
        const isActive = dragTarget === element.id || resizeTarget === element.id;
        const isEditing = editingElement === element.id;
        const isVertical = orientation === 'vertical';

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
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move pointer-events-auto"
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!isEditing) handleMouseDown(e, element.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleTextClick(e, element.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleDoubleClick(e, element.id, element.editable);
            }}
          >
            {isEditing && element.editable ? (
              (() => {
                // Calculate proper width including letter-spacing
                const currentValue = element.id === 'city' ? config.city : (config.countryLabel || config.country);
                const charCount = Math.max(currentValue.length, 3);
                // Each character takes ~0.65em + letter-spacing
                const letterSpacingEm = element.id === 'city' ? 0.3 : 0.15;
                const charWidth = 0.65 + letterSpacingEm;
                const calculatedWidth = charCount * charWidth * fontSize + fontSize * 2; // Extra padding
                
                return (
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => handleTextChange(e, element.id as 'city' | 'country')}
                    onBlur={handleTextBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="bg-transparent border-none outline-none text-center caret-primary"
                    style={{
                      color: textColor,
                      fontSize: `${fontSize}px`,
                      fontWeight,
                      letterSpacing,
                      textTransform: 'uppercase',
                      width: `${calculatedWidth}px`,
                      writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                      textOrientation: isVertical ? 'mixed' : undefined,
                    }}
                  />
                );
              })()
            ) : (
              <span
                className={`select-none whitespace-nowrap px-1 py-0.5 rounded-sm transition-shadow ${
                  isSelected ? 'ring-1 ring-primary/50' : ''
                }`}
                style={{
                  color: textColor,
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  letterSpacing,
                  opacity,
                  textTransform: 'uppercase',
                  writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: isVertical ? 'mixed' : undefined,
                }}
              >
                {element.text}
              </span>
            )}

            {/* Controls - show when selected (not editing) */}
            {isSelected && !isEditing && (
              <>
                {/* Orientation toggle button - always visible when selected */}
                <button
                  className="absolute -top-8 left-1/2 -translate-x-1/2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-30"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => toggleOrientation(element.id, e)}
                  title={isVertical ? 'Horizontal ausrichten' : 'Vertikal ausrichten'}
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Corner resize handles */}
                {['nw', 'ne', 'sw', 'se'].map((handle) => (
                  <div
                    key={handle}
                    className="absolute w-3 h-3 bg-primary border-2 border-background rounded-sm"
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
