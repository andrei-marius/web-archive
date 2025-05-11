import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    Metadata,
    OPFSFile,
    Message,
    PrepareMessage,
    PrePrepareMessage,
    CommitMessage,
} from "@/lib/types/types";
import JSZip from "jszip";
import useStore from "./store";
import pako from "pako";
import { Block, Blockchain } from "./blockchain";
import _ from "lodash";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function suggestBlock(data: Metadata) {
  const { socket, connections } = useStore.getState();

  console.log("Sending data to connections:", connections);
  const suggestedBlock = data;

  const tempChain: Blockchain = _.cloneDeep(useStore.getState().blockchain);

  console.log(
    "Before adding block (stringified so no object methods):",
    JSON.parse(JSON.stringify(tempChain))
  );

  const tempBlock = new Block(
    tempChain!.chain.length,
    /*Date.now(),*/
    suggestedBlock
  );
  await tempChain!.addBlock(tempBlock);
  console.log("added new block tempChain", tempChain);
    if ((await tempChain.isChainValid()) == true) {
        const newChain = data;
        sendVoteYes(newChain);
    console.log("chain has correct hash, shit worked");
      // socket.emit("VOTE_BLOCK_YES", tempChain);
      for (const conn of connections) {
    if (conn.open) {
        conn.send({ type: "SUGGEST_BLOCK", suggestedBlock });
      console.log("sent block for validation", suggestedBlock);
    } else {
      console.log("connection not open");
    }
        } 
    } else {
        
    console.error("Blockchain addition rejected due to hash missmatch");
    // socket.emit("VOTE_BLOCK_NO", tempChain);
  }
  
}

export function sendVoteYes(data: Metadata) {
    const connections = useStore.getState().connections;

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
function dataURLToUint8Array(dataURL: any) {
  const base64String = dataURL.split(',')[1];

  const binaryString = atob(base64String);

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}


export function handleMetadata(data: Metadata) {
  const uint8Array = dataURLToUint8Array(data.screenshot);
  const compressedMhtml = pako.deflate(data.mhtml);

  const processedData: Metadata = {
    ...data,
    screenshot: uint8Array,
    mhtml: compressedMhtml,
  };

  const connections = useStore.getState().connections;

  useStore
    .getState()
    .addBlock(processedData)
    .then(() => {
      const blockchain = useStore.getState().blockchain.chain;
      
      for (const conn of connections) {
          if (conn.open) {
              console.log("trying to send blockchain to: ", conn);
          conn.send({ type: "NEW_BLOCKCHAIN", payload: blockchain});
          console.log("sent blockchain");
        } else {
          console.log("connection not open");
        }
      }
    });
}

export function sendDownloadRequest(id: string) {
  const connections = useStore.getState().connections;

  for (const conn of connections) {
    if (conn.open) {
      conn.send({ type: "request", id });
      console.log("request sent");
    } else {
      console.log("connection not open");
    }
  }
}

// for saving multiple files locally
export async function saveFiles(preview: Metadata): Promise<void> {
  try {
    const screenshotArray = dataURLToUint8Array(preview.screenshot);
    const metadataJson = JSON.stringify(preview, null, 2);
    const files = [
      {
        name: `screenshot_${preview.id}.png`,
        data: screenshotArray,
        type: "image/png",
      },
      {
        name: `page_${preview.id}.mhtml`,
        data: preview.mhtml,
        type: "message/rfc822",
      },
      {
        name: `metadata_${preview.id}.json`,
        data: metadataJson,
        type: "application/json",
      },
    ];

    await Promise.all([saveToOpfs(files), saveToUserFolder(files, preview.id)]);
  } catch (error) {
    console.error("Error saving files:", error);
    throw error;
  }
}

async function saveToOpfs(
  files: Array<{ name: string; data: any; type: string }>
): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();

    for (const file of files) {
      const fileHandle = await root.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.data);
      await writable.close();
    }
    console.log("Files saved to OPFS root successfully!");
  } catch (error) {
    console.error("Error saving to OPFS:", error);
  }
}

