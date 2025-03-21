import io from "socket.io-client";
import Peer, { DataConnection } from "peerjs";
import { Block, Blockchain } from "./blockchain";
import useStore from "./store";
import { Metadata } from "./types";

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
                          // Synchronize the blockchain
                          useStore.getState().updateChain(payload);

                      }
                  } else if (isBlockchainSuggestion(data)) {
                      const { type, suggestedBlock } = data;

                      if (type === "SUGGEST_BLOCK") {
                          // temp blockchain to check before updating the real one with a new block
                          let tempChain: Blockchain = useStore.getState().blockchain;
                          console.log("tempChain", tempChain);

                          // temp block containing proposed metadata
                          let tempBlock = new Block(tempChain!.chain.length, Date.now(), suggestedBlock);

                           tempChain!.addBlock(tempBlock);
                          // console.log("added new block tempChain", tempChain);
                          if (await tempChain.isChainValid() == true) {
                              // add more checks
                              console.log("chain has correct hash, shit worked");



                          } else {
                              console.error("Blockchain addition rejected due to hash missmatch")
                          }
                      }
                  }
                  else if (data === 'type_request') {
                  const arrayBuffer = await readFile('page.mhtml');
                  connection.send(arrayBuffer)
                  console.log('file sent')
                } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
                  console.log('received file')
                  // Convert Uint8Array to ArrayBuffer if necessary
                  const arrayBuffer = data instanceof Uint8Array ? data.buffer : data;
                  await handleFileData('page.mhtml', arrayBuffer)
                  console.log('converted and downloaded file')
                }else {
                  console.error("Received invalid data format:", data);
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
            } else if (data === 'type_request') {
              const arrayBuffer = await readFile('page.mhtml');
              conn.send(arrayBuffer)
              console.log('file sent')
            } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
              console.log('received file')
              // Convert Uint8Array to ArrayBuffer if necessary
              const arrayBuffer = data instanceof Uint8Array ? data.buffer : data;
              await handleFileData('page.mhtml', arrayBuffer)
              console.log('converted and downloaded file')
            }else {
              console.error("Received invalid data format:", data);
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

// Function to handle incoming file data
export const handleFileData = async (filename: string, fileData: ArrayBuffer) => {
  const folderHandle = useStore.getState().folderHandle;

  if (!folderHandle) {
    console.error("No folder access granted");
    return;
  }

  try {
    // Create a new file handle in the folder
    const fileHandle = await folderHandle.getFileHandle(filename, { create: true });

    // Create a writable stream to the file
    const writableStream = await fileHandle.createWritable();

    // Write the ArrayBuffer to the file
    await writableStream.write(fileData);

    // Close the stream to save the file
    await writableStream.close();

    console.log(`File "${filename}" saved successfully`);
  } catch (err) {
    console.error("Error saving file:", err);
  }
};

// Function to read a specific file
const readFile = async (filename: string) => {
  const folderHandle = useStore.getState().folderHandle;

  if (!folderHandle) {
    console.error("No folder access granted");
    return;
  }

  try {
    const fileHandle = await folderHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const fileData = await file.arrayBuffer();
    console.log("File data:", fileData);
    return fileData;
  } catch (err) {
    console.error("Error reading file:", err);
  }
};

export function sendRequest() {
  console.log(connections)
  for (const conn of connections) {
    if (conn.open) {
      conn.send('type_request');
      console.log('request sent')
    } else {
      console.log("connection not open");
    }
  }
}

export function send(data: Metadata) {
  console.log("Sending data to connections:", connections);

  useStore
    .getState()
    .addBlock(data)
    .then(() => {
      const blockchain = useStore.getState().blockchain.chain;

      for (const conn of connections) {
          if (conn.open) {
            // send only the data and set type to a specific name for validation 
          conn.send({ type: "NEW_BLOCKCHAIN", payload: blockchain });
          console.log("sent blockchain");
        } else {
          console.log("connection not open");
        }
      }
    });
}
export function suggestBlock(data: Metadata) {
    console.log("Sending data to connections:", connections);
    const metadata = data;
            for (const conn of connections) {
                if (conn.open) {
                    // send only the data and set type to a specific name for validation 
                    conn.send({ type: "SUGGEST_BLOCK", suggestedBlock: metadata });
                    console.log("sent block for validation");
                } else {
                    console.log("connection not open");
                }
            }
        }


interface BlockchainMessage {
  type: string;
  payload: Block[];
};

interface SuggestedBlock {
    type: string;
    suggestedBlock: Metadata;
};

/* 
function validation(data: Metadata) {
    const blockchain = useStore.getState().blockchain;
    blockchain.isChainValid();
} */
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
