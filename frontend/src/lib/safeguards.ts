import {
  MhtmlFile,
  DownloadRequest,
  Vote,
  SuggestedBlock,
  BlockchainMessage,
  Metadata,
  PrePrepareMessage,
  PrepareMessage,
  CommitMessage,
  ViewChangeMessage,
} from "./types/types";

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

function isPrePrepareMessage(data: unknown): data is PrePrepareMessage {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        "suggestedBlock" in data &&
        "blockHash" in data &&
        "view" in data &&
        "sequence" in data
    );
}

function isPrepareMessage(data: unknown): data is PrepareMessage {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        "blockHash" in data &&
        "view" in data &&
        "sequence" in data
    );
}
function isCommitMessage(data: unknown): data is CommitMessage {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        "blockHash" in data &&
        "view" in data &&
        "sequence" in data
    );
}
function isViewChangeMessage(data: unknown): data is ViewChangeMessage {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        "blockHash" in data &&
        "view" in data &&
        "sequence" in data &&
        "peerId" in data &&
        ("latestBlockHash" in data ? (data.latestBlockHash === null || typeof data.latestBlockHash === "string") : true)
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
  isPrePrepareMessage,
  isPrepareMessage,
  isCommitMessage,
  isViewChangeMessage,
};
