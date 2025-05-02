import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewCard from "./PreviewCard";
import { Metadata } from "@/lib/types/types";
import { getPreview } from "@/lib/api";
import ExtensionCaptures from "./ExtensionCaptures";
import { v4 as uuidv4 } from "uuid";
import useStore from "../lib/store";

const UploadTab: React.FC = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Metadata | null>(null);
  // const { generatePreview, loading, error } = getPreview();
  
    useEffect(() => {
        const chain = useStore.getState().blockchain;
        useStore.getState().updateChain(chain.chain);
        console.log("Blockchain initialized and state updated:", chain);
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
  
      if (event.data.type === 'WEBSITE_GENERATE_SINGLE' && event.data.data) {
        const randomId = uuidv4();

        console.log(event.data.data)
        
        setPreview({
          ...event.data.data.metadata,
          screenshot: event.data.data.screenshot,
          mhtml: event.data.data.mhtml,
          id: randomId
        });
  
        setUrl("");
        setLoading(false);
      } else if (event.data.type === 'CAPTURE_ERROR') {
        console.error('Capture error:', event.data.error);
        setLoading(false);
      }
    };
  
    window.addEventListener('message', handleMessage);
  
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleGenerate = async () => {
    if (url.trim()) {
      setLoading(true)
      window.postMessage({ action: 'startCaptureFromWebsite', url })
      // const data = await generatePreview(url);
      // if (data.success && data.metadata) {
      //   setPreview(data.metadata);
      //   setUrl("");
      // }
    }
  };

  return (
    <div className="flex items-center flex-col">
      <ExtensionCaptures />
      <Input
        onChange={(e) => setUrl(e.target.value)}
        value={url}
        type="text"
        placeholder="URL"
        className="w-[500px] mb-4"
      />
      <Button
        className="cursor-pointer"
        variant="outline"
        onClick={handleGenerate}
        disabled={preview !== null}
      >
        GENERATE
      </Button>

      {loading ? (
        <div className="flex flex-col space-y-3 my-10">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ) : preview ? (
        <PreviewCard
          preview={preview}
          onCancel={() => setPreview(null)}
          setPreview={setPreview}
        />
      ) : null}
    </div>
  );
};

export default UploadTab;
