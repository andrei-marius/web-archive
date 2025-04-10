import io, { connect } from "socket.io-client";
import Peer, { DataConnection } from "peerjs";
import { Block, Blockchain } from "./blockchain";
import useStore from "./store";
import { Metadata } from "./types";
import pako from 'pako';
import _ from "lodash";

const socket = io("http://localhost:3000");
let peer: Peer;
let connectedPeers: string[] = [];
let connections: DataConnection[] = [];
let yesVotes = 0;
let noVotes = 0;

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
                } else if (isBlockchainSuggestion(data)) {
                  console.log("got suggestion");
                  const { type, suggestedBlock } = data;

                  if (type === "SUGGEST_BLOCK") {
                    // temp blockchain to check before updating the real one with a new block

                    //const tempChain: Blockchain = useStore.getState().blockchain;

                    // made a clone so as to not refence the same object un useStore
                    const tempChain: Blockchain = _.cloneDeep(useStore.getState().blockchain);
                    console.log("Before adding block (stringified so no object methods)::", JSON.parse(JSON.stringify(tempChain)));
                    
                    // temp block containing proposed metadata
                    const tempBlock = new Block(tempChain!.chain.length, Date.now(), suggestedBlock);
                    
                    await tempChain!.addBlock(tempBlock);
                    console.log("added new block tempChain", tempChain);
                    // console.log("latest block", tempChain.getLatestBlock());
                    if (await tempChain.isChainValid() == true) {
                      // add more checks
                      console.log("chain has correct hash, shit worked");
                      
                      // send response to server
                      
                      sendVoteYes(suggestedBlock);
                      // socket.emit("VOTE_BLOCK_YES", tempChain); //perhaps send along the id(connection array filter id)
                      return 
                    } else {
                      console.error("Blockchain addition rejected due to hash missmatch");
                      sendVoteNo();
                      //socket.emit("VOTE_BLOCK_NO", tempChain);
                      // send response to server io.emit("VOTE_BLOCK_NO")
                    }
                  }
                } else if (isVote(data)) {
                  const { type, newChain } = data;
                  console.log("isVote on open");
                  switch (type) {
                    case "VOTE_BLOCK_YES":
                      console.log("Received vote in the possitive:", data.type);
                      yesVotes = yesVotes + 1;
                      console.log("yesVotes:", yesVotes);
                      if (yesVotes >= connectedPeers.length) {
                        send(newChain);
                        // reset the voting variables
                        yesVotes = 0;
                        noVotes = 0;
                        return;
                        // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
                        // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
                      }
                      if (yesVotes + noVotes >= connectedPeers.length) {
                        if (yesVotes >= noVotes) {
                          send(newChain);
                          yesVotes = 0;
                          noVotes = 0;
                          return;
                        } else {
                          for (const conn of connections) {
                            if (conn.open) {
                              // send only the data and set type to a specific name for validation
                              conn.send({ type: "MAJORITY_NO" });
                              console.log("voted no");
                            } else {
                              console.log("connection not open");
                            }
                          };
                          // reset the voting variables
                          yesVotes = 0;
                          noVotes = 0;
                          return;
                        }
                      }
                      break;
                    case "VOTE_BLOCK_NO":
                      console.log("Received vote in the negative:", data.type);
                      noVotes = noVotes + 1;
                      if (noVotes > (connectedPeers.length / 2)) {
                        for (const conn of connections) {
                          if (conn.open) {
                            // send only the data and set type to a specific name for validation
                            conn.send({ type: "MAJORITY_NO" });
                            console.log("voted no");
                          } else {
                            console.log("connection not open");
                          }
                          // reset the voting variables
                          yesVotes = 0;
                          noVotes = 0;
                          return;
                        };
                        // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
                        // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
                      }
                      if (yesVotes + noVotes >= connectedPeers.length) {
                        if (yesVotes >= noVotes) {
                          send(newChain);
                          // reset the voting variables
                          yesVotes = 0;
                          noVotes = 0;
                          return;
                        } else {
                          for (const conn of connections) {
                            if (conn.open) {
                              // send only the data and set type to a specific name for validation
                              conn.send({ type: "MAJORITY_NO" });
                              console.log("voted no");
                            } else {
                              console.log("connection not open");
                            }
                          };
                          // reset the voting variables
                          yesVotes = 0;
                          noVotes = 0;
                          return;
                        }
                      }
                      break;
                    // Add more cases as needed
                  }
                  return;
                } else if (isRequestMessage(data)) {
                  const { id, type } = data
    
                  if (type === 'request') {
                    const arrayBuffer = await readFile(`page_${id}.mhtml`);
                    connection.send({ type: 'mhtml_file', mhtmlFile: arrayBuffer, id })
                    console.log('file sent')
                  }
                } else if (isMhtmlMessage(data)) {
                  const { mhtmlFile, type, id } = data
                  
                  if (type === 'mhtml_file') {
                    console.log('received file')
                    // Convert Uint8Array to ArrayBuffer if necessary
                    const arrayBuffer = mhtmlFile instanceof Uint8Array ? mhtmlFile.buffer : mhtmlFile;
                    await handleFileData(`page_${id}.mhtml`, arrayBuffer)
                    console.log('converted and downloaded file')
                  }
                } else if (isMetadata(data)) {
                  // Restore the data before processing
                  const restoredData = restoreData(data);
                  
                  // Process the restored data
                  console.log("Restored data:", restoredData);
                  useStore.getState().addBlock(restoredData);
                } else {
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
                useStore.getState().updateChain(payload);
              }
            } else if (isBlockchainSuggestion(data)) {
              const { type, suggestedBlock } = data;

              if (type === "SUGGEST_BLOCK") {
                // temp blockchain to check before updating the real one with a new block

                //const tempChain: Blockchain = useStore.getState().blockchain;

                // made a clone so as to not refence the same object un useStore
                const tempChain: Blockchain = _.cloneDeep(useStore.getState().blockchain);
                
                console.log("Before adding block (stringified so no object methods):", JSON.parse(JSON.stringify(tempChain)));

                // temp block containing proposed metadata
                const tempBlock = new Block(tempChain!.chain.length, Date.now(), suggestedBlock);
                await tempChain!.addBlock(tempBlock);
                console.log("added new block tempChain", tempChain);
                console.log("latest block", tempChain.getLatestBlock());
                if (await tempChain.isChainValid() == true) {
                  // add more checks
                  console.log("chain has correct hash, shit worked");
                  
                  // send response to server
                  
                  sendVoteYes(suggestedBlock);
                  
                  //socket.emit("VOTE_BLOCK_YES", tempChain); //perhaps send along the id(connection array filter id)
                  return
                } else {
                  console.error("Blockchain addition rejected due to hash missmatch");
                  //socket.emit("VOTE_BLOCK_NO", tempChain);
                  sendVoteNo();
                  // send response to server io.emit("VOTE_BLOCK_NO")
                }
              }
            } else if (isVote(data)) {
              const { type, newChain } = data;
              console.log("isVote on datad");
              switch (type) {
                case "VOTE_BLOCK_YES":
                  console.log("Received vote in the possitive:", data.type);
                  yesVotes = yesVotes + 1;
                  console.log("yesVotes:", yesVotes);
                  if (yesVotes >= connectedPeers.length) {
                    send(newChain);
                   /*
                    for (const conn of connections) {
                        if (conn.open) {
                            // send only the data and set type to a specific name for validation 
                            conn.send({ type: "NEW_BLOCKCHAIN", payload: newChain });
                            console.log("voted yes", newChain);
                        } else {
                            console.log("connection not open");
                        }
                    }
                    */
                    // socket.emit("YES_VOTE", newChain);
                    // reset the voting variables
                    yesVotes = 0;
                    noVotes = 0;
                    return;
                    // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
                    // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
                  }
                  if (yesVotes + noVotes >= connectedPeers.length) {
                    if (yesVotes >= noVotes) {
                      send(newChain);
                      // reset the voting variables
                      yesVotes = 0;
                      noVotes = 0;
                      return;
                    } else {
                      for (const conn of connections) {
                        if (conn.open) {
                          // send only the data and set type to a specific name for validation
                          conn.send({ type: "MAJORITY_NO"});
                          console.log("voted no");
                        } else {
                          console.log("connection not open");
                        }
                      };
                      // reset the voting variables
                      yesVotes = 0;
                      noVotes = 0;
                      return;
                    }
                  } 
                  break;
                case "VOTE_BLOCK_NO":
                  console.log("Received vote in the negative:", data.type);
                  noVotes = noVotes + 1;
                  if (noVotes > (connectedPeers.length / 2)) {
                    for (const conn of connections) {
                      if (conn.open) {
                        // send only the data and set type to a specific name for validation
                        conn.send({ type: "MAJORITY_NO" });
                        console.log("voted no");
                      } else {
                        console.log("connection not open");
                      }
                    };
                    // reset the voting variables
                    yesVotes = 0;
                    noVotes = 0;
                    return;
                    // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
                    // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
                  }
                  if (yesVotes + noVotes >= connectedPeers.length) {
                    if (yesVotes >= noVotes) {
                      send(newChain);
                      // reset the voting variables
                      yesVotes = 0;
                      noVotes = 0;
                      return;
                    } else {
                      for (const conn of connections) {
                        if (conn.open) {
                          // send only the data and set type to a specific name for validation
                          conn.send({ type: "MAJORITY_NO" });
                          console.log("voted no");
                        } else {
                          console.log("connection not open");
                        }
                      };
                      // reset the voting variables
                      yesVotes = 0;
                      noVotes = 0;
                      return;
                    }
                  }
                  break;
                // Add more cases as needed
              } return;
            } else if (data === 'request_blockchain') {
              conn.send({ type: 'NEW_BLOCKCHAIN', payload: useStore.getState().blockchain.chain })
            } else if (isRequestMessage(data)) {
              const { id, type } = data

              if (type === 'request') {
                const arrayBuffer = await readFile(`page_${id}.mhtml`);
                conn.send({ type: 'mhtml_file', mhtmlFile: arrayBuffer, id })
                console.log('file sent')
              }
            } else if (isMhtmlMessage(data)) {
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
            } else if (isMetadata(data)) {
              // Restore the data before processing
              const restoredData = restoreData(data);
              
              // Process the restored data
              console.log("Restored data:", restoredData);
              useStore.getState().addBlock(restoredData);
            } else {
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
    useStore.getState().updateChain(data);
  })

  socket.on('YES_VOTE', (data) => {
    const tempChain: Blockchain = data;
    console.log("Voting concluded, block added to chain");
    useStore.getState().updateChain(tempChain.chain);
  })

  socket.on('NO_VOTE', () => {
    console.log("Voting concluded, suggested block was rejected");
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
    screenshotBuffer = data.screenshotBuffer;
  } else {
    const values = Object.values(data.screenshotBuffer);
    screenshotBuffer = new Uint8Array(values as number[]);
  }

  let decompressedMhtml: string;
  if (data.mhtmlContent instanceof Uint8Array) {
    decompressedMhtml = pako.inflate(data.mhtmlContent, { to: "string" });
  } else {
    decompressedMhtml = data.mhtmlContent;
  }

  return {
    ...data,
    screenshotBuffer,
    mhtmlContent: decompressedMhtml,
  };
}

