require('dotenv').config();
const routes = require('./routes/web');
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const passport = require("passport");
const winston = require("winston");
const initWebRouter = require("./routes/web");
const cron = require("node-cron");
const AWS = require("aws-sdk");
const { Server } = require("socket.io");
const http = require("http");
const { User, WalletModel,UserWalletModel, GasSponsorshipModel, Investment,Graph } = require("./models");
const { ethers } = require("ethers");
const { TronWeb } = require("tronweb");


// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3002;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });



// Security Middleware
app.use(helmet());
app.use(cors({
    origin: "http://localhost:3000", // Adjust as needed
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());


const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
const bscWallet = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, bscProvider);
const usdtBSCContract = new ethers.Contract(
    process.env.USDT_CONTRACT_BSC,
    ["function balanceOf(address) view returns (uint256)", "function transfer(address, uint256) returns (bool)"],
    bscWallet
);

const tronWeb = new TronWeb({
    fullHost: process.env.TRON_API,
    privateKey: process.env.TRON_PRIVATE_KEY
});


// Apply CORS middleware for Express
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*", credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests from this IP' });
// app.use(limiter);

// Logger Configuration
const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

// Session Setup
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your-secret-key",
        resave: false,
        saveUninitialized: true,
    })
);
app.use(passport.initialize());
app.use(passport.session());

// Initialize Web Routes
// routes.initWebRouter(app);

// Default Route

app.get("/", (req, res) => {
    res.send({ message: "Secure Node.js API with MySQL" });
    
});


// const initWebRouter = (app) => {
//     app.use('/', router);  // Apply the router to the app, starting from the root
// };
initWebRouter(app);

// ✅ **WebSocket Connection**
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => console.log("Client disconnected"));
});

// ✅ **Emit Real-Time User Updates**
async function emitUserUpdates() {
    const users = await User.findAll({ include: WalletModel });

    io.emit("updateUsers", users);
}


