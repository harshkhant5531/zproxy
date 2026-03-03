const prisma = require("./backend/prisma");
const bcrypt = require("bcryptjs");

async function checkLogin() {
    try {
        const email = "admin@aura.edu";
        const password = "admin123";

        const user = await prisma.users.findFirst({
            where: { email },
        });

        if (!user) {
            console.log("❌ User not found:", email);
            return;
        }

        console.log("✅ User found:", user.email);
        console.log("User Status:", user.status);
        console.log("User Role:", user.role);
        console.log("Password Hash in DB:", user.passwordHash);

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (isMatch) {
            console.log("✅ Password matches!");
        } else {
            console.log("❌ Password DOES NOT match!");

            // Try comparing with a newly generated hash to see if there's any weirdness
            const newHash = await bcrypt.hash(password, 10);
            console.log("Newly generated hash for 'admin123':", newHash);
            const isMatchNew = await bcrypt.compare(password, newHash);
            console.log("Does new password match new hash?", isMatchNew);
        }

    } catch (error) {
        console.error("Error checking login:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLogin();
