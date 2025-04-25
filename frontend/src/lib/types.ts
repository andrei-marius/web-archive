import { Block, Blockchain } from "./blockchain";

type Metadata = {
  url: string;
  title: string;
  description: string;
  keywords: string;
  timestamp: string;
  screenshotBuffer: Buffer | Uint8Array;
  mhtmlContent: string | Uint8Array;
  // screenshotPath: string;
  // mhtmlPath: string;
  id: string;
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

type Role = 'primary' | 'replica';

type PBFTLogEntry = {
    type: 'PRE-PREPARE' | 'PREPARE' | 'COMMIT';
    view: number;
    sequence: number;
    blockHash: string;
    //sender: string; // peer ID
};

type PBFTLog = Record<number, {
    prePrepare?: PBFTLogEntry;
    prepares: PBFTLogEntry[];
    commits: PBFTLogEntry[];
}>;

type PBFTState = {
    role: Role;
    sequence: number;
    view: number;
    blockchain: Blockchain; 
    log: PBFTLog; 
};

type BlockRequest = {
    type: 'BLOCK-REQUEST',
    suggestedBlock: Metadata
}

type PrePrepareMessage = {
    type: 'PRE-PREPARE';
    suggestedBlock: Metadata;
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

type CommitMessage = {
    type: 'COMMIT';
    blockHash: string;
    view: number;
    sequence: number;
    //senderId: string;
};

export type {
  MhtmlFile,
  DownloadRequest,
  Vote,
  SuggestedBlock,
  BlockchainMessage,
  Metadata,
    OPFSFile,
    PBFTState,
    PBFTLog,
    PBFTLogEntry,
    Role,
    BlockRequest,
    PrePrepareMessage,
    PrepareMessage,
    CommitMessage
};
