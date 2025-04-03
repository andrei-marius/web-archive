import fs from 'fs';

export class Block {
  constructor(index, timestamp, data, keywords, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = "Testing"; // Will be updated by `calculateHash()`
  }

  async calculateHash() {
    const data = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash;
    this.hash = await calculateHash(data);
  }
}

export class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.keywordIndex = {}; // Hashtable to store keywords and their associated block indexes
    this.loadBlockchainFromFile(); 
  }

  createGenesisBlock() {
    const genesisBlock = new Block(0, Date.now(), "Genesis Block", []);
    genesisBlock.calculateHash();
    return genesisBlock;
  }

  async addBlock(newBlock) {
    newBlock.previousHash = this.chain[this.chain.length - 1].hash;
    await newBlock.calculateHash();
    this.chain.push(newBlock);
  
    // Get keywords
    let keywords = [];
  
    if (newBlock.data.keywords && newBlock.data.keywords.length > 0) {
      keywords = Array.isArray(newBlock.data.keywords)
        ? newBlock.data.keywords
        : newBlock.data.keywords.split(",").map(keyword => keyword.trim());
    } else if (newBlock.data.title) {
      keywords = this.extractKeywordsFromTitle(newBlock.data.title);
    }
  
    // Update keyword index
    keywords.forEach(keyword => {
      if (!this.keywordIndex[keyword]) {
        this.keywordIndex[keyword] = [];
      }
      this.keywordIndex[keyword].push(newBlock.index);
    });
  
    this.saveBlockchainToFile();
  }
  
  //Keyw
  searchByKeyword(keyword) {
    if (!keyword) return [];
  
    const lowerKeyword = keyword.toLowerCase();
    let matchedBlocks = [];
  
    this.chain.forEach((block) => {
      const blockKeywords = block.data.keywords ? block.data.keywords.toLowerCase() : "";
      const blockTitle = block.data.title ? block.data.title.toLowerCase() : "";
  
      if (blockKeywords.includes(lowerKeyword) || blockTitle.includes(lowerKeyword)) {
        matchedBlocks.push(block);
      }
    });
  
    return matchedBlocks;
  }
  

  // Load the blockchain from file
  loadBlockchainFromFile() {
    try {
      if (fs.existsSync('blockchain.json')) {
        const data = fs.readFileSync('blockchain.json', 'utf8');
        const parsedData = JSON.parse(data);
  
        // Ensure the blockchain has a chain, otherwise create a new genesis block
        if (!parsedData.chain || parsedData.chain.length === 0) {
          console.log("No valid chain found in blockchain.json, creating a new genesis block.");
          this.chain = [this.createGenesisBlock()];
        } else {
          this.chain = parsedData.chain;
        }
  
        this.keywordIndex = parsedData.keywordIndex || {};
        console.log('Blockchain loaded from file');
      } else {
        // If file doesn't exist, create a new blockchain with the genesis block
        this.chain = [this.createGenesisBlock()];
        console.log("blockchain.json does not exist. Created new blockchain with a genesis block.");
      }
    } catch (error) {
      console.error('Error loading blockchain from file:', error);
      this.chain = [this.createGenesisBlock()]; // Default to a new genesis block in case of error
    }
  }
  

  // Save chain locally, and update when cahnges are made through frontned (not blockchain.json changes)
  saveBlockchainToFile() {
    try {
      const blockchainData = {
        chain: this.chain,
        keywordIndex: this.keywordIndex,
      };
      fs.writeFileSync('blockchain.json', JSON.stringify(blockchainData, null, 2), 'utf8');
      console.log('Blockchain saved to file');
    } catch (error) {
      console.error('Error saving blockchain to file:', error);
    }
  }
}

// Helper function to calculate the hash
async function calculateHash(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}
