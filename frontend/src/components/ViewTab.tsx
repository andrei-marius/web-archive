import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import BlockCard from "./BlockCard";
import useStore from "../lib/store";

const ViewTab: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const blockchain = useStore((state) => state.blockchain.chain);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-[300px] mb-8">
        <Input type="text" placeholder="Search" className="pl-12" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6 absolute left-3 top-1/2 transform -translate-y-1/2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>

      {blockchain.length < 2 && <div className="text-center">No data</div>}

      {blockchain.map((block, index) => {
        if (index === 0) return null;

        return (
          <BlockCard
            key={index}
            block={block}
            index={index}
            expanded={expandedIndex === index}
            onToggleExpand={() =>
              setExpandedIndex(expandedIndex === index ? null : index)
            }
          />
        );
      })}
    </div>
  );
};

export default ViewTab;
