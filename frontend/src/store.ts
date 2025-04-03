import { create } from "zustand";
import { Block, Blockchain } from "./blockchain";
import { Metadata } from "./types";

interface BlockchainState {
  blockchain: Blockchain;
  folderHandle: FileSystemDirectoryHandle | null;
  addBlock: (data: Metadata) => Promise<void>;
  updateChain: (chain: Block[]) => void;
  setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void;
}

const useStore = create<BlockchainState>((set) => ({
  blockchain: new Blockchain([]),  // Empty chain
  folderHandle: null,
  
  addBlock: async (data) => {
    const { blockchain } = useStore.getState();
    const newBlock = new Block(blockchain.chain.length, Date.now(), data);
    await blockchain.addBlock(newBlock);
    
    // Send the ENTIRE updated chain to the backend
    const response = await fetch("http://localhost:3000/blockchain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: blockchain.chain }),  // Send full chain
    });

    if (!response.ok) throw new Error("Failed to sync with backend");
  },

  updateChain: (chain) => set({ blockchain: new Blockchain(chain) }),
  setFolderHandle: (handle) => set({ folderHandle: handle }),
}));

export default useStore;