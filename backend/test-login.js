const bcrypt = require("bcryptjs");
const prisma = require("./prisma");

const testLogin = async () => {
  console.time("Total login time");

  // Test 1: Find user
  console.time("Find user");
  const user = await prisma.users.findFirst({
    where: { email: "admin@aura.edu" },
    include: {
      adminProfile: true,
      facultyProfile: true,
      studentProfile: true,
    },
  });
  console.timeEnd("Find user");
  console.log("User found:", !!user);

  // Test 2: Compare password
  if (user) {
    console.time("Password comparison");
    const isValid = await bcrypt.compare("admin123", user.passwordHash);
    console.timeEnd("Password comparison");
    console.log("Password valid:", isValid);
  }

  console.timeEnd("Total login time");
};

testLogin()
  .then(() => {
    console.log("Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
