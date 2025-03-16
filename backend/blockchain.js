export class Block {
    constructor(index, timestamp, data, previousHash = "") {
      this.index = index;
      this.timestamp = timestamp;
      this.data = data;
      this.previousHash = previousHash;
      this.hash = "";
    }
  
    async calculateHash() {
      const data =
        this.index +
        this.timestamp +
        JSON.stringify(this.data) +
        this.previousHash;
      this.hash = await calculateHash(data);
    }
  }
  
  export class Blockchain {
    constructor() {
      this.chain = [this.createGenesisBlock()];
    }
  
    createGenesisBlock() {
      const genesisBlock = new Block(0, Date.now(), "Genesis Block", "0");
      genesisBlock.calculateHash();
      return genesisBlock;
    }
  }
  
  async function calculateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }