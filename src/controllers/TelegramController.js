const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes } = require('sequelize');

let timeNow = Date.now();

const getUserByTelegramId = async (req, res) => {
    try {
        const { telegram_id } = req.body;

        if (!telegram_id) {
            return res.status(400).json({
                message: "Telegram ID is required",
                status: false,
                timeStamp: timeNow,
            });
        }

        const query = `
            SELECT 
                tu.telegram_id, tu.tusername, tu.tname, tu.tlastname,
                u.id AS user_id, u.email, u.name, u.username
            FROM telegram_users tu
            LEFT JOIN users u ON tu.id = u.telegram_id
            WHERE tu.telegram_id = :telegram_id;
        `;
        // Use Sequelize `query()` instead of `mysql.execute()`
        const results = await sequelize.query(query, {
            replacements: { telegram_id },  // Use replacements for security
            type: QueryTypes.SELECT         // Ensures correct result format
        });

        if (results.length === 0) {
            return res.status(404).json({
                message: "User not found",
                status: false,
                timeStamp: timeNow,
            });
        }

        return res.status(200).json({
            user: results[0],
            status: true,
            timeStamp: timeNow
        });

    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            status: false,
            timeStamp: timeNow,
        });
    }
};





const getTelegramHistory = async (req, res) => {
    try {
      
        const telegramUsers = await sequelize.query(
            `SELECT tu.* FROM telegram_users tu 
             INNER JOIN users u ON tu.telegram_id = u.telegram_id`,
            {
                type: QueryTypes.SELECT  
            }
        );

        // If no data found
        if (telegramUsers.length === 0) {
            return res.status(404).json({
                message: "No matching telegram users found",
                status: false,
                timeStamp: new Date(),
            });
        }

        console.log("Filtered Telegram Users Data:", telegramUsers);

        res.json({ success: true, data: telegramUsers });
    } catch (error) {
        console.error("Error fetching filtered telegram users:", error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};



module.exports = { getUserByTelegramId,getTelegramHistory };