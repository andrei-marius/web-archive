import {
  MhtmlFile,
  DownloadRequest,
  Vote,
  SuggestedBlock,
  BlockchainMessage,
  Metadata,
} from "./types";

function isBlockchainMessage(data: unknown): data is BlockchainMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "payload" in data
  );
}

function isBlockchainSuggestion(data: unknown): data is SuggestedBlock {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "suggestedBlock" in data
  );
}

function isVote(data: unknown): data is Vote {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "newChain" in data
  );
}

function isDownloadRequest(data: unknown): data is DownloadRequest {
  return (
    typeof data === "object" && data !== null && "type" in data && "id" in data
  );
}

function isMhtmlFile(data: unknown): data is MhtmlFile {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "mhtmlFile" in data &&
    "id" in data
  );
}

function isMetadata(data: unknown): data is Metadata {
  return (
    typeof data === "object" &&
    data !== null &&
    "url" in data &&
    "title" in data &&
    "description" in data &&
    "keywords" in data &&
    "timestamp" in data &&
    "screenshotBuffer" in data &&
    (data.screenshotBuffer instanceof Uint8Array ||
      typeof data.screenshotBuffer === "object") &&
    "mhtmlContent" in data &&
    (data.mhtmlContent instanceof Uint8Array ||
      typeof data.mhtmlContent === "string") &&
    // "screenshotPath" in data &&
    // "mhtmlPath" in data &&
    "id" in data
  );
}

export {
  isMetadata,
  isMhtmlFile,
  isDownloadRequest,
  isVote,
  isBlockchainSuggestion,
  isBlockchainMessage,
};
