const { User } = require("../models"); // Import User model
const { Income, Withdraw } = require("../models");
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
      const userId = req.user.id; // Authenticated User ID
  
      // ✅ Users Income
      const totalIncome = await Income.sum("comm", { where: { user_id: userId } });
  
      // ✅ Withdraw Amount
      const totalWithdraw = await Withdraw.sum("amount", { where: { user_id: userId } });
  
      // ✅ Available Balance Calculation
      const balance = (totalIncome || 0) - (totalWithdraw || 0);
  
      res.json({ available_balance: balance });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };



module.exports = { getUserDetails ,getAvailableBalance};