// for saving multiple files locally
async function saveToUserFolder(
  files: Array<{ name: string; data: any; type: string }>,
  id: string
): Promise<boolean> {
  try {
    if ("showDirectoryPicker" in window) {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });

      for (const file of files) {
        const fileHandle = await dirHandle.getFileHandle(file.name, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(file.data);
        await writable.close();
      }
      console.log("Files saved to user-selected folder!");
      return true;
    }

    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.name, new Blob([file.data], { type: file.type }));
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preview_${id}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    console.log("Files zipped and downloaded!");
    return true;
  } catch (error) {
    console.error("Error saving to user folder:", error);

    files.forEach((file) => {
      const blob = new Blob([file.data], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    });
    console.log("Files downloaded individually!");
    return false;
  }
}

export async function requestBlock(data: Metadata) {
    const { connections, /*PBFT*/ } = useStore.getState();

    // updated in blockRequested, and again in handlePrePrepare. So regardless if local peer is primary or not, the primary propogates the sequence increment
    //const state = {
    //    view: PBFT.view,
    //    sequence: ++PBFT.sequence
    //}
    //useStore.getState().updatePBFT(state);

    const updatedPBFT = useStore.getState().PBFT;


    const suggestedBlock = data;
    const msg = {
        type: "BLOCK-REQUEST",
        suggestedBlock: suggestedBlock
    }

    const log = {
        suggestedBlock: data,
    }

    useStore.getState().appendToLog(updatedPBFT.sequence, log);

    const originalChain = useStore.getState().blockchain;
    const tempChain = new Blockchain(JSON.parse(JSON.stringify(originalChain.chain)));


    console.log(
        "Before adding block (stringified so no object methods):",
        JSON.parse(JSON.stringify(tempChain))
    );

    const tempBlock = new Block(
        tempChain!.chain.length,
        suggestedBlock
    );
    // consider removing the test here
    await tempChain!.addBlock(tempBlock);
    console.log("added new block tempChain", tempChain);
    if ((await tempChain.isChainValid()) == true) {

        const primary = calculatePrimary(updatedPBFT.view)
        useStore.getState().updatePBFT({ primaryId: primary });
        // const primary = useStore.getState().PBFT.primaryId;
        const primaryPeer = connections.find(conn => conn.peer === primary);

        // const randomPeer = connections[Math.floor(Math.random() * connections.length)];
        console.log("chain has correct hash Sending data to primary peer: ", primaryPeer?.peer);
        // use this to send: primaryId = peerList[view % peerList.length];
        const peerId = useStore.getState().peerId
        if (peerId === primary) {
            blockRequested(msg.suggestedBlock);
        } else if (primaryPeer?.open) {
                console.log("About to send msg:", JSON.stringify(msg, null, 2));
                primaryPeer.send(msg);
            } else {
            console.log("try again, primary peer closed");
            }
          
        
    } else {
        console.error("Blockchain addition rejected due to hash missmatch");

    }
    setViewTimeoutForSequence(updatedPBFT.sequence + 1, "Waiting for PRE-PREPARE");
}

export function sendToAll(msg: Message) {
    const { connections } = useStore.getState();
    for (const conn of connections) {
        if (conn.open) {
            conn.send(msg);
        }
    }
}