async function sponsorGas(wallet, blockchain,estimatedGasFee) {
    try {
        console.log(`🔍 Checking gas sponsorship for ${wallet.wallet_address} on ${blockchain}`);

        if (blockchain === "BSC") {
            const gasBalance = await bscProvider.getBalance(wallet.wallet_address);
            const gasBalanceEth = parseFloat(ethers.formatEther(gasBalance));
            if (gasBalanceEth < estimatedGasFee) {
                console.log(`⚡ Sponsoring Gas: Sending ${estimatedGasFee} BNB to ${wallet.wallet_address}`);
                const estimatedGasFee2 = estimatedGasFee.toString(); // ✅ Convert balance to string
                const amountInWei = ethers.parseUnits(estimatedGasFee2, 18); // ✅ Convert to correct format
                const tx = await bscWallet.sendTransaction({
                    to: wallet.wallet_address,
                    value: amountInWei
                });
                await GasSponsorshipModel.create({ wallet_address: wallet.wallet_address });
                console.log(`✅ Sponsored Gas (BNB) | TX: ${tx.hash}`);
            } else {
                console.log(`✅ Sufficient BNB for ${wallet.wallet_address}`);
            }
        } else if (blockchain === "TRON") {
            const gasBalance = await tronWeb.trx.getBalance(wallet.wallet_address) || 0;
            const mainWalletBalance = await tronWeb.trx.getBalance(process.env.MAIN_WALLET_TRON) || 0;

            console.log(`🔍 User TRX: ${gasBalance} | Main Wallet TRX: ${mainWalletBalance}`);

            if (gasBalance < estimatedGasFee && mainWalletBalance > estimatedGasFee) {
                console.log(`⚡ Sponsoring Gas: Sending ${estimatedGasFee / 1e6} TRX to ${wallet.wallet_address}`);

                const estimatedGasFee2 = estimatedGasFee.toString(); // ✅ Convert to string

                const signedTx = await tronWeb.trx.sign(
                    await tronWeb.trx.sendTransaction(wallet.wallet_address, Number(estimatedGasFee2), process.env.MAIN_WALLET_TRON_PRIVATE_KEY)
                );

                const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

                if (receipt.result) {
                    await GasSponsorshipModel.create({ wallet_address: wallet.wallet_address });
                    console.log(`✅ Sponsored Gas (TRX) for ${wallet.wallet_address} | TX: ${receipt.txid}`);
                } else {
                    console.error(`❌ TRX Gas Sponsorship Failed for ${wallet.wallet_address}`);
                }
            } else {
                console.log(`🚫 No TRX sponsorship needed for ${wallet.wallet_address}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error in sponsorGas for ${wallet.wallet_address}:`, error);
    }
}


async function estimateBSCGas(walletAddress, balance) {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
        const walletSigner = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, provider);

        // ✅ Create contract instance with correct ABI
        const usdtContract = new ethers.Contract(
            process.env.USDT_CONTRACT_BSC,
            ["function transfer(address recipient, uint256 amount) external returns (bool)"],
            walletSigner
        );

        // ✅ Convert balance to correct format
        const transferAmount = balance.toString(); // Ensure it's a string
        const amountInWei = ethers.parseUnits(transferAmount, 18); // Convert USDT to Wei

        // ✅ Fetch real-time gas price
        const feeData = await provider.getFeeData();
        const gasPrice = BigInt(feeData.gasPrice); // Convert gas price to BigInt

        // ✅ Use a higher gas limit for safety (USDT transfers require more gas)
        let estimatedGasLimit;
        try {
            estimatedGasLimit = await usdtContract.estimateGas.transfer(
                process.env.MAIN_WALLET_BSC,
                amountInWei
            );
        } catch (error) {
            console.warn(`⚠️ Gas estimation failed, using fallback limit.`);
            estimatedGasLimit = 100000; // Safe fallback gas limit for USDT transfers
        }

        const estimatedGasFee = gasPrice * BigInt(estimatedGasLimit); // ✅ Correct gas fee calculation
        console.log(`🔍 Estimated Gas Fee: ${ethers.formatUnits(estimatedGasFee.toString(), "ether")} BNB`);
        console.log(`🔍 Gas Price: ${ethers.formatUnits(gasPrice.toString(), "gwei")} Gwei`);
        console.log(`🔍 Gas Limit: ${estimatedGasLimit}`);

        return ethers.formatUnits(estimatedGasFee.toString(), "ether");
    } catch (error) {
        console.error(`❌ Error estimating gas fee on BSC:`, error);
        return null;
    }
}

async function estimateTRXGas(walletAddress,balance) {
    try {
        const contract = await tronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
        const estimatedEnergy = await contract.methods.transfer(
            process.env.MAIN_WALLET_TRON,
            balance * 1e6 // 1 USDT in TRC-20 format
        ).estimateEnergy({ from: walletAddress });

        const energyFee = estimatedEnergy * 420; // Approx. TRX cost per energy unit
        console.log(`🔍 Estimated USDT Transfer Gas Fee on TRON: ${energyFee / 1e6} TRX`);
        return energyFee;
    } catch (error) {
        console.error(`❌ Error estimating gas fee on TRON:`, error);
        return null;
    }
}


