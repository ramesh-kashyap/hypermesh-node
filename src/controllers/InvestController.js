const { User, Investment, WalletModel } = require("../models"); // Import User model
const nodemailer = require("nodemailer");
const { Op } = require('sequelize');
const { ethers } = require("ethers");
const {TronWeb} = require("tronweb");


const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
const bscWallet = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, bscProvider);
const usdtBSCContract = new ethers.Contract(
    process.env.USDT_CONTRACT_BSC,
    ["function balanceOf(address) view returns (uint256)", "function transfer(address, uint256) returns (bool)"],
    bscWallet
);
const tronWeb = new TronWeb({ fullHost: process.env.TRON_API, privateKey: process.env.TRON_PRIVATE_KEY });




const getHistory = async (req, res) => {
    try {
        const user = req.user;
        // console.log("Authenticated User:", user);

        if (!user || !user.id) {
            return res.status(400).json({ error: "User not authenticated" });
        }   
        const userId = user.id;
    
        const investmentHistory = await Investment.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']] // Order by created_at in descending order
        });


        res.json({ success: true, data: investmentHistory });
    } catch (error) {
        console.error("Error fetching investment history:", error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};

const generateWallet = async (req, res) => {
    try {
        const user = req.user;
        const {blockchain} = req.body;
        // console.log("Authenticated User:", user);
        if (!user || !user.id) {
            return res.status(400).json({ error: "User not authenticated" });
        }   
        let wallet = await WalletModel.findOne({ where: { blockchain, user_id: user.id} });
    
        if (!wallet) {
            if (blockchain === "BSC") {
                const newWallet = ethers.Wallet.createRandom();
                wallet = await WalletModel.create({
                    blockchain,
                    user_id: user.id,
                    wallet_address: newWallet.address,
                    private_key: newWallet.privateKey
                });
            } else if (blockchain === "TRON") {
                const newWallet = await tronWeb.createAccount();
                wallet = await WalletModel.create({
                    blockchain,
                    user_id: user.id,
                    wallet_address: newWallet.address,
                    private_key: newWallet.privateKey
                });
            }
        }
     res.json({ message: "Wallet Assigned", wallet: wallet.wallet_address,blockchain:blockchain,status:true});
    } catch (error) {
        console.error("Error fetching investment history:", error.message, error.stack);
        res.status(500).json({ error: error.message,status:false });
    }
};







module.exports = { getHistory,generateWallet};
