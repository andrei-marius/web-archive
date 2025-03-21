import React, { useState, useEffect } from "react";
import { init, send, sendRequest, suggestBlock } from "./network";
import useStore from "./store";

const App: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const blockchain = useStore((state) => state.blockchain.chain);
  const folderHandle = useStore((state) => state.folderHandle);
  const setFolderHandle = useStore((state) => state.setFolderHandle);

  useEffect(() => {
    init();
  }, []);

  const requestFolderAccess = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setFolderHandle(handle);
      console.log("Folder access granted:", handle);
    } catch (err) {
      console.error("User denied folder access or an error occurred:", err);
    }
  };

  const listFiles = async () => {
    if (!folderHandle) {
      console.error("No folder access granted");
      return;
    }

    const files = [];
    for await (const entry of folderHandle.values()) {
      if (entry.kind === "file") {
        files.push(entry.name);
      }
    }
    console.log("Files in directory:", files);
    return files;
  };

  const sendData = async () => {
    console.log(url);
    if (url.trim()) {
      try {
        const response = await fetch("http://localhost:3000/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (data.success) {
          console.log(data);
           // send(data.metadata);
          suggestBlock(data.metadata)
          setUrl("");
        } else {
          console.error("Error scraping page:", data.error);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <div className="App">
      <input
        onChange={(e) => setUrl(e.target.value)}
        value={url}
        type="text"
        placeholder="URL"
      />
      <button onClick={sendData}>UPLOAD</button>

      <button onClick={requestFolderAccess}>SELECT FOLDER</button>

      <button onClick={listFiles}>LIST FILES</button>

      <div>
        {blockchain.map((block, index) => (
          <div key={index}>
            <div>Block {index}</div>
            <div>Timestamp: {block.timestamp}</div>
            <div>PreviousHash: {block.previousHash}</div>
            <div>Hash: {block.hash}</div>
            <div>Data:</div>
            {typeof block.data !== "string" ? (
              <div>
                <div style={{ wordBreak: "break-all" }}>URL: {block.data.url}</div>
                <div style={{ wordBreak: "break-all" }}>Title: {block.data.title}</div>
                <div>Desc: {block.data.description}</div>
                <div>Timestamp: {block.data.timestamp}</div>
                <div>SS: {block.data.screenshot}</div>
                <div>MHTML file: {block.data.mhtmlFile}</div>
                <div>Keywords: {block.data.keywords}</div>
                <button onClick={sendRequest}>download mhtml file</button>
              </div>
            ) : (
              <div>{block.data}</div>
            )}
            <br></br>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;