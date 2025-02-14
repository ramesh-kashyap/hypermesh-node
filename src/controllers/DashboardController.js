const { User } = require("../models"); // Import User model

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

module.exports = { getUserDetails };