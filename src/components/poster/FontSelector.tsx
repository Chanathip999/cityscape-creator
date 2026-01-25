import { FontFamily, FontSize, FONT_FAMILIES, FONT_SIZES, TEXT_COLORS } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, ALargeSmall, Palette } from 'lucide-react';

interface FontSelectorProps {
  fontFamily: FontFamily;
  fontSize: FontSize;
  customTextColor?: string;
  onFontFamilyChange: (font: FontFamily) => void;
  onFontSizeChange: (size: FontSize) => void;
  onTextColorChange?: (color: string | undefined) => void;
}

export const FontSelector = ({
  fontFamily,
  fontSize,
  customTextColor,
  onFontFamilyChange,
  onFontSizeChange,
  onTextColorChange,
}: FontSelectorProps) => {
  const selectedColorId = customTextColor 
    ? TEXT_COLORS.find(c => c.color === customTextColor)?.id || 'theme'
    : 'theme';

  const handleColorChange = (colorId: string) => {
    if (!onTextColorChange) return;
    const colorObj = TEXT_COLORS.find(c => c.id === colorId);
    onTextColorChange(colorObj?.color || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Type className="w-4 h-4" />
          Schriftart
        </Label>
        <Select value={fontFamily} onValueChange={(v) => onFontFamilyChange(v as FontFamily)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                <span className={font.className}>
                  {font.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ALargeSmall className="w-4 h-4" />
          Schriftgröße
        </Label>
        <Select value={fontSize} onValueChange={(v) => onFontSizeChange(v as FontSize)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.id} value={size.id}>
                {size.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {onTextColorChange && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Textfarbe
          </Label>
          <Select value={selectedColorId} onValueChange={handleColorChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXT_COLORS.map((colorOption) => (
                <SelectItem key={colorOption.id} value={colorOption.id}>
                  <div className="flex items-center gap-2">
                    {colorOption.color && (
                      <div 
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: colorOption.color }}
                      />
                    )}
                    <span>{colorOption.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
