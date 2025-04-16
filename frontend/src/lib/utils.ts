import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Metadata, OPFSFile } from "@/lib/types";
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
    Date.now(),
    suggestedBlock
  );
  await tempChain!.addBlock(tempBlock);
  console.log("added new block tempChain", tempChain);
  if ((await tempChain.isChainValid()) == true) {
    console.log("chain has correct hash, shit worked");
    // socket.emit("VOTE_BLOCK_YES", tempChain);
  } else {
    console.error("Blockchain addition rejected due to hash missmatch");
    // socket.emit("VOTE_BLOCK_NO", tempChain);
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

export function handleMetadata(data: Metadata) {
  const values = Object.values(data.screenshotBuffer);
  const uint8Array = new Uint8Array(values);
  const compressedMhtml = pako.deflate(data.mhtmlContent);

  const processedData: Metadata = {
    ...data,
    screenshotBuffer: uint8Array,
    mhtmlContent: compressedMhtml,
  };

  const connections = useStore.getState().connections;

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
    const screenshotArray = new Uint8Array(
      Object.values(preview.screenshotBuffer)
    );
    const metadataJson = JSON.stringify(preview, null, 2);
    const files = [
      {
        name: `screenshot_${preview.id}.png`,
        data: screenshotArray,
        type: "image/png",
      },
      {
        name: `page_${preview.id}.mhtml`,
        data: preview.mhtmlContent,
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
