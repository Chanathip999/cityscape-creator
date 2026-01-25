import { FontFamily, FontSize, FONT_FAMILIES, FONT_SIZES } from '@/types/poster';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, ALargeSmall } from 'lucide-react';

interface FontSelectorProps {
  fontFamily: FontFamily;
  fontSize: FontSize;
  onFontFamilyChange: (font: FontFamily) => void;
  onFontSizeChange: (size: FontSize) => void;
}

export const FontSelector = ({
  fontFamily,
  fontSize,
  onFontFamilyChange,
  onFontSizeChange,
}: FontSelectorProps) => {
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
                <span className={font.id === 'mono' ? 'font-mono' : font.id === 'serif' ? 'font-serif' : 'font-sans'}>
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
    </div>
  );
};