export async function blockRequested(data: Metadata) {
    const { peerId } = useStore.getState();
    const primary = calculatePrimary(useStore.getState().PBFT.view);
    useStore.getState().updatePBFT({ primaryId: primary });
    console.log("calculated primary: ", primary);
    console.log("local peerId: ", peerId);
    const { PBFT } = useStore.getState();
    // const peerId = useStore.getState().peerId;
    // check that the receipiant is the primary
    if (PBFT.primaryId !== peerId) return;
    //if (PBFTstate.log[sequence]) return;
    
    
    const state = {
        view: PBFT.view,
        sequence: ++PBFT.sequence
    }
    useStore.getState().updatePBFT(state);
    const updatedPBFT = useStore.getState().PBFT;
    const originalChain = useStore.getState().blockchain;
    const tempChain = new Blockchain(JSON.parse(JSON.stringify(originalChain.chain)));


    console.log(
        "Before adding block (stringified so no object methods):",
        JSON.parse(JSON.stringify(tempChain))
    );

    const tempBlock = new Block(
        tempChain!.chain.length,
        data
    );

    await tempChain!.addBlock(tempBlock);
    console.log("added new block tempChain", tempChain);
    if ((await tempChain.isChainValid()) == true) {
        console.log("chain has correct hash")
    } else {
        console.error("Blockchain addition rejected due to hash missmatch");
    }
    const chainBlock = tempChain.getLatestBlock();
    const blockHash = chainBlock.hash;
    //the papers log format (pre-prepare,v(view number),n(sequence number),d(message digest/hash))?p(Primary signed),m (request message)
    const msg = {
        type: 'PRE-PREPARE',
        suggestedBlock: data,
        blockHash: blockHash,
        view: updatedPBFT.view,
        sequence: updatedPBFT.sequence, 
    };

    const log = {
        suggestedBlock: data,
        blockHash: blockHash,
        prepares: ["prepared"],
        prePrepareMessage: {
            type: 'PRE-PREPARE' as const,
            suggestedBlock: data,
            blockHash: blockHash,
            view: updatedPBFT.view,
            sequence: updatedPBFT.sequence 
        }
    }

    useStore.getState().appendToLog(updatedPBFT.sequence, log);
    console.log("sending pre-prepare");
    sendToAll(msg);
}

export async function handlePrePrepare({ suggestedBlock, blockHash, sequence, view }: PrePrepareMessage) {
    const PBFT = useStore.getState().PBFT;
    setViewTimeoutForSequence(sequence, "Waiting for PREPARE quorum");
    if (PBFT.log[sequence]) {
        console.log("old sequence");
        return;
    }

        const state = {
            view: view,
            sequence: sequence
        }
        useStore.getState().updatePBFT(state);
        
        const log = {
            suggestedBlock: suggestedBlock,
            blockHash: blockHash,
            prepares: ["prepared"],
            prePrepareMessage: {
                type: 'PRE-PREPARE' as const,
                suggestedBlock: suggestedBlock,
                blockHash: blockHash,
                sequence: sequence,
                view: view
            }
        }

        useStore.getState().appendToLog(sequence, log);
        
        const prepareMsg = {
            type: 'PREPARE',
            sequence: sequence,
            view: view,
            blockHash: blockHash
        };
        console.log("sending prepare");
        sendToAll(prepareMsg);
}

const handledPrepares = new Set<number>();
function resetPrepare(sequence: number) {
    handledPrepares.delete(sequence);
}

export async function handlePrepare({ sequence, blockHash, view }: PrepareMessage) {
    console.log("sequence from prepare: ", sequence);
    setViewTimeoutForSequence(sequence, "Waiting for COMMIT quorum");
    const PBFT = useStore.getState().PBFT;
    console.log("sequence from state: ", PBFT.sequence);
    if (PBFT.sequence !== sequence) { 
        console.log("wrong sequence");
        return;
    }

    if (handledPrepares.has(sequence)) {
        console.log("handlePrepare already called for sequence", sequence);
        return;
    }
    handledPrepares.add(sequence);
    console.log("func handlePrepare, blockHash received: ", blockHash);
    
    console.log("func handlePrepare, sequence: ", sequence);
    
    

    const originalChain = useStore.getState().blockchain;
    const tempChain = new Blockchain(JSON.parse(JSON.stringify(originalChain.chain)));


    console.log(
        "Before adding block (stringified so no object methods):",
        JSON.parse(JSON.stringify(tempChain))
    );


    const tempBlock = new Block(
        tempChain!.chain.length,
        PBFT.log[sequence].suggestedBlock
    );

    await tempChain!.addBlock(tempBlock);
    if ((await tempChain.isChainValid()) == true) {
    const chainBlock = tempChain.getLatestBlock();
    const newblockHash = chainBlock.hash;

        if (!newblockHash || newblockHash !== blockHash) {
            console.log("block.hash does not match blockHash");
        return;
        }

        if (!PBFT.log[sequence].prePrepareMessage ||
            PBFT.log[sequence].prePrepareMessage.blockHash !== newblockHash ||
            PBFT.log[sequence].prePrepareMessage.suggestedBlock !== PBFT.log[sequence].suggestedBlock) {
            console.log("missing or incorrect prePrepare from this sequence");
        return;
        }

        const log = {
            prepares: ["committed"],
            block: chainBlock,
        }

        useStore.getState().appendToLog(sequence, log);
        const updatedPBFT = useStore.getState().PBFT;
        console.log("updated PBFT log: ", updatedPBFT.log[sequence].block)
        console.log("func handlePrepare, PBFT state log[sequence].block.hash: ", updatedPBFT.log[sequence].block.hash);
    const commitMsg = {
        type: 'COMMIT',
        sequence: sequence,
        view: view,
        blockHash: blockHash
    };

        console.log("2f prepared");
        sendToAll(commitMsg);
    } else {
        console.error("Blockchain addition rejected due to hash missmatch in handlePrepare");
    }


}

