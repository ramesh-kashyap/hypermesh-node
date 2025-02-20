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
const { User, WalletModel,UserWalletModel, GasSponsorshipModel, Investment } = require("./models");
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

app.get("/addKey", (req, res) => {
    AWS.config.update({
        accessKeyId: "2116642553",
        secretAccessKey: "5877994625",
        region: "us-east-1"
      });

    const s3 = new AWS.S3();
    
    const walletData = {
      usdtBep20: "8e9665289fe6e3615d16c4be26de5d1a1fc527cd21da0b354c22e12daabd3cb7", // Binance Smart Chain (BSC)
      usdtTrc20: "da27f8d330a9251512663264e85fd2079085b9319acb4414539ed015fc880c22" // Tron Blockchain
    };
    
    // Upload JSON to S3
    const params = {
      Bucket: "Rameshk",
      Key: `wallet-data-${Date.now()}.json`, // Unique filename
      Body: JSON.stringify(walletData, null, 2),
      ContentType: "application/json",
    };
    
    s3.upload(params, (err, data) => {
      if (err) {
        console.error("Error uploading wallet data:", err);
      } else {
        console.log("Wallet data uploaded successfully:", data.Location);
      }
    });
});


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

// ✅ **Sponsor Gas Fee**
async function sponsorGas(wallet, blockchain) {
    try {
        const now = new Date();

        // ✅ Step 1: Check if the user has USDT before sponsoring gas
        let usdtBalance = BigInt(0);

        if (blockchain === "BSC") {
            const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
            const userUsdtContract = new ethers.Contract(
                process.env.USDT_CONTRACT_BSC,
                ["function balanceOf(address) view returns (uint256)"],
                provider
            );

            usdtBalance = await userUsdtContract.balanceOf(wallet.wallet_address);
            usdtBalance = BigInt(usdtBalance); // ✅ Ensure it's a BigInt
        } else if (blockchain === "TRON") {
            const contract = await tronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
            usdtBalance = await contract.methods.balanceOf(wallet.wallet_address).call();
            usdtBalance = BigInt(usdtBalance) / BigInt(1e6); // ✅ Convert from TRC-20 decimals
        }

        if (usdtBalance <= BigInt(0)) {
            console.log(`🚫 Skipping gas sponsorship for ${wallet.wallet_address} (No USDT balance)`);
            return;
        }

        // ✅ Step 2: Check gas balance and sponsor if needed
        if (blockchain === "BSC") {
            const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
            const feeData = await provider.getFeeData(); // ✅ Fetch real-time gas fee
            const gasPrice = BigInt(feeData.gasPrice); // ✅ Convert gas price to BigInt
            const gasLimit = BigInt(100000); // ✅ Estimated gas limit for USDT transfer
            const estimatedGasFee = gasPrice * gasLimit; // ✅ Safe BigInt multiplication

            const gasBalance = await provider.getBalance(wallet.wallet_address);
            const currentBalance = BigInt(gasBalance); // ✅ Convert to BigInt

            console.log(`🔍 Checking BNB gas balance for ${wallet.wallet_address}`);
            console.log(`💰 Current BNB: ${ethers.formatUnits(currentBalance, "ether")}, Required: ${ethers.formatUnits(estimatedGasFee, "ether")}`);

            if (currentBalance < estimatedGasFee) {
                const missingGasFee = estimatedGasFee - currentBalance; // ✅ Calculate exact missing gas amount

                console.log(`⚡ Sponsoring Gas: Sending ${ethers.formatUnits(missingGasFee, "ether")} BNB to ${wallet.wallet_address}`);

                const tx = await bscWallet.sendTransaction({
                    to: wallet.wallet_address,
                    value: missingGasFee
                });

                await GasSponsorshipModel.create({ wallet_address: wallet.wallet_address, sponsored_at: now });
                console.log(`✅ Gas Sponsored (BNB) for ${wallet.wallet_address} | TX: ${tx.hash}`);
            }
        } else if (blockchain === "TRON") {
            const estimatedEnergy = BigInt(5000000); // Approximate TRX needed
            const gasBalance = BigInt(await tronWeb.trx.getBalance(wallet.wallet_address));

            console.log(`🔍 Checking TRX gas balance for ${wallet.wallet_address}`);
            console.log(`💰 Current TRX: ${gasBalance}, Required: ${estimatedEnergy}`);

            if (gasBalance < estimatedEnergy) {
                const missingGasFee = estimatedEnergy - gasBalance; // ✅ Calculate exact missing gas amount

                console.log(`⚡ Sponsoring Gas: Sending ${missingGasFee} TRX to ${wallet.wallet_address}`);

                const tx = await tronWeb.trx.sendTransaction(wallet.wallet_address, Number(missingGasFee));

                await GasSponsorshipModel.create({ wallet_address: wallet.wallet_address, sponsored_at: now });

                console.log(`✅ Gas Sponsored (TRX) for ${wallet.wallet_address} | TX: ${tx}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error in sponsorGas for ${wallet.wallet_address}:`, error);
    }
}
async function checkGasBalance(wallet) {
    if (wallet.blockchain === "BSC") {
        const gasBalance = await bscProvider.getBalance(wallet.wallet_address);
        if (parseFloat(ethers.formatEther(gasBalance)) < 0.0002) {
            console.error(`❌ Not enough BNB for gas in ${wallet.wallet_address}`);
            return false;
        }
    } else if (wallet.blockchain === "TRON") {
        const gasBalance = await tronWeb.trx.getBalance(wallet.wallet_address);
        if (gasBalance < 5000000) { // Less than 5 TRX
            console.error(`❌ Not enough TRX for gas in ${wallet.wallet_address}`);
            return false;
        }
    }
    return true;
}

// ✅ **Auto-Transfer USDT to Main Wallet**

async function checkPendingPayments() {
    const wallets = await WalletModel.findAll();

    for (let wallet of wallets) {
        console.log(`🔍 Checking wallet: ${wallet.wallet_address}`);

        // ✅ Sponsor Gas if needed
        await sponsorGas(wallet, wallet.blockchain);

        // ✅ Fetch wallet balance
        let balance = 0;
        if (wallet.blockchain === "BSC") {
            balance = await usdtBSCContract.balanceOf(wallet.wallet_address);
            balance = parseFloat(ethers.formatUnits(balance, 18));
        } else if (wallet.blockchain === "TRON") {
            const contract = await tronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
            balance = await contract.methods.balanceOf(wallet.wallet_address).call();
            balance = balance / 1e6;
        }

        if (balance > 0) {
            console.log(`💰 Detected ${balance} USDT in ${wallet.wallet_address}`);

            // ✅ Fetch user wallet with private key
            const userWallet = await UserWalletModel.findOne({ where: { wallet_address: wallet.wallet_address } });
            if (!userWallet || !userWallet.private_key) {
                console.error(`❌ No private key found for wallet: ${wallet.wallet_address}`);
                continue;
            }

            // ✅ Ensure enough gas for transaction
            if (!(await checkGasBalance(userWallet))) continue;

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
                    ethers.parseUnits(balance.toString(), 18),
                    { gasLimit: 100000, gasPrice: ethers.parseUnits("5", "gwei") }
                );
                txHash = tx.hash;

            } else if (wallet.blockchain === "TRON") {
                const userTronWeb = new TronWeb({
                    fullHost: process.env.TRON_API,
                    privateKey: userWallet.private_key
                });

                const contract = await userTronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
                txHash = await contract.methods.transfer(
                    process.env.MAIN_WALLET_TRON,
                    balance * 1e6
                ).send();
            }

            if (txHash) {
                console.log(`✅ Transferred ${balance} USDT from ${wallet.wallet_address} to Main Wallet`);

                // ✅ Check if transaction already exists in `investments`
                const existingInvestment = await Investment.findOne({
                    where: { transaction_id: txHash }
                });

                if (existingInvestment) {
                    console.log(`⏳ Transaction ${txHash} already recorded, skipping...`);
                } else {

                    const existingUser = await User.findOne({ where: { id: userWallet.user_id  }});

                    // ✅ Record the successful transaction in `investments`
                    await Investment.create({
                        user_id: userWallet.user_id,
                        user_id_fk: existingUser.username,
                        amount: balance,
                        transaction_id: txHash,
                        status: "Active",
                        created_at: new Date().toISOString()
                    });

                    console.log(`📝 Investment recorded for ${userWallet.wallet_address}`);
                }

                // ✅ Update user balance to 0
                await UserWalletModel.update({ balance: 0 }, { where: { wallet_address: wallet.wallet_address } });

                // ✅ Notify frontend via WebSocket
                io.emit("updateUserBalance", { wallet_address: wallet.wallet_address, balance: 0 });
            } else {
                console.error(`❌ Transfer failed for ${wallet.wallet_address}`);
            }
        }
    }
}


// ✅ **Cron Job to Auto-Transfer Funds Every 10 Minutes**
// cron.schedule("*/1 * * * *", async () => {
//     console.log("🔄 Running Auto-Transfer Job...");
//     await checkPendingPayments();
// });
ç
// Start Server
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
});
module.exports = initWebRouter;