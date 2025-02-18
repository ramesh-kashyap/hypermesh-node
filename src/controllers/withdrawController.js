const Withdraw = require("../models/Withdraw");
const User = require("../models/User"); // User Model Import Karein

const withdrawRequest = async (req, res) => {
    try {
        const { amount,payment_mode, address } = req.body;

        if (!amount || amount < 50) {
            return res.status(400).json({ error: "Invalid amount. Please enter a valid amount." });
        }

        if (!payment_mode || typeof payment_mode !== "string") {
            return res.status(400).json({ error: "Invalid payment mode. Please select a valid network." });
        }

        if (!address.trim()) {
            return res.status(400).json({ error: "Please enter a valid withdrawal address." });
        }

        if (!req.user || !req.user.id || !req.user.username) {
            return res.status(401).json({ error: "User authentication failed. Please login again." });
        }

        const deduction = amount * 0.05; 
        const finalAmount = amount - deduction; 

        const withdraw = await Withdraw.create({
            user_id: req.user.id,
            user_id_fk: req.user.username,  
            payment_mode, 
            amount: finalAmount,  
            address,
            status: "pending",
            wdate: new Date().toISOString().split("T")[0], 
        });

        return res.status(201).json({ message: "Withdraw request submitted successfully.", withdraw });
    } catch (error) {
        console.error("Withdraw request failed:", error);
        return res.status(500).json({ error: "Server error. Please try again later.", details: error.message });
    }
};




const getUserWithdraws = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 5 } = req.query;  // Default page 1 & limit 10

        const offset = (page - 1) * limit;

        const { count, rows } = await Withdraw.findAndCountAll({
            where: { user_id: userId },
            attributes: ["created_at", "amount"],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [["created_at", "DESC"]] // Newest first
        });

        res.json({
            withdraws: rows,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
        });

    } catch (error) {
        console.error("Error fetching withdraws:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const getUserUsdtAddress = async (req, res) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      console.log("Fetched User Data:", user); 
  
      res.json({
        usdtTrc20: user.usdtTrc20 || "",
        usdtBep20: user.usdtBep20 || "",
      });
    } catch (error) {
      console.error("Error fetching user address:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
module.exports = { withdrawRequest,getUserWithdraws ,getUserUsdtAddress};