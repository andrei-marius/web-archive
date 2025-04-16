import React from "react";
import { NavBar } from "./components/NavBar";
import { Tabs } from "./components/Tabs";
import "./lib/network";

const App: React.FC = () => {
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
