import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import scrapePage from "./puppeteer.js";
import { Block, Blockchain } from "./blockchain.js"; 

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json({ limit: '100mb' }));

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

// Search by keyword
app.get('/search', (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ success: false, message: "Keyword is required" });
  }

  // Search by keyword
  const keywordResults = blockchain.searchByKeyword(keyword);
  
  if (keywordResults.length > 0) {
    return res.json({ success: true, blocks: keywordResults });
  }

  // If no kyewords, use title
  const titleResults = blockchain.chain.filter(block => 
    block.title && block.title.toLowerCase().includes(keyword.toLowerCase())
  );

  if (titleResults.length === 0) {
    return res.status(404).json({ success: false, message: `No blocks found with keyword or title: ${keyword}` });
  }

  res.json({ success: true, blocks: titleResults });
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
    const { chain } = req.body;  // Receive the ENTIRE chain from frontend
    blockchain.chain = chain;  
    blockchain.saveBlockchainToFile(); 

    res.json({ success: true });
  } catch (error) {
    console.error("Error replacing chain:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
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
