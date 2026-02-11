import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { clearAllCache } from '@/lib/streetDataCache';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ClearCacheButtonProps {
  onCacheCleared?: () => void;
}

export const ClearCacheButton = ({ onCacheCleared }: ClearCacheButtonProps) => {
  const { t } = useLanguage();

  const handleClearCache = async () => {
    try {
      console.log('[cache] clear button clicked');
      await clearAllCache();
      toast.success(t('cache.cleared'));
    } catch (e) {
      console.error('[cache] clear failed', e);
      toast.error(t('cache.clearFailed'));
    } finally {
      setTimeout(() => {
        if (onCacheCleared) onCacheCleared();
        else window.location.reload();
      }, 800);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClearCache} className="gap-2">
      <RefreshCw className="w-4 h-4" />
      {t('cache.clear')}
    </Button>
  );
};
