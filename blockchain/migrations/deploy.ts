// NyayChain Marketplace Deployment Script
// This script handles the deployment and initialization of the marketplace program

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  console.log("🚀 Deploying NyayChain Marketplace Program...");
  console.log("📊 Network:", provider.connection.rpcEndpoint);
  console.log("👤 Deployer:", provider.wallet.publicKey.toBase58());

  try {
    // Get the program instance
    const program = anchor.workspace.Sebi;
    
    if (!program) {
      throw new Error("Program not found. Make sure to build first with 'anchor build'");
    }

    console.log("✅ Program ID:", program.programId.toBase58());

    // Check deployer balance
    const balance = await provider.connection.getBalance(provider.wallet.publicKey);
    const balanceInSol = balance / anchor.web3.LAMPORTS_PER_SOL;
    
    console.log(`💰 Deployer balance: ${balanceInSol.toFixed(4)} SOL`);
    
    if (balanceInSol < 0.1) {
      console.warn("⚠️ Warning: Low SOL balance. You may need more SOL for deployment and initialization.");
    }

    // Validate the program can be called
    console.log("🔍 Validating program deployment...");
    
    // Try to fetch program account to verify deployment
    const programAccount = await provider.connection.getAccountInfo(program.programId);
    
    if (programAccount) {
      console.log("✅ Program successfully deployed!");
      console.log(`📦 Program size: ${programAccount.data.length} bytes`);
      console.log(`🏠 Owner: ${programAccount.owner.toBase58()}`);
    } else {
      console.log("⚠️ Program account not found - deployment may have failed");
    }

    // Display next steps
    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env.local with the program ID:");
    console.log(`   ANCHOR_PROGRAM_ID=${program.programId.toBase58()}`);
    console.log("2. Run the blockchain setup script:");
    console.log("   npm run blockchain:setup");
    console.log("3. Test the deployment:");
    console.log("   anchor test");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
};
