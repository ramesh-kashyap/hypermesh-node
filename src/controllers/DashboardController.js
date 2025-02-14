const { User } = require("../models"); // Import User model
const { Income, Withdraw } = require("../models");
const nodemailer = require("nodemailer");
const User = require("../models/User");
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



const resetPassword = async (req, res) => {
    try {
        const { email, code, PSR } = req.body;
        console.log("Received Request for Reset Password");

        // ✅ Check if the verification code is valid and not expired
        const user = await User.findOne({
            where: {
                email,
                verification_code: code,
                code_expires_at: { [Op.gt]: new Date() } // Code expiry check
            }
        });

        if (!user) {
            console.log("Invalid or expired verification code for:", email);
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        console.log("User Found:", user.email);

        // ✅ Update the password and reset the verification code
        await user.update({ PSR, verification_code: null, code_expires_at: null });
        console.log("Password updated successfully for:", email);

        return res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error("Error in resetPassword function:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

const getUserDetails = async (req, res) => {
    try {
        // ✅ Get logged-in user details from `req.user` (set by `authMiddleware`)
        const user = req.user; 

        if (!user) {
            return res.status(404).json({ error: "User not found" , status: false});
        }

        // ✅ Return only necessary fields
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
        if (!user) {
            return res.status(404).json({ error: "User not found" , status: false});
        }
        const userId = user.id; // Authenticated User ID
  
// console.log(user);

      // ✅ Users Income
      const totalIncome = await Income.sum("comm");
  

    //   console.log(totalIncome);
      const totalWithdraw = await Withdraw.sum("amount");
    
  
      // ✅ Available Balance Calculation
      const balance = (totalIncome || 0) - (totalWithdraw || 0);

      const withdraw  = await  Withdraw.sum("amount", { where: {  status: { [Op.ne]: "Failed" }
        }
    }); 


      res.json({ available_balance: balance ,withdraw :withdraw,totalIncome: totalIncome});
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };



module.exports = { getUserDetails ,getAvailableBalance};