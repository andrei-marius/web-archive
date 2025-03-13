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
  blockchain: new Blockchain(),
  folderHandle: null,
  addBlock: async (data) => {
    const { blockchain } = useStore.getState();
    const newBlock = new Block(blockchain.chain.length, Date.now(), data);
    await blockchain.addBlock(newBlock);
    set({ blockchain });
  },
  updateChain: (chain) => {
    const newBlockchain = new Blockchain();
    newBlockchain.chain = chain;
    set({ blockchain: newBlockchain });
  },
  setFolderHandle: (handle) => set({ folderHandle: handle }),
}));

export default useStore;