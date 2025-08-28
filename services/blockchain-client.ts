/**
 * Blockchain Client Service
 * Manages Solana connection and Anchor program interactions for NyayChain
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Type definitions for our program
interface MarketAccount {
  bondMint: PublicKey;
  usdcMint: PublicKey;
  pricePerToken: anchor.BN;
  vaultBond: PublicKey;
  vaultUsdc: PublicKey;
  admin: PublicKey;
  paused: boolean;
  bump: number;
}

interface TradeEvent {
  market: PublicKey;
  trader: PublicKey;
  side: 'Buy' | 'Sell';
  amount: anchor.BN;
  price: anchor.BN;
}

export class BlockchainClient {
  private connection: Connection;
  private program: anchor.Program | null = null;
  private provider: anchor.AnchorProvider | null = null;
  private adminKeypair: Keypair | null = null;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Initialize the blockchain client with admin keypair
   */
  async initialize(adminKeypairPath?: string): Promise<void> {
    try {
      // Set up admin keypair (for server-side operations)
      if (adminKeypairPath) {
        const fs = await import('fs');
        const keypairData = JSON.parse(fs.readFileSync(adminKeypairPath, 'utf-8'));
        this.adminKeypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
      } else {
        // Generate a new keypair for testing
        this.adminKeypair = Keypair.generate();
        console.log('⚠️ Generated new admin keypair for testing');
        console.log('   Public Key:', this.adminKeypair.publicKey.toBase58());
      }

      // Set up provider and program
      const wallet = {
        publicKey: this.adminKeypair.publicKey,
        signTransaction: async (tx: any) => {
          tx.sign(this.adminKeypair!);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          txs.forEach(tx => tx.sign(this.adminKeypair!));
          return txs;
        }
      };

      this.provider = new anchor.AnchorProvider(this.connection, wallet as any, {
        commitment: 'confirmed'
      });

      anchor.setProvider(this.provider);

      // Load the program
      const programId = new PublicKey(process.env.ANCHOR_PROGRAM_ID || process.env.MARKETPLACE_PROGRAM_ID || '');
      if (!programId || programId.equals(PublicKey.default)) {
        throw new Error('ANCHOR_PROGRAM_ID not set in environment');
      }

      // Create minimal IDL for the program
      const idl = {
        version: "0.1.0",
        name: "sebi",
        instructions: [
          {
            name: "initializeMarket",
            accounts: [
              { name: "market", isMut: true, isSigner: false },
              { name: "bondMint", isMut: false, isSigner: false },
              { name: "usdcMint", isMut: false, isSigner: false },
              { name: "vaultBond", isMut: true, isSigner: false },
              { name: "vaultUsdc", isMut: true, isSigner: false },
              { name: "admin", isMut: true, isSigner: true },
              { name: "systemProgram", isMut: false, isSigner: false },
              { name: "tokenProgram", isMut: false, isSigner: false },
              { name: "rent", isMut: false, isSigner: false }
            ],
            args: [{ name: "pricePerToken", type: "u128" }]
          },
          {
            name: "buy",
            accounts: [
              { name: "market", isMut: true, isSigner: false },
              { name: "buyer", isMut: true, isSigner: true },
              { name: "buyerUsdc", isMut: true, isSigner: false },
              { name: "buyerBond", isMut: true, isSigner: false },
              { name: "vaultUsdc", isMut: true, isSigner: false },
              { name: "vaultBond", isMut: true, isSigner: false },
              { name: "tokenProgram", isMut: false, isSigner: false }
            ],
            args: [{ name: "amount", type: "u64" }]
          },
          {
            name: "sell",
            accounts: [
              { name: "market", isMut: true, isSigner: false },
              { name: "seller", isMut: true, isSigner: true },
              { name: "sellerUsdc", isMut: true, isSigner: false },
              { name: "sellerBond", isMut: true, isSigner: false },
              { name: "vaultUsdc", isMut: true, isSigner: false },
              { name: "vaultBond", isMut: true, isSigner: false },
              { name: "tokenProgram", isMut: false, isSigner: false }
            ],
            args: [{ name: "amount", type: "u64" }]
          },
          {
            name: "updatePrice",
            accounts: [
              { name: "market", isMut: true, isSigner: false },
              { name: "admin", isMut: false, isSigner: true }
            ],
            args: [{ name: "newPrice", type: "u128" }]
          },
          {
            name: "pause",
            accounts: [
              { name: "market", isMut: true, isSigner: false },
              { name: "admin", isMut: false, isSigner: true }
            ],
            args: []
          },
          {
            name: "withdraw",
            accounts: [
              { name: "market", isMut: true, isSigner: false },
              { name: "admin", isMut: true, isSigner: true },
              { name: "adminUsdc", isMut: true, isSigner: false },
              { name: "adminBond", isMut: true, isSigner: false },
              { name: "vaultUsdc", isMut: true, isSigner: false },
              { name: "vaultBond", isMut: true, isSigner: false },
              { name: "tokenProgram", isMut: false, isSigner: false }
            ],
            args: [
              { name: "amount", type: "u64" },
              { name: "isUsdc", type: "bool" }
            ]
          }
        ],
        accounts: [
          {
            name: "Market",
            type: {
              kind: "struct",
              fields: [
                { name: "bondMint", type: "publicKey" },
                { name: "usdcMint", type: "publicKey" },
                { name: "pricePerToken", type: "u128" },
                { name: "vaultBond", type: "publicKey" },
                { name: "vaultUsdc", type: "publicKey" },
                { name: "admin", type: "publicKey" },
                { name: "paused", type: "bool" },
                { name: "bump", type: "u8" }
              ]
            }
          }
        ],
        events: [
          {
            name: "TradeEvent",
            fields: [
              { name: "market", type: "publicKey" },
              { name: "trader", type: "publicKey" },
              { name: "side", type: { defined: "TradeSide" } },
              { name: "amount", type: "u64" },
              { name: "price", type: "u128" }
            ]
          }
        ],
        types: [
          {
            name: "TradeSide",
            type: {
              kind: "enum",
              variants: [
                { name: "Buy" },
                { name: "Sell" }
              ]
            }
          }
        ]
      };

      this.program = new anchor.Program(idl as any, programId, this.provider);

      console.log('✅ Blockchain client initialized');
      console.log('   Program ID:', programId.toBase58());
      console.log('   Admin:', this.adminKeypair.publicKey.toBase58());

    } catch (error) {
      console.error('❌ Failed to initialize blockchain client:', error);
      throw error;
    }
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get program instance
   */
  getProgram(): anchor.Program {
    if (!this.program) {
      throw new Error('Blockchain client not initialized. Call initialize() first.');
    }
    return this.program;
  }

  /**
   * Get admin keypair
   */
  getAdminKeypair(): Keypair {
    if (!this.adminKeypair) {
      throw new Error('Admin keypair not available');
    }
    return this.adminKeypair;
  }

  /**
   * Get provider
   */
  getProvider(): anchor.AnchorProvider {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return this.provider;
  }

  /**
   * Create a new SPL token mint
   */
  async createTokenMint(
    decimals: number = 6,
    mintAuthority?: PublicKey,
    freezeAuthority?: PublicKey
  ): Promise<PublicKey> {
    const admin = this.getAdminKeypair();
    
    const mint = await createMint(
      this.connection,
      admin,
      mintAuthority || admin.publicKey,
      freezeAuthority || null,
      decimals
    );

    console.log(`✅ Created token mint: ${mint.toBase58()}`);
    return mint;
  }

  /**
   * Derive market PDA for a bond mint
   */
  async deriveMarketPDA(bondMint: PublicKey): Promise<[PublicKey, number]> {
    const program = this.getProgram();
    return await PublicKey.findProgramAddress(
      [Buffer.from("market"), bondMint.toBuffer()],
      program.programId
    );
  }

  /**
   * Get market account data
   */
  async getMarketAccount(marketPda: PublicKey): Promise<MarketAccount | null> {
    try {
      const program = this.getProgram();
      const account = await program.account.market.fetch(marketPda);
      return account as any;
    } catch (error) {
      console.error('Error fetching market account:', error);
      return null;
    }
  }

  /**
   * Check if market exists for a bond
   */
  async marketExists(bondMint: PublicKey): Promise<boolean> {
    const [marketPda] = await this.deriveMarketPDA(bondMint);
    const account = await this.getMarketAccount(marketPda);
    return account !== null;
  }

  /**
   * Get account balance
   */
  async getBalance(account: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(account);
    return balance / anchor.web3.LAMPORTS_PER_SOL;
  }

  /**
   * Request airdrop (devnet/localnet only)
   */
  async requestAirdrop(pubkey: PublicKey, amount: number = 1): Promise<void> {
    const signature = await this.connection.requestAirdrop(
      pubkey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(signature);
    console.log(`✅ Airdropped ${amount} SOL to ${pubkey.toBase58()}`);
  }
}

// Export singleton instance
export const blockchainClient = new BlockchainClient();
