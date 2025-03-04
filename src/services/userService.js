const { User, Investment,Income } = require("../models"); // Adjust path as needed
const { Op } = require("sequelize"); // ✅ Import Sequelize Operators
// Get user's VIP level
async function getVip(userId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) return 0;

        const levelTeam = await myLevelTeamCount(user.id);
        const genTeam = {};
        
        for (let i = 1; i <= 3; i++) {
            genTeam[i] = levelTeam[i] || [];
        }

        // Helper function to get active users with a minimum package
        async function countActiveUsers(team, packageAmount) {
            return await User.count({
                where: {
                    id: team,
                    active_status: "Active",
                    userbalance: { [Op.gte]: packageAmount }
                }
            });
        }

        const genTeamCounts = {};
        for (const amount of [100,500]) {
            genTeamCounts[amount] = {
                gen1: await countActiveUsers(genTeam[1], amount),
                gen2_3: await countActiveUsers(genTeam[2], amount) + await countActiveUsers(genTeam[3], amount)
            };
        }

        const userBalance = await getBalance(userId);
        let vipLevel = 0;
        if(userBalance>=50)
        {
             vipLevel = 1;
        }
        if (userBalance >= 500 && genTeamCounts[100].gen1 >= 3 && genTeamCounts[100].gen2_3 >= 5) {
            vipLevel = 2;
        }
        if (userBalance >= 1000 && genTeamCounts[100].gen1 >= 6 && genTeamCounts[100].gen2_3 >= 20) {
            vipLevel = 2;
        }
        if (userBalance >= 3000 && genTeamCounts[500].gen1 >= 15 && genTeamCounts[200].gen2_3 >= 35) {
            vipLevel = 3;
        }
        if (userBalance >= 5000 && genTeamCounts[500].gen1 >= 25 && genTeamCounts[500].gen2_3 >= 70) {
            vipLevel = 4;
        }
        if (userBalance >= 10000 && genTeamCounts[500].gen1 >= 35 && genTeamCounts[500].gen2_3 >= 180) {
            vipLevel = 4;
        }

        return vipLevel;
    } catch (error) {
        console.error("Error in getVip:", error);
        return 0;
    }
}

// Get user's level team count (downline up to 'level' generations)
async function myLevelTeamCount(userId, level = 3) {
    try {
        let currentLevelUsers = [userId];
        let team = {};
        for (let i = 1; i <= level; i++) {
            const downline = await User.findAll({
                attributes: ["id"],
                where: { sponsor: currentLevelUsers }
            });

            if (downline.length === 0) break;
            currentLevelUsers = downline.map(user => user.id);
            team[i] = currentLevelUsers;
        }

        return team;
    } catch (error) {
        console.error("Error in myLevelTeamCount:", error);
        return {};
    }
}

// Get user's balance (active investments)
async function getBalance(userId) {
    try {
        const user = await User.findByPk(userId);
        return user.userbalance || 0;
    } catch (error) {
        console.error("Error in getBalance:", error);
        return 0;
    }
}

async function getPercentage(vipLevel) {
    try {
        const percentageMap = {
            1: 1,
            2: 1.5,
            3: 2,
            4: 2.5,
            5: 3,
            6: 3.5
        };
        return percentageMap[vipLevel] || 0;
    } catch (error) {
        console.error("Error in getBalance:", error);
        return 0;
    }
}

async function addLevelIncome(userId, amount) {
    try {
        const user = await User.findOne({ where: { id: userId } });
        if (!user) return false;

        let userMid = user.id;
        let sponsorId;
        let cnt = 1;
        let baseAmount = amount / 100;
        const rname = user.username;
        const fullname = user.name;

        while (userMid && userMid !== 1) {
            const sponsorUser = await User.findOne({ where: { id: userMid } });
            if (!sponsorUser) break;
            sponsorId = sponsorUser.sponsor;
            let sponsorStatus = "Pending";
            let vipLevel = 0;

            if (sponsorId) {
                const sponsorDetails = await User.findOne({ where: { id: sponsorId } });
                if (sponsorDetails) {
                    sponsorStatus = sponsorDetails.active_status;
                    vipLevel = await getVip(sponsorDetails.id);
                }
            }

            // Define multipliers for different VIP levels
            const multipliers = {
                1: [7, 5, 1, 0 , 0],
                2: [8, 6, 2, 1 ,0],
                3: [10, 6, 2 ,1 , 1 ],
                4: [12, 8, 3, 2 , 1],
                5: [15, 8, 3, 2 , 1],
            };
            const currentMultipliers = multipliers[vipLevel] || [7, 5, 1, 0 , 0]; // Default to VIP 1 multipliers

            let commission = 0;
            if (sponsorStatus === "Active" && vipLevel >= 1) {
                if (cnt === 1) commission = baseAmount * currentMultipliers[0];
                if (cnt === 2) commission = baseAmount * currentMultipliers[1];
                if (cnt === 3) commission = baseAmount * currentMultipliers[2];
                if (cnt === 4) commission = baseAmount * currentMultipliers[3];
                if (cnt === 5) commission = baseAmount * currentMultipliers[4];
            }
            if (sponsorId && cnt <= 5 && commission > 0) {
                // Insert income record
                await Income.create({
                    user_id: sponsorId,
                    user_id_fk: sponsorUser.username,
                    amt: amount,
                    comm: commission,
                    remarks: "Level Income",
                    level: cnt,
                    rname,
                    fullname,
                    ttime: new Date(),
                });

                // Update user balance
                await User.update(
                    { userbalance: sponsorUser.userbalance + commission },
                    { where: { id: sponsorId } }
                );
            }

            userMid = sponsorId;
            cnt++;
        }

        return true;
    } catch (error) {
        console.error("Error in addLevelIncome:", error);
        return false;
    }
}


module.exports = { getVip, myLevelTeamCount, getBalance,getPercentage,addLevelIncome };