import React, { useEffect } from "react";
import useStore from "./lib/store";
import { NavBar } from "./components/NavBar";
import { Tabs } from "./components/Tabs";
import "./lib/network";

const App: React.FC = () => {
    useEffect(() => {
        const blockchain = useStore.getState().blockchain;
        if (blockchain.chain.length === 0) {
            console.log("Initializing blockchain with genesis block.");
        }
    }, []);
  return (
    <div className="App">
      <NavBar />
      <main className="w-full flex items-center flex-col">
        <Tabs />
      </main>
    </div>
  );
};

export default App;
