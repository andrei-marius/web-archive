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
    this.loadBlockchainFromFile(); // Load blockchain data from file on initialization
  }

  createGenesisBlock() {
    const genesisBlock = new Block(0, Date.now(), "Genesis Block", []);
    genesisBlock.calculateHash();
    return genesisBlock;
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.chain[this.chain.length - 1].hash;
    newBlock.calculateHash();
    this.chain.push(newBlock);

    // Update keyword index
    const keywords = newBlock.data.keywords.split(',').map(keyword => keyword.trim());
    keywords.forEach(keyword => {
      if (!this.keywordIndex[keyword]) {
        this.keywordIndex[keyword] = [];
      }
      this.keywordIndex[keyword].push(newBlock.index);
    });

    // Save updated blockchain to file
    this.saveBlockchainToFile();
  }

  searchByKeyword(keyword) {
    const blockIndexes = this.keywordIndex[keyword] || [];
    return blockIndexes.map(index => this.chain[index]);
  }

  // Load the blockchain from file
  loadBlockchainFromFile() {
    try {
      if (fs.existsSync('blockchain.json')) {
        const data = fs.readFileSync('blockchain.json', 'utf8');
        const parsedData = JSON.parse(data);
        this.chain = parsedData.chain || [this.createGenesisBlock()];
        this.keywordIndex = parsedData.keywordIndex || {};
        console.log('Blockchain loaded from file');
      }
    } catch (error) {
      console.error('Error loading blockchain from file:', error);
    }
  }

  // Save chain locally, and update when cahnges are made through frontned
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
