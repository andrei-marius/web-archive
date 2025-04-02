import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import scrapePage from "./puppeteer.js";
import { Block, Blockchain } from "./blockchain.js"; 

const app = express();
const server = createServer(app);
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*", 
  },
});

// Init
const blockchain = new Blockchain();

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  try {
    const metadata = await scrapePage(url);
    res.json({ success: true, metadata });
  } catch (error) {
    console.error('Error in /scrape route:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/blockchain', (req, res) => {
  try {
    res.json({ success: true, blockchain: blockchain.chain });
  } catch (error) {
    console.error("Error in /blockchain route:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search by keyword endpoint
app.get('/search', (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ success: false, message: "Keyword is required" });
  }

  const results = blockchain.searchByKeyword(keyword);
  if (results.length === 0) {
    return res.status(404).json({ success: false, message: `No blocks found with keyword: ${keyword}` });
  }
  
  res.json({ success: true, blocks: results });
});

app.get('/keyword-index', (req, res) => {
  try {
    const result = blockchain.keywordIndex;

    // If the index is empty, return a message saying no keywords are found
    if (Object.keys(result).length === 0) {
      return res.status(200).json({ success: true, message: "No keywords in the index" });
    }

    // Send the full keyword index
    res.json({ success: true, keywordIndex: result });
  } catch (error) {
    console.error("Error retrieving keyword index:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});



app.post("/blockchain", async (req, res) => {
  try {
    console.log("Received data:", req.body);
    
    const { metadata, hash } = req.body;
    
    if (!metadata || !hash) {
      console.error("Missing metadata or hash", req.body);
      return res.status(400).json({ success: false, message: "Missing metadata or hash" });
    }

    const newBlock = new Block(blockchain.chain.length, Date.now(), metadata, metadata.keywords);
    newBlock.hash = hash;

    await blockchain.addBlock(newBlock);

    res.json({ success: true, message: "Block added to backend blockchain" });
  } catch (error) {
    console.error("Error adding block to backend blockchain:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

let connectedPeers = [];

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
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
