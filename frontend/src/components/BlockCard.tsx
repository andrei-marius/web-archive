import React from "react";
import { Card, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Block } from "@/lib/blockchain";
import { sendDownloadRequest } from "@/lib/utils";

type BlockCardProps = {
  block: Block;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
};

const BlockCard: React.FC<BlockCardProps> = ({
  block,
  index,
  expanded,
  onToggleExpand,
}) => {
  const handleDownloadMHTML = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    sendDownloadRequest(id);
  };

  if (typeof block.data === "string") {
    return <div>{block.data}</div>;
  }

  const { data } = block;

  return (
    <div className="w-full">
      <Card
        onClick={onToggleExpand}
        className={`bg-gray-100 hover:bg-gray-200 cursor-pointer mb-5 transition-all duration-300 overflow-hidden ${
          expanded ? "max-h-[1000px]" : "max-h-[150px]"
        }`}
      >
        <CardHeader>
          <CardDescription>
            <div style={{ wordBreak: "break-all" }}>
              <b>URL:</b> {data.url}
            </div>
            <div>
              <b>Timestamp:</b> {data.timestamp}
            </div>
            {expanded && (
              <>
                <div style={{ wordBreak: "break-all" }}>
                  <b>Title:</b> {data.title}
                </div>
                <div>
                  <b>Description:</b> {data.description}
                </div>
                <div>
                  <b>Keywords:</b> {data.keywords}
                </div>
                <div className="w-full mt-8 mb-10 overflow-hidden">
                  <img
                    className="w-full object-cover object-top"
                    src={URL.createObjectURL(
                      new Blob(
                        [new Uint8Array(Object.values(data.screenshot))],
                        { type: "image/png" }
                      )
                    )}
                    alt="Screenshot"
                  />
                </div>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  onClick={(e) => {
                    handleDownloadMHTML(e, data.id);
                  }}
                >
                  Download MHTML file
                </Button>
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default BlockCard;
