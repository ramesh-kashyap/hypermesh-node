const { User, Investment } = require("../models"); // Import User model
const { Income, Withdraw } = require("../models");
const nodemailer = require("nodemailer");
const { Op } = require('sequelize'); // ✅ Import Sequelize Operators


const sendCode = async (req, res) => {
    try {
        console.log("Received Email:sagar");

        const { email } = req.body;
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryTime = new Date(Date.now() + 10 * 60000); // 10-minute expiry

        console.log("Received Email:", email);

        // ✅ Check if user exists using Sequelize
        const user = await User.findOne({ where: { email } });
        console.log("Received Email:sagar",user.email);

        if (!user) {
            console.log("Email Not Found:", email);
            return res.status(404).json({ message: 'Email not found' });
        }

        console.log("User Found:", user.email);

        // ✅ Update verification code in database
        await User.update(
            { verification_code: code, code_expires_at: expiryTime },
            { where: { email: email } } // ✅ `where` condition added
        );
                console.log("Verification code updated in database");

        // ✅ Setup nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
                
            }
        });

        console.log("Nodemailer transporter configured");

        // ✅ Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Password Reset Code',
            text: `Your verification code is ${code}. This code will expire in 10 minutes.`
        };

        // ✅ Send email
        await transporter.sendMail(mailOptions);
        console.log("Verification email sent successfully to:", email);

        return res.json({ message: 'Verification code sent successfully' });

    } catch (error) {
        console.error("Error in sendCode function:", error.message);
        return res.status(500).json({ error: error.message });
    }
};



const connectTelegram = async (req, res) => {
  
  try {
    const { telegram_id } = req.body;
    const user = req.user; // 🔹 Get authenticated user (Assuming JWT middleware is used   
    const id = user.id;
      if (!telegram_id) {
          return res.status(400).json({ message: "Telegram ID is required" });
      }
      
      const userExist = await User.findOne({ where: { telegram_id:telegram_id } });
      if (userExist) {
        return res.status(400).json({ message: "Telegram User exists",status:false });
      }
      if (user.telegram_id) 
        {
        return res.status(400).json({ message: "User Already Connected",status:false });
      }

        // Find and update if exists, otherwise insert a new record
        await User.upsert(
          { id, telegram_id }, // Ensure both `id` and `telegram_id` are provided
          { returning: true } // Ensures it returns the updated or created record
      );


        return res.json({
            message:"Telegram Account Connected",
            user,
            status:true
        });

    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ message: "Internal Server Error", status:false });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { email, code, PSR } = req.body;

       
        const user = await User.findOne({
            where: {
                email,
                verification_code: code,
                code_expires_at: { [Op.gt]: new Date() } 
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }


        await user.update({ PSR, verification_code: null, code_expires_at: null });

        return res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error("Error in resetPassword function:", error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
const { Op } = require("sequelize");

const getUserDetails = async (req, res) => {
    try {
        const user = req.user; 

        if (!user) {
            return res.status(404).json({ error: "User not found" , status: false});
        }

        return res.status(200).json({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            active_status: user.active_status,
            jdate: user.jdate,
            createdAt: user.createdAt,
            status: true
            
        });
    } catch (error) {
        console.error("❌ Error fetching user details:", error);
        return res.status(500).json({ error: "Internal Server Error" ,   status: false});
    }
};

const getAvailableBalance = async (req, res) => {
  try {
    const user = req.user; 
    const userId = user.id; // Authenticated User ID

    // ✅ Users Income
    const totalIncome = await Income.sum("comm", { where: { user_id: userId } });
    const totalInvestment = await Investment.sum("amount", { where: { user_id: userId } });

    // ✅ Withdraw Amount
    const totalWithdraw = await Withdraw.sum("amount", { where: { user_id: userId } });

    // ✅ Available Balance Calculation
    const balance = (totalIncome || 0) - (totalWithdraw || 0);

    res.json({ available_balance: balance,withdraw:totalWithdraw,totlinvest:totalInvestment });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getUserDetails,sendCode,resetPassword,getAvailableBalance,connectTelegram };
