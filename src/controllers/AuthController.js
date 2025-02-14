const sequelize = require('../config/connectDB'); // Import Sequelize connection
const { QueryTypes } = require('sequelize');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // User Model Import Karein



// Register User Function
const register = async (req, res) => {
    try {
        const { name, phone, email, password, sponsor } = req.body;
        
        if (!name || !phone || !email || !password || !sponsor) {
            return res.status(400).json({ error: "All fields are required!" });
        }

        // Check if user already exists
        const [existingUser] = await db.execute(
            "SELECT * FROM users WHERE email = ? OR phone = ?", [email, phone]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email or Phone already exists!" });
        }

        // Check if sponsor exists
        const [sponsorUser] = await db.execute(
            "SELECT * FROM users WHERE username = ?", [sponsor]
        );
        if (sponsorUser.length === 0) {
            return res.status(400).json({ error: "Sponsor does not exist!" });
        }

        // Generate username & transaction password
        const username = Math.random().toString(36).substring(2, 10);
        const tpassword = Math.random().toString(36).substring(2, 8);

        // Hash passwords
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedTPassword = await bcrypt.hash(tpassword, 10);

        // Get parent ID
        const [lastUser] = await db.execute("SELECT id FROM users ORDER BY id DESC LIMIT 1");
        const parentId = lastUser.length > 0 ? lastUser[0].id : null;

        // Provide a default for sponsor level if it's undefined or null
        const sponsorLevel = (sponsorUser[0].level !== undefined && sponsorUser[0].level !== null)
            ? sponsorUser[0].level
            : 0;

        // Construct new user object
        const newUser = {
            name,
            phone,
            email,
            username,
            password: hashedPassword,
            tpassword: hashedTPassword,
            PSR: password,
            TPSR: tpassword,
            sponsor: sponsorUser[0].id,
            level: sponsorLevel + 1,  // Default to 0 if sponsor level is not defined, then add 1
            ParentId: parentId
        };

        // Optional: Log newUser for debugging (avoid logging sensitive info in production)
        console.log("New User Data:", newUser);

        // Insert new user into the database
        await db.execute("INSERT INTO users SET ?", newUser);

        return res.status(201).json({ message: "User registered successfully!", username });

    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Server error", details: error.message });
    }
};



// Export function



// Login User Function
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and Password are required!" });
        }

        // Check if user exists
        const [user] = await db.promise().query(
            "SELECT * FROM users WHERE username = ?", [username]
        );

        if (user.length === 0) {
            return res.status(400).json({ error: "User not found!" });
        }

        const userData = user[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials!" });
        }

        // Generate JWT token
        const token = jwt.sign({ id: userData.id, username: userData.username }, "your_secret_key", { expiresIn: "1h" });

        return res.status(200).json({ message: "Login successful!", username: userData.username, token });

    } catch (error) {
        console.error("Error:", error.message);
        return res.status(500).json({ error: "Server error", details: error.message });
    }
};



const logout = async (req, res) => {
    try {
        return res.json({ message: "User logged out successfully!" });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};


const loginWithTelegram = async (req, res) => {
    try {
        const { telegram_id, tusername, tname, tlastname } = req.body;

        console.log("🔹 Telegram ID:", telegram_id);

        if (!telegram_id) {
            return res.status(200).json({ message: "Telegram ID is required" });
        }

        // ✅ Check if user exists
        const queryCheckUser = `
            SELECT * FROM telegram_users WHERE telegram_id = :telegram_id
        `;

        const users = await sequelize.query(queryCheckUser, {
            replacements: { telegram_id },
            type: QueryTypes.SELECT,
        });
        if (users.length > 0) {
            // ✅ User exists, generate JWT token
            const user = users[0]; // Extract first user

            const token = jwt.sign(
                { id: user.id, telegram_id: user.telegram_id },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(200).json({
                message: "Login successful",
                telegram_id: telegram_id,
                token,
            });
        } else {
            // ✅ Create new user
            const queryInsertUser = `
                INSERT INTO telegram_users (telegram_id, tusername, tname, tlastname) 
                VALUES (:telegram_id, :tusername, :tname, :tlastname)
            `;

            const [insertResult] = await sequelize.query(queryInsertUser, {
                replacements: { telegram_id, tusername, tname, tlastname },
                type: QueryTypes.INSERT,
            });

            // ✅ Generate JWT token for new user
            const token = jwt.sign(
                { id: insertResult, telegram_id }, // insertResult contains the new user ID
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            return res.status(201).json({
                message: "Account created and logged in",
                telegram_id: telegram_id,
                token,
            });
        }
    } catch (error) {
        console.error("❌ Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports = { login, register, logout,loginWithTelegram };