// ✅ **Auto-Transfer USDT to Main Wallet**
async function checkPendingPayments() {
    const wallets = await WalletModel.findAll();

    if (!wallets.length) {
        console.log(`🚫 No wallets found`);
        return;
    }

    for (let wallet of wallets) {
        try {
            console.log(`🔍 Checking wallet: ${wallet.wallet_address}`);

            // ✅ Sponsor Gas if needed
         

            // ✅ Fetch wallet balance
            let balance = 0;
            let estimatedGasFee = 0;
            if (wallet.blockchain === "BSC") {
                balance = await usdtBSCContract.balanceOf(wallet.wallet_address);
                balance = parseFloat(ethers.formatUnits(balance, 18));
                if (balance>0) {
                    estimatedGasFee = await estimateBSCGas(wallet.wallet_address,balance);
                }
            

            } else if (wallet.blockchain === "TRON") {
                const contract = await tronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
                balance = await contract.methods.balanceOf(wallet.wallet_address).call();
                balance = BigInt(balance) / BigInt(1e6); // ✅ Ensure conversion before division
                if(balance>0)
                {
                    estimatedGasFee = await estimateTRXGas(wallet.wallet_address,balance);
                }
                
            }

            if (balance <= 0) {
                console.log(`🚫 No USDT detected in ${wallet.wallet_address}`);
                continue;
            }
            
            await sponsorGas(wallet, wallet.blockchain,estimatedGasFee);

            console.log(`💰 Detected ${balance} USDT in ${wallet.wallet_address}`);

            // ✅ Fetch user wallet with private key
            const userWallet = await UserWalletModel.findOne({ where: { wallet_address: wallet.wallet_address } });
            if (!userWallet || !userWallet.private_key) {
                console.error(`❌ No private key found for wallet: ${wallet.wallet_address}`);
                continue;
            }

            // ✅ Ensure enough gas for transaction
            // if (!(await checkGasBalance(userWallet))) continue;

            // ✅ Transfer USDT to Main Wallet
            let txHash = null;
            if (wallet.blockchain === "BSC") {
                const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
                const userWalletSigner = new ethers.Wallet(userWallet.private_key, provider);
                const userUsdtContract = new ethers.Contract(
                    process.env.USDT_CONTRACT_BSC,
                    ["function balanceOf(address) view returns (uint256)", "function transfer(address, uint256) returns (bool)"],
                    userWalletSigner
                );

                const tx = await userUsdtContract.transfer(
                    process.env.MAIN_WALLET_BSC,
                    ethers.parseUnits(balance.toString(), 18)
                );
                txHash = tx.hash;
            } else if (wallet.blockchain === "TRON") {
                const userTronWeb = new TronWeb({
                    fullHost: process.env.TRON_API,
                    privateKey: userWallet.private_key
                });

                const contract = await userTronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
                txHash = await contract.methods.transfer(process.env.MAIN_WALLET_TRON, balance * 1e6).send();
            }

            if (txHash) {
                console.log(`✅ Transferred ${balance} USDT from ${wallet.wallet_address} to Main Wallet`);

                // ✅ Check if transaction already exists in `investments`
                const existingInvestment = await Investment.findOne({ where: { transaction_id: txHash } });

                if (!existingInvestment) {
                    const existingUser = await User.findOne({ where: { id: userWallet.user_id } });

                    // ✅ Record the successful transaction in `investments`
                    await Investment.create({
                        user_id: userWallet.user_id,
                        user_id_fk: existingUser ? existingUser.username : "Unknown",
                        amount: balance,
                        transaction_id: txHash,
                        payment_mode: wallet.blockchain,
                        sdate: new Date(),
                        status: "Active",
                        created_at: new Date().toISOString()
                    });

                    console.log(`📝 Investment recorded for ${userWallet.wallet_address}`);
                } else {
                    console.log(`⏳ Transaction ${txHash} already recorded, skipping...`);
                }

                // ✅ Update user balance to 0
                await UserWalletModel.update({ balance: 0 }, { where: { wallet_address: wallet.wallet_address } });

                // ✅ Notify frontend via WebSocket
                io.emit("updateUserBalance", { wallet_address: wallet.wallet_address, balance: 0 });
            } else {
                console.error(`❌ Transfer failed for ${wallet.wallet_address}`);
            }

            
        } catch (error) {
            console.error(`❌ Error processing wallet ${wallet.wallet_address}:`, error);
        }
    }
}


// ✅ **Cron Job to Auto-Transfer Funds Every 10 Minutes**
// cron.schedule("*/10 * * * *", async () => {
    // console.log("🔄 Running Auto-Transfer Job...");
    // await checkPendingPayments();
// });

// Start Server
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
});
module.exports = initWebRouter;