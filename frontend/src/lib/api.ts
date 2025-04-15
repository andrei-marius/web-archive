import { v4 as uuidv4 } from "uuid";
import { Metadata } from "./types";
import { suggestBlock } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";

export function getPreview() {
  const { fetchData, loading, error } = useFetch<{
    success: boolean;
    metadata?: Metadata;
    error?: string;
  }>();

  const generatePreview = async (url: string) => {
    const result = await fetchData("http://localhost:3000/scrape", {
      method: "POST",
      body: { url },
    });

    if (result.success && result.data?.success && result.data.metadata) {
      const randomId = uuidv4();
      const metadataWithoutPaths = {
        id: randomId,
        ...result.data.metadata,
      };

      suggestBlock(metadataWithoutPaths);
      return { success: true, metadata: metadataWithoutPaths };
    }

    return {
      success: result.data?.success || false,
      error: result.data?.error || result.error,
    };
  };

  return { generatePreview, loading, error };
}
