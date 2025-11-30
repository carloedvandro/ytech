import { useEffect, useState } from 'react';

export const useIsChromeAndroid = () => {
  const [isChromeAndroid, setIsChromeAndroid] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = /Mobile/.test(userAgent);
    
    const detected = isChrome && isAndroid && isMobile;
    console.log('🔍 Chrome Android Detection:', {
      userAgent,
      isChrome,
      isAndroid,
      isMobile,
      detected
    });
    
    setIsChromeAndroid(detected);
  }, []);

  return isChromeAndroid;
};
