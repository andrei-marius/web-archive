import { Block } from "../blockchain";

type Metadata = {
  url: string;
  title: string;
  description: string;
  keywords: string;
  timestamp: string;
  screenshot: Buffer | Uint8Array | any;
  mhtml: string | Uint8Array | any;
  // screenshotPath: string;
  // mhtmlPath: string;
  id: string;
  ogTitle: string;
  ogDescription: string;
};

type BlockchainMessage = {
  type: string;
  payload: Block[];
};

type SuggestedBlock = {
  type: string;
  suggestedBlock: Metadata;
};

type Vote = {
  type: string;
  newChain: Metadata;
};

type DownloadRequest = {
  type: string;
  id: string;
};

type MhtmlFile = {
  type: string;
  mhtmlFile: ArrayBuffer | Uint8Array;
  id: string;
};

type OPFSFile = {
  path: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string | ArrayBuffer | null;
};

export type {
  MhtmlFile,
  DownloadRequest,
  Vote,
  SuggestedBlock,
  BlockchainMessage,
  Metadata,
  OPFSFile,
};
