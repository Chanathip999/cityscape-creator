import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { clearAllCache } from '@/lib/streetDataCache';
import { toast } from 'sonner';

interface ClearCacheButtonProps {
  onCacheCleared?: () => void;
}

export const ClearCacheButton = ({ onCacheCleared }: ClearCacheButtonProps) => {
  const handleClearCache = async () => {
    try {
      console.log('[cache] clear button clicked');
      await clearAllCache();
      toast.success('Kartendaten-Cache geleert. Seite wird neu geladen...');
    } catch (e) {
      console.error('[cache] clear failed', e);
      toast.error('Cache konnte nicht vollständig geleert werden. Seite wird trotzdem neu geladen...');
    } finally {
      // Reload after a short delay so user sees the toast
      setTimeout(() => {
        if (onCacheCleared) {
          onCacheCleared();
        } else {
          window.location.reload();
        }
      }, 800);
    }
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
