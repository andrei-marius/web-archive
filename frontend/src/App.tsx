import React, { useState, useEffect } from "react";
import { init, send } from "./network";
import useStore from "./store";

const App: React.FC = () => {
  const [data, setData] = useState<string>("");
  const blockchain = useStore((state) => state.blockchain.chain);

  useEffect(() => {
    init();
  }, []);

  const sendData = () => {
    if (data.trim()) {
      send(data);
      setData("");
    }
  };

  return (
    <div className="App">
      <input
        onChange={(e) => setData(e.target.value)}
        value={data}
        type="text"
        placeholder="data"
      />
      <button onClick={sendData}>UPLOAD</button>
      <div>
        {blockchain.map((block, index) => (
          <div key={index}>
            <div>
              Block {index}: {block.data}
            </div>
            <div>Timestamp: {block.timestamp}</div>
            <div>PreviousHash: {block.previousHash}</div>
            <div>Hash: {block.hash}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
