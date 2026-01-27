import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PosterEditor } from '@/components/poster/PosterEditor';
import { usePaymentDownload } from '@/hooks/usePaymentDownload';
import { DEFAULT_CONFIG, ExportFormat, ExportResolution } from '@/types/poster';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { verifyAndDownload } = usePaymentDownload();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    const format = (searchParams.get('format') as ExportFormat) || 'png';
    const resolution = (searchParams.get('resolution') as ExportResolution) || '4k';

    if (payment === 'success' && sessionId && !isProcessingPayment) {
      setIsProcessingPayment(true);

      // Clear URL params immediately
      setSearchParams({});

      // Get config from localStorage or use default
      const savedConfig = localStorage.getItem('posterConfig');
      const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;

      // Verify and download
      verifyAndDownload(sessionId, config, format, resolution).finally(() => {
        setIsProcessingPayment(false);
      });
    } else if (payment === 'cancelled') {
      setSearchParams({});
      toast({
        title: 'Zahlung abgebrochen',
        description: 'Du kannst es jederzeit erneut versuchen.',
      });
    }
  }, [searchParams, setSearchParams, verifyAndDownload, isProcessingPayment]);

  return <PosterEditor onConfigChange={(config) => localStorage.setItem('posterConfig', JSON.stringify(config))} />;
};

export default Index;
