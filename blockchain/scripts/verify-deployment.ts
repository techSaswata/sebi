/**
 * Deployment Verification Script
 * Verifies that the NyayChain marketplace program is properly deployed and functional
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

async function verifyDeployment() {
  console.log("🔍 Verifying NyayChain Marketplace Deployment...\n");

  try {
    // Setup connection
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const connection = provider.connection;
    const cluster = connection.rpcEndpoint.includes('devnet') ? 'devnet' : 
                   connection.rpcEndpoint.includes('mainnet') ? 'mainnet' : 'localnet';
    
    console.log(`📊 Network: ${cluster}`);
    console.log(`🌐 RPC: ${connection.rpcEndpoint}`);
    console.log(`👤 Wallet: ${provider.wallet.publicKey.toBase58()}\n`);

    // Get the program
    const program = anchor.workspace.Sebi;
    if (!program) {
      throw new Error("❌ Program not found. Make sure you've built the project with 'anchor build'");
    }

    const programId = program.programId;
    console.log(`🆔 Program ID: ${programId.toBase58()}`);

    // 1. Verify program account exists
    console.log("\n1️⃣ Checking program account...");
    const programAccount = await connection.getAccountInfo(programId);
    
    if (!programAccount) {
      throw new Error("❌ Program account not found. Program may not be deployed.");
    }
    
    console.log(`✅ Program account found`);
    console.log(`   📦 Size: ${programAccount.data.length} bytes`);
    console.log(`   🏠 Owner: ${programAccount.owner.toBase58()}`);
    console.log(`   💰 Lamports: ${programAccount.lamports}`);

    // 2. Verify program is executable
    console.log("\n2️⃣ Checking program executable status...");
    if (!programAccount.executable) {
      throw new Error("❌ Program is not executable");
    }
    console.log("✅ Program is executable");

    // 3. Check deployer balance
    console.log("\n3️⃣ Checking deployer balance...");
    const balance = await connection.getBalance(provider.wallet.publicKey);
    const balanceInSol = balance / anchor.web3.LAMPORTS_PER_SOL;
    console.log(`💰 Balance: ${balanceInSol.toFixed(4)} SOL`);
    
    if (balanceInSol < 0.01) {
      console.warn("⚠️ Warning: Very low SOL balance");
    }

    // 4. Test program IDL
    console.log("\n4️⃣ Verifying program IDL...");
    try {
      const idl = program.idl;
      console.log(`✅ IDL loaded successfully`);
      console.log(`   📝 Instructions: ${idl.instructions?.length || 0}`);
      console.log(`   📋 Accounts: ${idl.accounts?.length || 0}`);
      console.log(`   🎯 Events: ${idl.events?.length || 0}`);
      
      // List instructions
      if (idl.instructions && idl.instructions.length > 0) {
        console.log("   📜 Available instructions:");
        idl.instructions.forEach((instruction: any) => {
          console.log(`      - ${instruction.name}`);
        });
      }
    } catch (error) {
      console.warn("⚠️ Could not load IDL:", error);
    }

    // 5. Test if we can derive PDAs
    console.log("\n5️⃣ Testing PDA derivation...");
    try {
      // Test with a dummy bond mint
      const dummyMint = anchor.web3.Keypair.generate().publicKey;
      const [marketPda, bump] = await PublicKey.findProgramAddress(
        [Buffer.from("market"), dummyMint.toBuffer()],
        programId
      );
      console.log("✅ PDA derivation working");
      console.log(`   🎯 Test Market PDA: ${marketPda.toBase58()}`);
      console.log(`   🔢 Bump: ${bump}`);
    } catch (error) {
      console.error("❌ PDA derivation failed:", error);
    }

    // 6. Network health check
    console.log("\n6️⃣ Checking network health...");
    try {
      const health = await connection.getHealth();
      console.log("✅ Network is healthy:", health);
    } catch (error) {
      console.warn("⚠️ Could not check network health:", error);
    }

    // 7. Check recent slot
    console.log("\n7️⃣ Checking network activity...");
    try {
      const slot = await connection.getSlot();
      console.log(`✅ Current slot: ${slot}`);
    } catch (error) {
      console.warn("⚠️ Could not get current slot:", error);
    }

    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT VERIFICATION COMPLETE");
    console.log("=".repeat(50));
    console.log(`✅ Program deployed: ${programId.toBase58()}`);
    console.log(`✅ Network: ${cluster}`);
    console.log(`✅ Status: Ready for use`);
    console.log("\n📋 Next steps:");
    console.log("1. Run the setup script: npm run blockchain:setup (from main project)");
    console.log("2. Test the integration: npm run test");
    console.log("3. Initialize markets and start trading!");

  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED:");
    console.error(error);
    console.log("\n🔧 Troubleshooting steps:");
    console.log("1. Make sure you've built the program: anchor build");
    console.log("2. Make sure you've deployed: anchor deploy");
    console.log("3. Check your Anchor.toml configuration");
    console.log("4. Verify your wallet has sufficient SOL");
    console.log("5. Check network connectivity");
    process.exit(1);
  }
}

// Run verification
verifyDeployment().catch(console.error);
