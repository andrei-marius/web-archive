import { Metadata } from "./types/types";

export class Block {
  public index: number;
  public timestamp: number;
  public data: Metadata | string;
  public previousHash: string;
  public hash: string;

  constructor(
    index: number,
    timestamp: number,
    data: Metadata | string,
    previousHash: string = "",
    hash?: string
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = hash || "";
  }

  async calculateHash(): Promise<void> {
    const data =
      this.index +
      this.timestamp +
      JSON.stringify(this.data) +
      this.previousHash;
    this.hash = await calculateHash(data);
  }
}

export class Blockchain {
    public chain: Block[] = [];

    constructor(chain?: Block[]) {
        if (chain && chain.length) {
            // Rehydrate existing chain
            this.chain = chain.map(
                (block) =>
                    new Block(
                        block.index,
                        block.timestamp,
                        block.data,
                        block.previousHash,
                        block.hash
                    )
            );
        } else {
            // No chain provided — auto-create genesis block
            this.initializeGenesisBlock();
        }
    }

    private async initializeGenesisBlock() {
        const genesisBlock = new Block(0, Date.now(), "Genesis Block");
        await genesisBlock.calculateHash();
        this.chain.push(genesisBlock);
    }

    async addBlock(newBlock: Block): Promise<void> {
        const latestBlock = this.getLatestBlock();
        newBlock.previousHash = latestBlock.hash;
        await newBlock.calculateHash();
        this.chain.push(newBlock);
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  async isChainValid(): Promise<boolean> {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

        const originalHash = currentBlock.hash;
        await currentBlock.calculateHash();
        if (currentBlock.hash !== originalHash) {
            return false;
        }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
