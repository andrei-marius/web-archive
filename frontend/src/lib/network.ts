import Peer, { DataConnection } from "peerjs";
import { Block, Blockchain } from "./blockchain";
import useStore from "./store";
import { Metadata, Message, PBFTLogEntry,} from "./types/types";
// import pako from "pako";
import _ from "lodash";
import {
  // isMetadata,
  isMhtmlFile,
  isDownloadRequest,
  isBlockchainSuggestion,
    isBlockchainMessage,
    isPrePrepareMessage,
    isPrepareMessage,
    isCommitMessage,
    isMetadata,
    
} from "./safeguards";
import {
    handleMetadata,
    blockRequested,
    handlePrePrepare,
    handlePrepare,
    handleCommit,
} from "./utils";

(() => {
    const store = useStore.getState();
    if (store.blockchain.chain.length === 0) {
        const chain = new Blockchain();
        store.updateChain(chain.chain);
        //console.log("Genesis block created and chain updated:", chain.chain);
        //console.log("blockchain in state: ", useStore.getState().blockchain.chain)
    }
  let peer: Peer;
  let connectedPeers: string[] = [];
  

  const { socket, connections } = useStore.getState();

  if (socket) {
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
                //connection.send("request_blockchain");
  
                connection.on("data", async function (data: unknown) {
                  console.log("Received data:", data);

                    //handleIncomingData(
                    handleMessage(
                    data,
                    connection,
                    connections,
                    connectedPeers
                  );
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
  
              //handleIncomingData(
                handleMessage(
                data,
                conn,
                connections,
                connectedPeers
              );
            });
          });
        });
      }
    });
  
    socket.on("connectedPeers", (data) => {
      connectedPeers = data.filter((id: string) => id !== socket.id);
      console.log(connectedPeers);
    });
  
    //socket.on("init_blockchain", (data) => {
    //    console.log("Received blockchain from server:", data);
    //    useStore.getState().updateChain(data);
    //});
  
    //socket.on("YES_VOTE", (data) => {
    //  const tempChain: Blockchain = data;
    //  console.log("Voting concluded, block added to chain");
    //  useStore.getState().updateChain(tempChain.chain);
    //});
  
    //socket.on("NO_VOTE", () => {
    //  console.log("Voting concluded, suggested block was rejected");
    //});
  }
})();
async function handleMessage(
    data: unknown,
    connection: DataConnection,
    connections: DataConnection[],
    connectedPeers: string[]
) {
    if (typeof data === "object" && data !== null && "type" in data) {
        const message = data as Message;

        switch (message.type) {
            case "BLOCK-REQUEST":
                if (isBlockchainSuggestion(message)) {

                    const { suggestedBlock }  = message;
                    
                    blockRequested(suggestedBlock);
                }
                break;
            case "PRE-PREPARE":
                await wait(2000);
                if (isPrePrepareMessage(message)) {

                    const msg = {
                        suggestedBlock: message.suggestedBlock,
                        sequence: message.sequence,
                        view: message.view
                    } = message;
                    
                    handlePrePrepare(msg);
                }
                break;
            case "PREPARE":
                await wait(2000);
                if (isPrepareMessage(message)) {
                    console.log("received prepare");
                    const msg = {
                        sequence: message.sequence,
                        view: message.view,
                        blockHash: message.blockHash
                    } = message;
                    const entry: Partial<PBFTLogEntry> = {
                        // ideal solution has unique ID of the sender, to verify legitimacy and single vote per node
                        blockHash: message.blockHash,
                        prepares: ["prepared"],
                    }
                    // ensures that two thirds majority has sent prepare
                    useStore.getState().appendToLog(message.sequence, entry);
                    const updatedPBFT = useStore.getState().PBFT;

                    const quorum = Math.floor((2 * connectedPeers.length) / 3);
                    console.log("quorum: ", quorum)
                    console.log("log: ", updatedPBFT.log[message.sequence].prepares);
                    console.log("length: ", updatedPBFT.log[message.sequence].prepares.length);
                    if (updatedPBFT.log[message.sequence].prepares.length >= quorum) {

                        console.log("2f prepared");
                        handlePrepare(msg);

                    } else { 
                        console.log("not majority");
                    }
                    
                }
                break;
            case "COMMIT":
                await wait(300);
                if (isCommitMessage(message)) {
                    console.log("received commit");
                    const msg = {
                        sequence: message.sequence,
                        view: message.view,
                        blockHash: message.blockHash
                    } = message;

                    const entry: Partial<PBFTLogEntry> = {
                        blockHash: message.blockHash,
                        commits: ["committed"],
                    }
                    // ensures that two thirds majority has sent prepare
                    useStore.getState().appendToLog(message.sequence, entry);
                    const updatedPBFT = useStore.getState().PBFT;
                    
                    /*updatedPBFT.log[message.sequence].commits.push("committed");*/
                    const quorum = Math.floor((2 * connectedPeers.length) / 3);
                    console.log("log: ", updatedPBFT.log[message.sequence].commits);
                    console.log("length: ", updatedPBFT.log[message.sequence].commits.length);
                    if (updatedPBFT.log[message.sequence].commits.length >= quorum) {

                        console.log("2f committed");
                        handleCommit(msg);

                    } else {
                        console.log("not majority");
                    }
                    
                }
                break;
            case "request":
                if (isDownloadRequest(data)) {
                    const { id } = data;

                        const arrayBuffer = await readFileFromOPFS(`page_${id}.mhtml`);
                        connection.send({ type: "mhtml_file", mhtmlFile: arrayBuffer, id });
                        console.log("file sent");
                }
                break;
            case "mhtml_file":
                if (isMhtmlFile(data)) {
                    const { mhtmlFile, id } = data;

                        console.log("received file");
                        // Convert Uint8Array to ArrayBuffer if necessary
                        const arrayBuffer = mhtmlFile instanceof Uint8Array ? mhtmlFile.buffer : mhtmlFile;
                        await handleFileData(`page_${id}.mhtml`, arrayBuffer);
                        console.log("converted and downloaded file");
                    
                }
                break;

        }
    }
}

