import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import scrapePage from "./puppeteer.js";
import { Blockchain } from "./blockchain.js";

const app = express();
const server = createServer(app);
let yesVotes = 0;
let noVotes = 0;
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  try {
    const metadata = await scrapePage(url)

    res.json({ success: true, metadata });
  } catch (error) {
    console.error('Error in /scrape route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

let connectedPeers = [];
const blockchain = new Blockchain();

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  if (connectedPeers.length < 1) {
    io.emit("init_blockchain", blockchain.chain);
  }

  connectedPeers.push(socket.id);

  console.log(connectedPeers.length);

  io.emit("connectedPeers", connectedPeers);

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);

    connectedPeers = connectedPeers.filter((id) => id !== socket.id);

    console.log(connectedPeers.length);

    io.emit("connectedPeers", connectedPeers);
  });


// Either combine to one with an if statement or share variables between them on a single listener
// should have a "votes done" check in both or the combined, look at connectedPeers.length and finalize the vote if full or majority as compared to the array
socket.on('VOTE_BLOCK_YES', (data) => {
    console.log("Received vote in the possitive:", data);
    yesVotes = yesVotes++;
    console.log("yesVotes:", yesVotes);
    if (yesVotes >= (connectedPeers.length / 2)) { 
        io.emit("YES_VOTE", data);
        // reset the voting variables
        yesVotes = 0;
        noVotes = 0;
        // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
        // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
    } 
    if (yesVotes + noVotes >= connectedPeers.length) {
        if (yesVotes >= noVotes) {
            let block
            io.emit("YES_VOTE", data);
            // reset the voting variables
            yesVotes = 0;
            noVotes = 0;
        } else {
            io.emit("NO_VOTE");
            // reset the voting variables
            yesVotes = 0;
            noVotes = 0;
        }
    }
});

socket.on('VOTE_BLOCK_NO', (data) => {
    console.log("Received vote in the negative:", data);
    noVotes = noVotes++;
    if (noVotes > (connectedPeers.length / 2)) {
        io.emit("NO_VOTE")
        // io.emit("YES_VOTE" or even "NEW_BLOCKCHAIN" since the block updates after this, blockchain.chain(take the data and use it here to compute the new block))
        // could even consider finding the original peer and making the use the original send function from io.emit("YES_VOTE")
    }
    if (yesVotes + noVotes >= connectedPeers.length) {
        if (yesVotes >= noVotes) {
            let block
            io.emit("YES_VOTE", data);
            // reset the voting variables
            yesVotes = 0;
            noVotes = 0;
        } else {
            io.emit("NO_VOTE");
            // reset the voting variables
            yesVotes = 0;
            noVotes = 0;
        }
    }
});
});
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
