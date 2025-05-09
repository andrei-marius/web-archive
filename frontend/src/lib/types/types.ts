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

type Message = {
    type: string;
    [key: string]: unknown
};

type PrePrepareMessage = {
    type: 'PRE-PREPARE';
    suggestedBlock: Metadata;
    blockHash: string;
    view: number;
    sequence: number;
};

type PrepareMessage = {
    type: 'PREPARE';
    blockHash: string;
    view: number;
    sequence: number;
    //senderId: string;
};

type ViewChangeMessage = {
    type: "VIEW-CHANGE",
    view: number;
    sequence: number;
    peerId: string,
    latestBlockHash: string | null,
};

type CommitMessage = {
    type: 'COMMIT';
    blockHash: string;
    view: number;
    sequence: number;
    //senderId: string;
};

type PBFTLogEntry = {
    suggestedBlock: Metadata;
    blockHash: string,
    block: Block;
    prepares: string[]; 
    commits: string[];  
    prePrepareMessage: PrePrepareMessage;
    viewChangeMessage: ViewChangeMessage[];
};

type PBFTState = {
    role: "primary" | "replica";
    sequence: number;
    view: number;
    log: Record<number, PBFTLogEntry>;
    timeouts: Record<number, ReturnType<typeof setTimeout>>;
    primaryId: string;
};

export type {
  MhtmlFile,
  DownloadRequest,
  Vote,
  SuggestedBlock,
  BlockchainMessage,
  Metadata,
  OPFSFile,
  Message,
  PrePrepareMessage,
  PrepareMessage,
  CommitMessage,
  PBFTState,
  PBFTLogEntry,
  ViewChangeMessage,
};