// async function handleIncomingData(
//  data: unknown,
//  connection: DataConnection,
//  connections: DataConnection[],
//  connectedPeers: string[]
//) {
//  if (isBlockchainMessage(data)) {
//    const { type, payload } = data;

//    if (type === "NEW_BLOCKCHAIN") {
//        useStore.getState().updateChain(payload);
//        console.log("blockchain updated", useStore.getState().blockchain);
//    }
//  }

//  if (isBlockchainSuggestion(data)) {
//    console.log("got suggestion");
//    const { type, suggestedBlock } = data;

//    if (type === "SUGGEST_BLOCK") {
//      // temp blockchain to check before updating the real one with a new block

//      //const tempChain: Blockchain = useStore.getState().blockchain;

//      // made a clone so as to not refence the same object un useStore
//        const tempChain: Blockchain = _.cloneDeep(useStore.getState().blockchain);
//      console.log(
//        "Before adding block (stringified so no object methods)::",
//        JSON.parse(JSON.stringify(tempChain))
//      );

//      // temp block containing proposed metadata
//      const tempBlock = new Block(
//        tempChain!.chain.length,
//        Date.now(),
//        suggestedBlock
//      );

//      await tempChain!.addBlock(tempBlock);
//      console.log("added new block tempChain", tempChain);
//      // console.log("latest block", tempChain.getLatestBlock());
//      if ((await tempChain.isChainValid()) == true) {
//        // add more checks
//        console.log("chain has correct hash, shit worked");

//        // send response to server

//        sendVoteYes(suggestedBlock);
//        // socket.emit("VOTE_BLOCK_YES", tempChain); //perhaps send along the id(connection array filter id)
//        return;
//      } else {
//       console.error("Blockchain addition rejected due to hash missmatch");
//        sendVoteNo();
//        //socket.emit("VOTE_BLOCK_NO", tempChain);
//        // send response to server io.emit("VOTE_BLOCK_NO")
//      }
//    }
//  }

//  if (isVote(data)) {
//    const { type, newChain } = data;
//    console.log("isVote on open");
//    switch (type) {
//      case "VOTE_BLOCK_YES":
//        console.log("Received vote in the possitive:", data.type);
//        yesVotes++;
//        console.log("yesVotes:", yesVotes);
//            if (yesVotes >= connectedPeers.length) {
//                console.log("updating blockchain");
//                useStore.getState().addBlock(newChain);
//          // handleMetadata(newChain);
//          /*
//          for (const conn of connections) {
//              if (conn.open) {
//                  // send only the data and set type to a specific name for validation 
//                  conn.send({ type: "NEW_BLOCKCHAIN", payload: newChain });
//                  console.log("voted yes", newChain);
//              } else {
//                  console.log("connection not open");
//              }
//          }
//          */
//          // socket.emit("YES_VOTE", newChain);
//          // reset the voting variables
//          yesVotes = 0;
//          noVotes = 0;
//          return;
//          // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
//          // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
//        }
//        if (yesVotes + noVotes >= connectedPeers.length) {
//            if (yesVotes >= noVotes) {
//                console.log("updating blockchain");
//                useStore.getState().addBlock(newChain);
//            //handleMetadata(newChain);
//            // reset the voting variables
//            yesVotes = 0;
//            noVotes = 0;
//            return;
//          } else {
//            for (const conn of connections) {
//              if (conn.open) {
//                // send only the data and set type to a specific name for validation
//                conn.send({ type: "MAJORITY_NO" });
//                console.log("voted no");
//              } else {
//                console.log("connection not open");
//              }
//            }
//            // reset the voting variables
//            yesVotes = 0;
//            noVotes = 0;
//            return;
//          }
//        }
//        break;
//      case "VOTE_BLOCK_NO":
//        console.log("Received vote in the negative:", data.type);
//        noVotes++;
//        if (noVotes > connectedPeers.length / 2) {
//          for (const conn of connections) {
//            if (conn.open) {
//              // send only the data and set type to a specific name for validation
//              conn.send({ type: "MAJORITY_NO" });
//              console.log("voted no");
//            } else {
//              console.log("connection not open");
//            }
//          }
//          // reset the voting variables
//          yesVotes = 0;
//          noVotes = 0;
//          return;
//          // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
//          // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
//        }
//        if (yesVotes + noVotes >= connectedPeers.length) {
//            if (yesVotes >= noVotes) {
//                console.log("updating blockchain");
//                useStore.getState().addBlock(newChain);
//            //handleMetadata(newChain);
//            // reset the voting variables
//            yesVotes = 0;
//            noVotes = 0;
//            return;
//          } else {
//            for (const conn of connections) {
//              if (conn.open) {
//                // send only the data and set type to a specific name for validation
//                conn.send({ type: "MAJORITY_NO" });
//                console.log("voted no");
//              } else {
//                console.log("connection not open");
//              }
//            }
//            // reset the voting variables
//            yesVotes = 0;
//            noVotes = 0;
//            return;
//          }
//        }
//        break;
//      // Add more cases as needed
//    }
//    return;
//  }

