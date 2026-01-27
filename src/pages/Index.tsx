import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PosterEditor } from '@/components/poster/PosterEditor';
import { usePaymentDownload } from '@/hooks/usePaymentDownload';
import { DEFAULT_CONFIG, DEFAULT_LAYER_VISIBILITY, ExportFormat, ExportResolution, PosterConfig } from '@/types/poster';
import { toast } from '@/hooks/use-toast';

// Clear old localStorage config on load to ensure new defaults are used
// This runs once on initial load
const CURRENT_CONFIG_VERSION = 3; // Increment to reset user configs - parks now disabled

const getInitialConfig = (): PosterConfig => {
  try {
    const savedVersion = localStorage.getItem('posterConfigVersion');
    const savedConfig = localStorage.getItem('posterConfig');
    
    // If version doesn't match, clear old config and use defaults
    if (savedVersion !== String(CURRENT_CONFIG_VERSION)) {
      localStorage.removeItem('posterConfig');
      localStorage.setItem('posterConfigVersion', String(CURRENT_CONFIG_VERSION));
      return DEFAULT_CONFIG;
    }
    
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      // Always merge with current defaults to pick up new properties
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        layerVisibility: {
          ...DEFAULT_LAYER_VISIBILITY,
          ...parsed.layerVisibility,
        },
      };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_CONFIG;
};

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { verifyAndDownload } = usePaymentDownload();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [initialConfig] = useState<PosterConfig>(getInitialConfig);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    const format = (searchParams.get('format') as ExportFormat) || 'png';
    const resolution = (searchParams.get('resolution') as ExportResolution) || '4k';

    if (payment === 'success' && sessionId && !isProcessingPayment) {
      setIsProcessingPayment(true);

      // Clear URL params immediately
      setSearchParams({});

      // Use initial config for payment verification
      verifyAndDownload(sessionId, initialConfig, format, resolution).finally(() => {
        setIsProcessingPayment(false);
      });
    } else if (payment === 'cancelled') {
      setSearchParams({});
      toast({
        title: 'Zahlung abgebrochen',
        description: 'Du kannst es jederzeit erneut versuchen.',
      });
    }
  }, [searchParams, setSearchParams, verifyAndDownload, isProcessingPayment, initialConfig]);

  const handleConfigChange = (config: PosterConfig) => {
    localStorage.setItem('posterConfig', JSON.stringify(config));
    localStorage.setItem('posterConfigVersion', String(CURRENT_CONFIG_VERSION));
  };

  return <PosterEditor initialConfig={initialConfig} onConfigChange={handleConfigChange} />;
};

export default Index;
