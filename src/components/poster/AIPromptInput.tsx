import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PosterConfig } from '@/types/poster';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface AIPromptInputProps {
  config: PosterConfig;
  onConfigUpdate: (updates: Partial<PosterConfig>) => void;
}

export const AIPromptInput = ({ config, onConfigUpdate }: AIPromptInputProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('poster-ai', {
        body: { message: userMessage, currentConfig: config },
      });
      if (error) throw error;
      if (data.configUpdates) {
        onConfigUpdate(data.configUpdates);
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      toast.error(t('ai.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4" />
        <span>{t('ai.label')}</span>
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={t('ai.placeholder')} disabled={isLoading} />
        <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="flex-shrink-0">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