export function handleCommit({ sequence, blockHash, /*view*/ /*senderId*/ }: CommitMessage) {
    clearViewTimeoutForSequence(sequence);
    const PBFT  = useStore.getState().PBFT;
    console.log("func handleComnmit, sequence: ", sequence);
    console.log("func handleComnmit, PBFTsequence: ", PBFT.sequence);
    if (!PBFT.log[sequence].block.hash || PBFT.log[sequence].block.hash !== blockHash) return;
    if (PBFT.sequence !== sequence || !PBFT.log[sequence].prePrepareMessage ||
        PBFT.log[sequence].prePrepareMessage.blockHash !== blockHash ||
        PBFT.log[sequence].prePrepareMessage.suggestedBlock !== PBFT.log[sequence].suggestedBlock) {
        console.log("missing or incorrect prePrepare from this sequence");
        return;
    }
    resetPrepare(sequence);
        const suggestedBlock = PBFT.log[sequence].suggestedBlock
        useStore.getState().addBlock(suggestedBlock);

    useStore.getState().updatePBFT({
        view: useStore.getState().PBFT.view + 1,
        sequence: useStore.getState().PBFT.sequence + 1,
    });
    console.log("committed to local and updated sequence");
}

export function updateView(newView: number) {
    const peers = [useStore.getState().peerId!, ...useStore.getState().connections.map(c => c.peer)].sort();
    const newPrimary = peers[newView % peers.length];
    useStore.getState().updatePBFT({ view: newView, primaryId: newPrimary });
}


function triggerViewChange(sequence: number) {
    console.warn(`Triggering view change for sequence ${sequence}`);
    const PBFT = useStore.getState().PBFT;
    const localPeer = useStore.getState().peerId;

    // Clear any existing timeout for that sequence
    clearTimeout(PBFT.timeouts[sequence]);
    delete PBFT.timeouts[sequence];

    const blockchain = useStore.getState().blockchain;
    const latestBlock = blockchain.getLatestBlock();
    //const logEntry = PBFT.log[sequence];
    const viewChangeMessage = {
        type: "VIEW-CHANGE" as const,
        view: PBFT.view,
        sequence,
        peerId: localPeer,
        latestBlockHash: latestBlock.hash//logEntry?.blockHash ?? null,
    };

    sendToAll(viewChangeMessage);
}

export function calculatePrimary(view: number): string {
    const connections = useStore.getState().connections;
    const peerId = useStore.getState().peerId;
    const peers = [peerId, ...connections.map(conn => conn.peer)].sort(); // sorting to ensure deterministic order
    return peers[view % peers.length];
}

