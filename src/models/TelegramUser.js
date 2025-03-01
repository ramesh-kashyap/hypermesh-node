const { DataTypes } = require("sequelize");
const sequelize = require("../config/connectDB");

const TelegramUser = sequelize.define("TelegramUser", {
    telegram_id: { type: DataTypes.STRING, allowNull: false, unique: true },
    tusername: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    tname: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    tlastname: { type: DataTypes.STRING, allowNull: true }, // Stores last trade timestamp
    balance: { type: DataTypes.FLOAT, allowNull: true }, // Stores last trade timestamp
    todayroi: { type: DataTypes.FLOAT, allowNull: true }, // Stores last trade timestamp
    total_reward: { type: DataTypes.FLOAT, allowNull: true }, // Stores last trade timestamp
    lastTrade: { type: DataTypes.DATE, allowNull: true }, // Stores last trade timestamp
}, {
    tableName: "telegram_users",
    timestamps: false,
});

module.exports = TelegramUser;