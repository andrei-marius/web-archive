import { create } from "zustand";
import { Block, Blockchain } from "./blockchain";
import { Metadata } from "./types";
import { Socket } from "socket.io-client";
import { DataConnection } from "peerjs";
import io from "socket.io-client";

type AppState = {
  blockchain: Blockchain;
  // folderHandle: FileSystemDirectoryHandle | null;
  addBlock: (data: Metadata) => Promise<void>;
  updateChain: (chain: Block[]) => void;
  // setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void;
  socket: Socket;
  connections: DataConnection[];
};

const useStore = create<AppState>((set) => ({
  blockchain: new Blockchain(),
  // folderHandle: null,
  socket: io("http://localhost:3000"),
  connections: [],

  addBlock: async (data) => {
    const { blockchain } = useStore.getState();
    const newBlock = new Block(blockchain.chain.length, Date.now(), data);
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
}));

export default useStore;
