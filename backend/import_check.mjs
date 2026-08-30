// Verifies every module loads without runtime errors (import graph check),
// without needing a live MongoDB connection.
process.env.JWT_SECRET = "test_secret";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test";

const files = [
  "./models/User.js",
  "./models/Landlord.js",
  "./models/Property.js",
  "./models/RentalRelationship.js",
  "./models/Review.js",
  "./middleware/auth.js",
  "./middleware/errorHandler.js",
  "./controllers/authController.js",
  "./controllers/propertyController.js",
  "./controllers/landlordController.js",
  "./controllers/reviewController.js",
  "./controllers/adminController.js",
  "./routes/authRoutes.js",
  "./routes/propertyRoutes.js",
  "./routes/landlordRoutes.js",
  "./routes/reviewRoutes.js",
  "./routes/adminRoutes.js",
  "./utils/generateToken.js",
];

let failed = false;
for (const f of files) {
  try {
    await import(f);
    console.log("OK  ", f);
  } catch (e) {
    failed = true;
    console.log("FAIL", f, "->", e.message);
  }
}
process.exit(failed ? 1 : 0);
