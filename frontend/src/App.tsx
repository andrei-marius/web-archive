import React, { useState, useEffect } from "react";
import { init, send, sendRequest } from "./network";
import useStore from "./store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NavBar } from "./components/NavBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Metadata } from "./types";
import { v4 as uuidv4 } from "uuid";

const App: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const [preview, setPreview] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
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
      return handle;
    } catch (err) {
      console.error("User denied folder access or an error occurred:", err);
      return null;
    }
  };

  const save = async () => {
    if (preview) {
      try {
        const handle = await requestFolderAccess();
        if (handle) {
          // Convert the screenshotBuffer object to a Uint8Array
          const screenshotArray = new Uint8Array(
            Object.values(preview.screenshotBuffer)
          );

          // Create a Blob from the Uint8Array
          const screenshotBlob = new Blob([screenshotArray], {
            type: "image/png",
          });

          // Save the screenshot
          const screenshotFileHandle = await handle.getFileHandle(
            `screenshot_${preview.id}.png`,
            {
              create: true,
            }
          );
          const screenshotWritable =
            await screenshotFileHandle.createWritable();
          await screenshotWritable.write(screenshotBlob);
          await screenshotWritable.close();

          // Save the MHTML file
          const mhtmlFileHandle = await handle.getFileHandle(
            `page_${preview.id}.mhtml`,
            { create: true }
          );
          const mhtmlWritable = await mhtmlFileHandle.createWritable();
          await mhtmlWritable.write(preview.mhtmlContent);
          await mhtmlWritable.close();

          // Prepare the metadata object with file paths
          // const metadataWithPaths = {
          //   ...preview,
          //   screenshot: `${handle.name}/screenshot_${preview.id}.png`,
          //   mhtmlFile: `${handle.name}/page_${preview.id}.mhtml`,
          //   metadataFile: `${handle.name}/metadata_${preview.id}.json`,
          // };

          // // Update the preview with file paths
          // setPreview(metadataWithPaths);

          // Convert the metadata to a JSON string
          const metadataJson = JSON.stringify(preview, null, 2);

          // Save the metadata as a JSON file
          const metadataFileHandle = await handle.getFileHandle(
            `metadata_${preview.id}.json`,
            { create: true }
          );
          const metadataWritable = await metadataFileHandle.createWritable();
          await metadataWritable.write(metadataJson);
          await metadataWritable.close();

          console.log("Files saved successfully!");
          setUrl("");
        }
      } catch (error) {
        console.error("Error:", error);
      }
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

  async function generate() {
    if (url.trim()) {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:3000/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (data.success) {
          const { metadata } = data;

          const randomId = uuidv4();

          const metadataWithoutPaths = {
            id: randomId,
            ...metadata,
          };

          setPreview(metadataWithoutPaths);

          setUrl("");
        } else {
          console.error("Error scraping page:", data.error);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }
  }

  const handleDownloadMHTML = (event: React.MouseEvent, id: string) => {
    event.stopPropagation(); // Prevent the click event from propagating to the card
    sendRequest(id);
  };

  return (
    <div className="App">
      <NavBar />
      <main className="w-full flex items-center flex-col">
        <Tabs defaultValue="upload" className="w-[800px] items-center my-10">
          <TabsList className="mb-8">
            <TabsTrigger className="cursor-pointer" value="upload">
              Upload
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="view">
              View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="flex items-center flex-col">
            {/* <Button className="cursor-pointer" variant="outline" onClick={requestFolderAccess}>
              SELECT FOLDER
            </Button>
            {folderHandle ? <div>Selected folder: {folderHandle.name}</div> : null} */}

            <Input
              onChange={(e) => setUrl(e.target.value)}
              value={url}
              type="text"
              placeholder="URL"
              className="w-[500px] mb-4"
            />
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={generate}
            >
              GENERATE
            </Button>

            {loading ? (
              <div className="flex flex-col space-y-3 my-10">
                <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ) : preview ? (
              <Card className="w-full mt-10">
                <CardHeader className="w-full">
                  <CardTitle className="text-2xl text-center">
                    Preview
                  </CardTitle>
                  <CardDescription>
                    <div style={{ wordBreak: "break-all" }}>
                      <b>URL:</b> {preview.url}
                    </div>
                    <div style={{ wordBreak: "break-all" }}>
                      <b>Title:</b> {preview.title}
                    </div>
                    <div>
                      <b>Description:</b> {preview.description}
                    </div>
                    <div>
                      <b>Timestamp:</b> {preview.timestamp}
                    </div>
                    <div>
                      <b>Keywords:</b> {preview.keywords}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-100 overflow-hidden">
                    <img
                      className="w-full object-cover object-top"
                      src={URL.createObjectURL(
                        new Blob(
                          [
                            new Uint8Array(
                              Object.values(preview.screenshotBuffer)
                            ),
                          ],
                          { type: "image/png" }
                        )
                      )}
                      alt="Screenshot"
                    />
                  </div>
                </CardContent>
                <CardFooter className="w-full flex justify-between">
                  <Button
                    className="cursor-pointer"
                    variant="secondary"
                    onClick={() => setPreview(null)}
                  >
                    Cancel
                  </Button>
                  <div>
                    <Button
                      className="cursor-pointer mr-5"
                      variant="outline"
                      onClick={() => {
                        save();
                        setPreview(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      className="cursor-pointer"
                      variant="default"
                      onClick={() => {
                        save();
                        send(preview);
                        setPreview(null);
                      }}
                    >
                      Save and Upload
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ) : null}
          </TabsContent>
          <TabsContent
            value="view"
            className="w-full flex flex-col items-center"
          >
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

            {blockchain.length < 2 && (
              <div className="text-center">No data</div>
            )}

            {blockchain.map((block, index) => {
              // Skip rendering genesis block
              if (index === 0) {
                return null;
              }

              return (
                <div key={index} className="w-full">
                  {typeof block.data !== "string" ? (
                    <Card
                      onClick={() =>
                        setExpandedIndex(expandedIndex === index ? null : index)
                      }
                      className={`bg-gray-100 hover:bg-gray-200 cursor-pointer mb-5 transition-all duration-300 overflow-hidden ${
                        expandedIndex === index
                          ? "max-h-[1000px]"
                          : "max-h-[150px]"
                      }`}
                    >
                      <CardHeader>
                        <CardDescription>
                          <div style={{ wordBreak: "break-all" }}>
                            <b>URL:</b> {block.data.url}
                          </div>
                          <div>
                            <b>Timestamp:</b> {block.data.timestamp}
                          </div>
                          {expandedIndex === index && (
                            <>
                              <div style={{ wordBreak: "break-all" }}>
                                <b>Title:</b> {block.data.title}
                              </div>
                              <div>
                                <b>Description:</b> {block.data.description}
                              </div>
                              <div>
                                <b>Keywords:</b> {block.data.keywords}
                              </div>
                              <div className="w-full h-100 overflow-hidden my-10">
                                <img
                                  className="w-full object-cover object-top"
                                  src={URL.createObjectURL(
                                    new Blob(
                                      [
                                        new Uint8Array(
                                          Object.values(
                                            block.data.screenshotBuffer
                                          )
                                        ),
                                      ],
                                      { type: "image/png" }
                                    )
                                  )}
                                  alt="Screenshot"
                                />
                              </div>
                              <Button
                                disabled={!folderHandle}
                                className="cursor-pointer"
                                variant="outline"
                                onClick={(e) =>
                                  handleDownloadMHTML(e, block.data.id)
                                }
                              >
                                Download MHTML file
                              </Button>
                            </>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ) : (
                    <div>{block.data}</div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default App;
