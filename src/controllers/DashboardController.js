const { User } = require("../models"); // Import User model
const { Income, Withdraw } = require("../models");
const { Op } = require("sequelize");

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