export function send(data: Metadata) {
  const values = Object.values(data.screenshotBuffer);
  const uint8Array = new Uint8Array(values);
  const compressedMhtml = pako.deflate(data.mhtmlContent);

  const processedData: Metadata = {
    ...data,
    screenshotBuffer: uint8Array,
    mhtmlContent: compressedMhtml,
  };

  useStore
    .getState()
    .addBlock(processedData)
    .then(() => {
      const blockchain = useStore.getState().blockchain.chain;

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

export function sendVoteYes(data: Metadata) {
    console.log("Sending vote to connections:", connections);
    const newChain = data;
    for (const conn of connections) {
        if (conn.open) {
            conn.send({ type: "VOTE_BLOCK_YES", newChain });
            console.log("Voted yes", newChain);
        } else {
            console.log("connection not open");
        }
    }
}
export function sendVoteNo() {
    console.log("Sending vote to connections:", connections);

    for (const conn of connections) {
        if (conn.open) {
            conn.send({ type: "VOTE_BLOCK_NO"});
            console.log("Voted no");
        } else {
            console.log("connection not open");
        }
    }
}
export async function suggestBlock(data: Metadata) {
    console.log("Sending data to connections:", connections);
    const suggestedBlock = data;
    
    const tempChain: Blockchain = _.cloneDeep(useStore.getState().blockchain);

    console.log("Before adding block (stringified so no object methods):", JSON.parse(JSON.stringify(tempChain)));

    const tempBlock = new Block(tempChain!.chain.length, Date.now(), suggestedBlock);
    await tempChain!.addBlock(tempBlock);
    console.log("added new block tempChain", tempChain);
    if (await tempChain.isChainValid() == true) {
        console.log("chain has correct hash, shit worked");
        socket.emit("VOTE_BLOCK_YES", tempChain);
    } else {
        console.error("Blockchain addition rejected due to hash missmatch")
        socket.emit("VOTE_BLOCK_NO", tempChain)
    }
        for (const conn of connections) {
            if (conn.open) {
                conn.send({ type: "SUGGEST_BLOCK", suggestedBlock });
                console.log("sent block for validation", suggestedBlock);
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

interface Vote {
    type: string;
    newChain: Metadata;
};

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

function isVote(data: unknown): data is Vote {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        "newChain" in data
    );
}