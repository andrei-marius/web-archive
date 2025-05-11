import { create } from "zustand";
import { Block, Blockchain } from "./blockchain";
import { Metadata } from "./types/types";
import { Socket } from "socket.io-client";
import { DataConnection } from "peerjs";
import io from "socket.io-client";
import { calculatePrimary } from "./utils"
import {
    PBFTState,
    PBFTLogEntry,
} from "@/lib/types/types";

type AppState = {
  blockchain: Blockchain;
  // folderHandle: FileSystemDirectoryHandle | null;
  addBlock: (data: Metadata) => Promise<void>;
  updateChain: (chain: Block[]) => void;
  // setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void;
  socket: Socket | null;
  connections: DataConnection[];
  peerId: string | "";
  setPeerId: (id: string) => void;

    PBFT: PBFTState;
    updatePBFT: (newPartial: Partial<PBFTState>) => void;
    appendToLog: (
        sequence: number,
        entry: Partial<PBFTLogEntry>
    ) => void;
};


const useStore = create<AppState>((set) => ({
  blockchain: new Blockchain(),
  // folderHandle: null,
  socket: io('http://localhost:3000/'),
  connections: [],
    peerId: "", // or "" if you prefer
    setPeerId: (id) => set({ peerId: id }),
  addBlock: async (data) => {
    const { blockchain } = useStore.getState();
    const newBlock = new Block(blockchain.chain.length, /*Date.now(),*/ data);
    await blockchain.addBlock(newBlock);

    // Send the ENTIRE updated chain to the backend
    const response = await fetch("http://localhost:3000/blockchain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: blockchain.chain }), // Send full chain
    });

    if (!response.ok) throw new Error("Failed to sync with backend");
  },

  // setFolderHandle: (handle) => set({ folderHandle: handle }),
  updateChain: (chain) => set({ blockchain: new Blockchain(chain) }),
  updateConnections: (newConnections: DataConnection[]) =>
    set({ connections: newConnections }),

    PBFT: {
        role: "replica",
        sequence: 0,
        view: 0,
        log: {},
        timeouts: {},
        primaryId: "", // left blank intentionally, update on new request
    },

    updatePBFT: (newPartial) =>
        set((state) => ({
            PBFT: { ...state.PBFT, ...newPartial },
        })),

    appendToLog: (sequence, entry) =>
        set((state) => ({
            PBFT: {
                ...state.PBFT,
                log: {
                    ...state.PBFT.log,
                    [sequence]: {
                        ...state.PBFT.log[sequence],
                        ...entry, // merge old entry into the new partial data 

                        prepares: entry.prepares
                            ? [...(state.PBFT.log[sequence]?.prepares || []), ...entry.prepares]
                            : state.PBFT.log[sequence]?.prepares || [],

                        commits: entry.commits
                            ? [...(state.PBFT.log[sequence]?.commits || []), ...entry.commits]
                            : state.PBFT.log[sequence]?.commits || [],

                        prePrepareMessage: entry.prePrepareMessage // Store PrePrepareMessage as a single object
                            ? entry.prePrepareMessage
                            : state.PBFT.log[sequence]?.prePrepareMessage, // Use the existing one if available
                        
                        viewChangeMessage: entry.viewChangeMessage 
                            ? [...(state.PBFT.log[sequence]?.viewChangeMessage || []), ...entry.viewChangeMessage]
                            : state.PBFT.log[sequence]?.viewChangeMessage || [],

                        block: entry.block ?? state.PBFT.log[sequence]?.block,
                        blockHash: entry.blockHash ?? state.PBFT.log[sequence]?.blockHash,
                        suggestedBlock: entry.suggestedBlock ?? state.PBFT.log[sequence]?.suggestedBlock,
                    }

,
                },
            }
        })),

}));

export default useStore;
