import io from "socket.io-client";
import Peer, { DataConnection } from "peerjs";
import { Block } from "./blockchain";
import useStore from "./store";
import { Metadata } from "./types";
import pako from 'pako';

const socket = io("http://localhost:3000");
let peer: Peer;
let connectedPeers: string[] = [];
let connections: DataConnection[] = [];

export function init() {
  socket.on("connect", () => {
    console.log("socket id:", socket.id);

    if (socket.id) {
      peer = new Peer(socket.id);
      console.log("peer id:", peer.id);

      peer.on("open", (peerId) => {
        console.log("My peer ID is:", peerId);

        if (connectedPeers.length > 0) {
          for (const id of connectedPeers) {
            const connection = peer.connect(id);

            connection.on("open", () => {
              console.log(peerId, "connected to:", id);
              connections.push(connection);
              connection.send('request_blockchain')

              connection.on("data", async function (data: unknown) {
                console.log("Received data:", data);

                if (isBlockchainMessage(data)) {
                  const { type, payload } = data;

                  if (type === "NEW_BLOCKCHAIN") {
                    useStore.getState().updateChain(payload);
                  }
                } else if (isRequestMessage(data)) {
                  const { id, type } = data
    
                  if (type === 'request') {
                    const arrayBuffer = await readFile(`page_${id}.mhtml`);
                    connection.send({ type: 'mhtml_file', mhtmlFile: arrayBuffer, id })
                    console.log('file sent')
                  }
                } else {
                  console.error("Received invalid data format:", data);
                }

                if (isMhtmlMessage(data)) {
                  const { mhtmlFile, type, id } = data
                  
                  if (type === 'mhtml_file') {
                    console.log('received file')
                    // Convert Uint8Array to ArrayBuffer if necessary
                    const arrayBuffer = mhtmlFile instanceof Uint8Array ? mhtmlFile.buffer : mhtmlFile;
                    await handleFileData(`page_${id}.mhtml`, arrayBuffer)
                    console.log('converted and downloaded file')
                  }
                }
                
                if (isMetadata(data)) {
                  // Restore the data before processing
                  const restoredData = restoreData(data);
              
                  // Process the restored data
                  console.log("Restored data:", restoredData);
                  useStore.getState().addBlock(restoredData);
                }
              });
            });
          }
        } else {
          console.log("no other peers");
        }

        peer.on("connection", (conn) => {
          console.log("received connection", conn);
          connections.push(conn);

          conn.on("data", async function (data: unknown) {
            console.log("Received data:", data);

            if (isBlockchainMessage(data)) {
              const { type, payload } = data;

              if (type === "NEW_BLOCKCHAIN") {
                
                // Synchronize the blockchain
                useStore.getState().updateChain(payload);
              }
            } else if (data === 'request_blockchain') {
              conn.send({ type: 'NEW_BLOCKCHAIN', payload: useStore.getState().blockchain.chain }) 
            } else if (isRequestMessage(data)) {
              const { id, type } = data

              if (type === 'request') {
                const arrayBuffer = await readFile(`page_${id}.mhtml`);
                conn.send({ type: 'mhtml_file', mhtmlFile: arrayBuffer, id })
                console.log('file sent')
              }
            } else {
              console.error("Received invalid data format:", data);
            }

            if (isMhtmlMessage(data)) {
              const { mhtmlFile, type, id } = data
              console.log('received file')
              console.log(type)
              if (type === 'mhtml_file') {
                console.log('received file')
                // Convert Uint8Array to ArrayBuffer if necessary
                const arrayBuffer = mhtmlFile instanceof Uint8Array ? mhtmlFile.buffer : mhtmlFile;
                await handleFileData(`page_${id}.mhtml`, arrayBuffer)
                console.log('converted and downloaded file')
              }
            }
            
            if (isMetadata(data)) {
              // Restore the data before processing
              const restoredData = restoreData(data);
          
              // Process the restored data
              console.log("Restored data:", restoredData);
              useStore.getState().addBlock(restoredData);
            }
          });
        });
      });
    }
  });

  socket.on("connectedPeers", (data) => {
    connectedPeers = data.filter((id: string) => id !== socket.id);
    console.log(connectedPeers);
  });

  socket.on('init_blockchain', (data) => {
    console.log("Received blockchain from server:", data);

    // Update the blockchain in the Zustand store
    useStore.getState().updateChain(data);
  })
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
    ("screenshotBuffer" in data && (data.screenshotBuffer instanceof Uint8Array || typeof data.screenshotBuffer === "object")) &&
    ("mhtmlContent" in data && (data.mhtmlContent instanceof Uint8Array || typeof data.mhtmlContent === "string")) &&
    "screenshotPath" in data &&
    "mhtmlPath" in data &&
    "id" in data
  );
}

