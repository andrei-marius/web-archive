import { useEffect, useState } from 'react';
import PreviewCard from './PreviewCard';
import { Metadata } from '@/lib/types/types';
import { v4 as uuidv4 } from "uuid";

const ExtensionCaptures = () => {
  const [pendingCaptures, setPendingCaptures] = useState<Metadata[]>([]);

  useEffect(() => {
    let receivedCaptures = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
  
      if (event.data.type === 'PAGE_CAPTURE_DATA') {
        console.log("Received captures:", event.data.data);
        receivedCaptures = true;

        const randomId = uuidv4();

        setPendingCaptures(prevCaptures => {
          const processedCaptures = event.data.data.map((capture: any) => {            
            return {
              ...capture.metadata,
              screenshot: capture.screenshot,
              mhtml: capture.mhtml,
              id: randomId
            };
          });
          
          return [...prevCaptures, ...processedCaptures];
        });
      }
    };
  
    window.addEventListener('message', handleMessage);
    
    const requestCaptures = () => {
      window.postMessage({ type: 'REQUEST_CAPTURES' }, '*');
      
      setTimeout(() => {
        if (!receivedCaptures) {
          window.postMessage({ type: 'REQUEST_CAPTURES' }, '*');
        }
      }, 1000);
    };
  
    requestCaptures();
  
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleRemoveCapture = (index: number) => {
    setPendingCaptures(prev => prev.filter((_, i) => i !== index));
  };

  return (
      <>
      {pendingCaptures.length > 0 && (
        <div className="w-full mb-20">
          <h1 className="text-2xl font-bold mb-4 text-center">Pending Captures ({pendingCaptures.length})</h1>
          <div className="space-y-4">
            {pendingCaptures.map((capture, index) => (
              <PreviewCard
                key={index}
                preview={capture}
                onCancel={() => handleRemoveCapture(index)}
                onSaveSuccess={() => handleRemoveCapture(index)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ExtensionCaptures;