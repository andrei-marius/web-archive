import io from "socket.io-client";
import Peer, { DataConnection } from "peerjs";
import { Block } from "./blockchain";
import useStore from "./store";

const socket = io("http://localhost:3000");
let peer: Peer;
let connectedPeers: string[] = [];
let connections: DataConnection[] = [];

export function init() {
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

              connection.on("data", function (data: unknown) {
                console.log("Received data:", data);

                if (isBlockchainMessage(data)) {
                  const { type, payload } = data;

                  if (type === "NEW_BLOCKCHAIN") {
                    useStore.getState().updateChain(payload);
                  }
                } else {
                  console.error("Received invalid data format:", data);
                }
              });
            });
          }
        } else {
          console.log("no other peers");
        }

        peer.on("connection", (conn) => {
          console.log("received connection", conn);
          connections.push(conn);

          conn.on("data", function (data: unknown) {
            console.log("Received data:", data);

            if (isBlockchainMessage(data)) {
              const { type, payload } = data;

              if (type === "NEW_BLOCKCHAIN") {
                // Synchronize the blockchain
                useStore.getState().updateChain(payload);
              }
            } else {
              console.error("Received invalid data format:", data);
            }
          });
        });
      });
    }
  });

  socket.on("connectedPeers", (data) => {
    connectedPeers = data.filter((id: string) => id !== socket.id);
    console.log(connectedPeers);
  });
}

export function send(data: string) {
  console.log("Sending data to connections:", connections);

  useStore
    .getState()
    .addBlock(data)
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

interface BlockchainMessage {
  type: string;
  payload: Block[];
};

function isBlockchainMessage(data: unknown): data is BlockchainMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    "payload" in data
  );
}