export const handleFileData = async (filename: string, fileData: ArrayBuffer): Promise<void> => {
  if (!fileData || fileData.byteLength === 0) {
    console.error("Invalid file data received");
    return;
  }

  const saveToOpfs = async (): Promise<boolean> => {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      
      await writable.write(new Blob([fileData]));
      await writable.close();
      
      const savedFile = await fileHandle.getFile();
      if (savedFile.size !== fileData.byteLength) {
        console.error("File size mismatch after write");
        return false;
      }
      
      console.log(`Verified save of "${filename}" to OPFS (${fileData.byteLength} bytes)`);
      return true;
    } catch (error) {
      console.error('OPFS save error:', error);
      return false;
    }
  };

  const saveToLocal = async (): Promise<boolean> => {
    try {
      const blob = new Blob([fileData], { type: 'multipart/related' });
      
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Web Page Archive',
              accept: { 'multipart/related': ['.mhtml'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log(`Saved "${filename}" locally`);
          return true;
        } catch (error) {
          console.warn('File System Access API failed:', error);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      console.log(`Downloaded "${filename}" as fallback`);
      return true;
    } catch (error) {
      console.error('Local save failed:', error);
      return false;
    }
  };

  const [opfsResult, localResult] = await Promise.allSettled([
    saveToOpfs(),
    saveToLocal()
  ]);

  if (opfsResult.status === 'rejected' || localResult.status === 'rejected') {
    console.error('File save completed with errors');
  }
};

const readFile = async (filename: string): Promise<ArrayBuffer | undefined> => {
  try {
    const root = await navigator.storage.getDirectory();
    
    try {
      await root.getFileHandle(filename);
    } catch (err) {
      console.warn(`File "${filename}" not found in OPFS`);
      return undefined;
    }
    
    const fileHandle = await root.getFileHandle(filename);
    const file = await fileHandle.getFile();
    
    if (file.size === 0) {
      console.warn(`File "${filename}" is empty`);
      return undefined;
    }
    
    return await file.arrayBuffer();
  } catch (err) {
    console.error("Error reading file from OPFS:", err);
    return undefined;
  }
};

export function sendRequest(id: string) {
  for (const conn of connections) {
    if (conn.open) {
      conn.send({ type: 'request', id });
      console.log('request sent')
    } else {
      console.log("connection not open");
    }
  }
}

interface MhtmlMessage {
  type: string;
  mhtmlFile: ArrayBuffer | Uint8Array;
  id: string;
};

function isMhtmlMessage(data: unknown): data is MhtmlMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "mhtmlFile" in data &&
    'id' in data
  );
}

interface RequestMessage {
  type: string;
  id: string;
};

function isRequestMessage(data: unknown): data is RequestMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "id" in data
  );
}

function restoreData(data: Metadata): Metadata {
  let screenshotBuffer: Uint8Array | Buffer;

  if (data.screenshotBuffer instanceof Uint8Array || Buffer.isBuffer(data.screenshotBuffer)) {
    // If it's already a Uint8Array or Buffer, use it as-is
    screenshotBuffer = data.screenshotBuffer;
  } else {
    // If it's an object, convert it back to a Uint8Array or Buffer
    const values = Object.values(data.screenshotBuffer); // Extract values into an array
    screenshotBuffer = new Uint8Array(values as number[]); // Cast to number[]
  }

  // Decompress mhtmlContent (Uint8Array) back to a string
  let decompressedMhtml: string;
  if (data.mhtmlContent instanceof Uint8Array) {
    decompressedMhtml = pako.inflate(data.mhtmlContent, { to: "string" });
  } else {
    // If it's already a string, use it as-is
    decompressedMhtml = data.mhtmlContent;
  }

  // Return the restored data
  return {
    ...data,
    screenshotBuffer, // Uint8Array or Buffer
    mhtmlContent: decompressedMhtml, // Decompressed string
  };
}

export function send(data: Metadata) {
  // Convert screenshotBuffer to a Uint8Array
  const values = Object.values(data.screenshotBuffer); // Extract values into an array
  const uint8Array = new Uint8Array(values); // Convert to Uint8Array

  // Compress mhtmlContent using pako.deflate
  const compressedMhtml = pako.deflate(data.mhtmlContent); // Compress to Uint8Array

  // Update the data object with the converted values
  const processedData: Metadata = {
    ...data,
    screenshotBuffer: uint8Array, // Uint8Array
    mhtmlContent: compressedMhtml, // Uint8Array
  };

  // Add the processed data to the blockchain
  useStore
    .getState()
    .addBlock(processedData)
    .then(() => {
      const blockchain = useStore.getState().blockchain.chain;

      // Broadcast the updated blockchain to all connected peers
      for (const conn of connections) {
        if (conn.open) {
          conn.send({ type: "NEW_BLOCKCHAIN", payload: blockchain });
          console.log("sent blockchain");
        } else {
          console.log("connection not open");
        }
      }
    });
}

interface BlockchainMessage {
  type: string;
  payload: Block[];
};

function isBlockchainMessage(data: unknown): data is BlockchainMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "payload" in data
  );
}
