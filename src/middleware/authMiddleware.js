const jwt = require("jsonwebtoken");
const {User} = require("../models");

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]; // "Bearer TOKEN"
        console.log('raju');
        if (!token) {
            return res.status(200).json({ error: "Unauthorized: Token missing" , redirect: true });
        }
        // Token Verify Karna
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // User Fetch Karna
        // console.log(decoded);
        const user = await User.findByPk(decoded.userId);
        console.log(user);

        if (!user) {
            return res.status(200).json({ error: "Unauthorized: User not found", redirect: true });
        }
//    console.log(user);
        req.user = user; // ✅ `req.user` me login user store karein
        
        next();
    } catch (error) {
        return res.status(200).json({ error: "Invalid token", details: error.message ,redirect: true });
    }
};

module.exports = authMiddleware;