//  //  if (data === "request_blockchain") {
//  //      console.log("request from: ",connection)
//  //      const payload = useStore.getState().blockchain.chain
//  //      console.log("blockchain request is being handled")
//  //  connection.send({
//  //    type: "NEW_BLOCKCHAIN",
//  //    payload: payload,
//  //  });
//  //}

//  if (isDownloadRequest(data)) {
//    const { id, type } = data;

//    if (type === "request") {
//      const arrayBuffer = await readFileFromOPFS(`page_${id}.mhtml`);
//      connection.send({ type: "mhtml_file", mhtmlFile: arrayBuffer, id });
//      console.log("file sent");
//    }
//  }

//  if (isMhtmlFile(data)) {
//    const { mhtmlFile, type, id } = data;

//    if (type === "mhtml_file") {
//      console.log("received file");
//      // Convert Uint8Array to ArrayBuffer if necessary
//      const arrayBuffer = mhtmlFile instanceof Uint8Array ? mhtmlFile.buffer : mhtmlFile;
//      await handleFileData(`page_${id}.mhtml`, arrayBuffer);
//      console.log("converted and downloaded file");
//    }
//  }

//  // if (isMetadata(data)) {
//    // TODO: function restoreData has to be updated
//    // Restore the data before processing
//    // const restoredData = restoreData(data);

//    // Process the restored data
//    // console.log("Restored data:", restoredData);
//    // useStore.getState().addBlock(restoredData);
//  // }

//  // else {
//  //   console.error("Received invalid data format:", data);
//  // }
//} // here

const handleFileData = async (
  filename: string,
  fileData: ArrayBuffer
): Promise<void> => {
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

      console.log(
        `Verified save of "${filename}" to OPFS (${fileData.byteLength} bytes)`
      );
      return true;
    } catch (error) {
      console.error("OPFS save error:", error);
      return false;
    }
  };

  // for saving a single file locally
  const saveLocally = async (): Promise<boolean> => {
    try {
      const blob = new Blob([fileData], { type: "multipart/related" });

      if ("showSaveFilePicker" in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: "Web Page Archive",
                accept: { "multipart/related": [".mhtml"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log(`Saved "${filename}" locally`);
          return true;
        } catch (error) {
          console.warn("File System Access API failed:", error);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
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
      console.error("Local save failed:", error);
      return false;
    }
  };

  const [opfsResult, localResult] = await Promise.allSettled([
    saveToOpfs(),
    saveLocally(),
  ]);

  if (opfsResult.status === "rejected" || localResult.status === "rejected") {
    console.error("File save completed with errors");
  }
};

const readFileFromOPFS = async (filename: string): Promise<ArrayBuffer | undefined> => {
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

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// TODO: has to be updated
// function restoreData(data: Metadata): Metadata {
//   let screenshotBuffer: Uint8Array | Buffer;

//   if (
//     data.screenshotBuffer instanceof Uint8Array ||
//     Buffer.isBuffer(data.screenshotBuffer)
//   ) {
//     screenshotBuffer = data.screenshotBuffer;
//   } else {
//     const values = Object.values(data.screenshotBuffer);
//     screenshotBuffer = new Uint8Array(values as number[]);
//   }

//   let decompressedMhtml: string;
//   if (data.mhtmlContent instanceof Uint8Array) {
//     decompressedMhtml = pako.inflate(data.mhtmlContent, { to: "string" });
//   } else {
//     decompressedMhtml = data.mhtmlContent;
//   }

//   return {
//     ...data,
//     screenshotBuffer,
//     mhtmlContent: decompressedMhtml,
//   };
// }

//function sendVoteNo() {
//  const connections = useStore.getState().connections;

//  console.log("Sending vote to connections:", connections);

//  for (const conn of connections) {
//    if (conn.open) {
//      conn.send({ type: "VOTE_BLOCK_NO" });
//      console.log("Voted no");
//    } else {
//      console.log("connection not open");
//    }
//  }
//}
