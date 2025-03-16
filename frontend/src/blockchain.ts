import { Metadata } from "./types";

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
    previousHash: string = ""
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = "";
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
  public chain: Block[];

  constructor(chain?: Block[]) {
    this.chain = chain || []
      // ? chain.map(
      //     (block) =>
      //       new Block(
      //         block.index,
      //         block.timestamp,
      //         block.data,
      //         block.previousHash
      //       )
      //   )
      // : [];
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  async addBlock(newBlock: Block): Promise<void> {
    newBlock.previousHash = this.getLatestBlock().hash;
    await newBlock.calculateHash();
    this.chain = [...this.chain, newBlock];
  }

  async isChainValid(): Promise<boolean> {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      await currentBlock.calculateHash();
      if (currentBlock.hash !== currentBlock.hash) {
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

// // Example usage
// (async () => {
//   const myBlockchain = new Blockchain();

//   // Add some blocks
//   const block1 = new Block(1, Date.now(), { amount: 10 });
//   await myBlockchain.addBlock(block1);

//   const block2 = new Block(2, Date.now(), { amount: 20 });
//   await myBlockchain.addBlock(block2);

//   // Print the blockchain
//   console.log(JSON.stringify(myBlockchain, null, 2));

//   // Validate the blockchain
//   console.log("Is blockchain valid?", await myBlockchain.isChainValid());
// })();
