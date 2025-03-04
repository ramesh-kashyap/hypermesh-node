const express = require('express');
let router = express.Router();
const AuthController = require("../controllers/AuthController");
const IncomeController = require("../controllers/incomeController");
const TelegramController = require("../controllers/TelegramController");
const DashboardController = require("../controllers/DashboardController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT Auth Middleware
const telegramAuthMiddleware = require("../middleware/telegramAuthMiddleware"); // JWT Auth Middleware
const passport = require('passport');
const googleController = require('../controllers/googleController');
const teamController = require('../controllers/teamController');
const InvestController = require('../controllers/InvestController');
const GraphController = require('../controllers/GraphController');

const { getVip } = require("../services/userService");




router.post('/google', googleController.verifyGoogleToken);
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);


router.get("/direct-income", authMiddleware, IncomeController.getDirectIncome);
router.get("/level-income", authMiddleware, IncomeController.getLevelIncome);
router.get("/Roi-income", authMiddleware, IncomeController.getRoiIncome);
router.post("/team", authMiddleware ,teamController.getTeam);
router.get('/list', authMiddleware, teamController.listUsers);
router.get("/userinfo", authMiddleware, DashboardController.getUserDetails);
router.get('/profile', authMiddleware, AuthController.getUserProfile);
router.put('/Update-Profile', authMiddleware, AuthController.updateUserProfile);
router.post('/send-code', DashboardController.sendCode);
router.post('/reset-password',  DashboardController.resetPassword);
router.get("/available-balance", authMiddleware, DashboardController.getAvailableBalance);
router.post("/connect-telegram", authMiddleware, DashboardController.connectTelegram);

router.get("/deposit-History", authMiddleware, InvestController.getHistory);
router.post("/recharge", authMiddleware, InvestController.generateWallet);
router.get("/telegram-history", authMiddleware, TelegramController.getTelegramHistory);
router.post("/generate-wallet", authMiddleware, InvestController.generateWallet);
router.post("/recharge", authMiddleware, InvestController.generateWallet);
router.get("/roi", authMiddleware, GraphController.getRoi);










// telegram api 
router.post('/telegram-login', AuthController.loginWithTelegram);
router.post('/telegram-user-detail', TelegramController.getUserByTelegramId);
router.post('/start-trade', telegramAuthMiddleware,TelegramController.startTrade);
router.post('/get-last-trade',telegramAuthMiddleware, TelegramController.getLastTrade);
router.post('/claim-reward',telegramAuthMiddleware, TelegramController.claimReward);
router.get('/fetch-points',telegramAuthMiddleware, TelegramController.fetchPoints);
router.post('/update-today-roi',telegramAuthMiddleware, TelegramController.updateTodayRoi);
router.get('/get-mining-bonus',telegramAuthMiddleware, TelegramController.getMiningBonus);
router.post('/getTasks',telegramAuthMiddleware, TelegramController.getTasks);
router.get('/get-user-balance',telegramAuthMiddleware, TelegramController.getUserBalance);
router.post('/startTask',telegramAuthMiddleware, TelegramController.startTask);
router.post('/claimTask',telegramAuthMiddleware, TelegramController.claimTask);
router.get('/getReferral',telegramAuthMiddleware, TelegramController.getReferral);


router.get("/vip/:userId", async (req, res) => {
  const { userId } = req.params;
  const vipLevel = await getVip(userId);
  res.json({ userId, vipLevel });
});

// Mount the router on /api/auth so that /register becomes /api/auth/register
const initWebRouter = (app) => {
    app.use('/api/auth', router);
  };

  module.exports = initWebRouter;
