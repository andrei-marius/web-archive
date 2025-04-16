import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PreviewCard from "./PreviewCard";
import { Metadata } from "@/lib/types";
import { getPreview } from "@/lib/api";

const UploadTab: React.FC = () => {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Metadata | null>(null);
  const { generatePreview, loading, error } = getPreview();

  const handleGenerate = async () => {
    if (url.trim()) {
      const data = await generatePreview(url);
      if (data.success && data.metadata) {
        setPreview(data.metadata);
        setUrl("");
      }
    }
  };

  return (
    <div className="flex items-center flex-col">
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
