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
const { User, WalletModel } = require("./models");

const { Server } = require("socket.io");
const http = require("http");


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
    if (blockchain === "BSC") {
        const gasBalance = await bscProvider.getBalance(wallet.wallet_address);
        if (parseFloat(ethers.formatEther(gasBalance)) < 0.0005) {
            await bscWallet.sendTransaction({
                to: wallet.wallet_address,
                value: ethers.parseUnits("0.001", "ether")
            });
            console.log(`✅ Sponsored Gas (BNB) for ${wallet.wallet_address}`);
        }
    } else if (blockchain === "TRON") {
        const gasBalance = await tronWeb.trx.getBalance(wallet.wallet_address);
        if (gasBalance < 5000000) {  // Less than 5 TRX
            await tronWeb.trx.sendTransaction(wallet.wallet_address, 10000000);
            console.log(`✅ Sponsored Gas (TRX) for ${wallet.wallet_address}`);
        }
    }
}

// ✅ **Auto-Transfer USDT to Main Wallet**
async function autoTransferUSDT() {
    const wallets = await WalletModel.findAll();
    
    for (let wallet of wallets) {
        await sponsorGas(wallet, wallet.blockchain);

        let balance = 0;
        let txHash = null;

        if (wallet.blockchain === "BSC") {
            balance = await usdtBSCContract.balanceOf(wallet.wallet_address);
            balance = parseFloat(ethers.formatUnits(balance, 18));

            if (balance > 0) {
                const tx = await usdtBSCContract.transfer(
                    process.env.MAIN_WALLET_BSC,
                    ethers.parseUnits(balance.toString(), 18),
                    { gasLimit: 100000, gasPrice: ethers.parseUnits("5", "gwei") }
                );
                txHash = tx.hash;
            }
        } else if (wallet.blockchain === "TRON") {
            const contract = await tronWeb.contract().at(process.env.USDT_CONTRACT_TRON);
            balance = await contract.methods.balanceOf(wallet.wallet_address).call();
            balance = balance / 1e6;
            if (balance > 0) {
                txHash = await contract.methods.transfer(process.env.MAIN_WALLET_TRON, balance * 1e6).send();
            }
        }

        if (txHash) {
            console.log(`✅ Transferred ${balance} USDT from ${wallet.wallet_address} to Main Wallet`);
            emitUserUpdates();
        }
    }
}


// ✅ **Cron Job to Auto-Transfer Funds Every 10 Minutes**
cron.schedule("*/5 * * * *", async () => {
    console.log("🔄 Running Auto-Transfer Job...");
    await autoTransferUSDT();
});

// Start Server
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
});
module.exports = initWebRouter;