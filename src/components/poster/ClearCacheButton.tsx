import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { clearAllCache } from '@/lib/streetDataCache';
import { toast } from 'sonner';

interface ClearCacheButtonProps {
  onCacheCleared?: () => void;
}

export const ClearCacheButton = ({ onCacheCleared }: ClearCacheButtonProps) => {
  const handleClearCache = async () => {
    await clearAllCache();
    toast.success('Kartendaten-Cache geleert. Seite wird neu geladen...');
    
    // Reload after a short delay so user sees the toast
    setTimeout(() => {
      if (onCacheCleared) {
        onCacheCleared();
      } else {
        window.location.reload();
      }
    }, 1000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClearCache}
      className="gap-2"
    >
      <RefreshCw className="w-4 h-4" />
      Cache leeren
    </Button>
  );
};
