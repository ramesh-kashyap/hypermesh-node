const { User, Investment } = require("../models"); // Import User model
const nodemailer = require("nodemailer");
const { Op } = require('sequelize');


const getHistory = async (req, res) => {
    try {
        const user = req.user;
        // console.log("Authenticated User:", user);

        if (!user || !user.id) {
            return res.status(400).json({ error: "User not authenticated" });
        }


        console.log(user);
        const userId = user.id;
        console.log("User ID:", userId);

        const investmentHistory = await Investment.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']] // Order by created_at in descending order
        });

        console.log("Investment History:", investmentHistory);

        res.json({ success: true, data: investmentHistory });
    } catch (error) {
        console.error("Error fetching investment history:", error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};





module.exports = { getHistory};
