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
const AWS = require("aws-sdk");



// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3002;

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


// Start Server
app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
});
module.exports = initWebRouter;