function setViewTimeoutForSequence(sequence: number, reason: string, delayMs = 30000) {
    const { PBFT, updatePBFT } = useStore.getState();

    // Clear existing timeout for this sequence if present
    const existing = PBFT.timeouts[sequence];
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
        console.warn(`[Timeout] ${reason}: triggering view change for sequence ${sequence}`);
        triggerViewChange(sequence);

        // Clean up
        const updatedTimeouts = { ...PBFT.timeouts };
        delete updatedTimeouts[sequence];
        updatePBFT({ timeouts: updatedTimeouts });
    }, delayMs);

    updatePBFT({
        timeouts: {
            ...PBFT.timeouts,
            [sequence]: timeout,
        },
    });
}

export function calcQuorum(n:number): number {
    const connections = useStore.getState().connections;

    const f = Math.floor((connections.length + 1) / 3);
    const quorum = 2 * f + n;
    return quorum;
}
function clearViewTimeoutForSequence(sequence: number) {
    const { PBFT, updatePBFT } = useStore.getState();
    const existing = PBFT.timeouts[sequence];

    if (existing) {
        clearTimeout(existing);
        const updatedTimeouts = { ...PBFT.timeouts };
        delete updatedTimeouts[sequence];
        updatePBFT({ timeouts: updatedTimeouts });
    }
}


    // send reply?




/** FOR TESTING
 * Recursively reads all files from OPFS, including subdirectories
 * @param directoryPath Starting directory path (empty for root)
 * @param readContents Whether to read file contents
 * @returns Promise with array of file objects
 */
// async function readAllFilesFromOPFS(
//   directoryPath: string = "",
//   readContents: boolean = true
// ): Promise<OPFSFile[]> {
//   const root = await navigator.storage.getDirectory();
//   const results: OPFSFile[] = [];

//   async function traverseDirectory(
//     currentDirHandle: FileSystemDirectoryHandle,
//     currentPath: string
//   ): Promise<void> {
//     for await (const [name, handle] of currentDirHandle.entries()) {
//       const fullPath = currentPath ? `${currentPath}/${name}` : name;

//       if (handle.kind === "file") {
//         const file = await (handle as FileSystemFileHandle).getFile();
//         const fileInfo: OPFSFile = {
//           path: fullPath,
//           name,
//           size: file.size,
//           type: file.type,
//           lastModified: file.lastModified,
//           content: null,
//         };

//         if (readContents) {
//           fileInfo.content = file.type.startsWith("text/")
//             ? await file.text()
//             : await file.arrayBuffer();
//         }

//         results.push(fileInfo);
//       } else if (handle.kind === "directory") {
//         await traverseDirectory(handle as FileSystemDirectoryHandle, fullPath);
//       }
//     }
//   }

//   const startingDir =
//     directoryPath === "" ? root : await root.getDirectoryHandle(directoryPath);

//   await traverseDirectory(startingDir, directoryPath);
//   return results;
// }

// export async function logAllFiles() {
//   try {
//     const files = await readAllFilesFromOPFS();
//     console.log("All files in OPFS:", files);

//     files.forEach((file) => {
//       if (typeof file.content === "string") {
//         console.log(`Text file ${file.path}: ${file.content.length} chars`);
//       } else if (file.content instanceof ArrayBuffer) {
//         console.log(
//           `Binary file ${file.path}: ${file.content.byteLength} bytes`
//         );
//       }
//     });
//   } catch (error) {
//     console.error("Error reading files:", error);
//   }
// }

// const requestFolderAccess = async () => {
//   try {
//     const handle = await window.showDirectoryPicker();
//     setFolderHandle(handle);
//     console.log("Folder access granted:", handle);
//     return handle;
//   } catch (err) {
//     console.error("User denied folder access or an error occurred:", err);
//     return null;
//   }
// };

// const listFiles = async () => {
//   if (!folderHandle) {
//     console.error("No folder access granted");
//     return;
//   }

//   const files = [];
//   for await (const entry of folderHandle.values()) {
//     if (entry.kind === "file") {
//       files.push(entry.name);
//     }
//   }
//   console.log("Files in directory:", files);
//   return files;
// };
