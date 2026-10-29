// Sets a customer account's password from the command line. Meant for the shared demo shopper, whose
// password can't be changed in the app (so visitors can't lock each other out). Also signs out every
// session on that account, like a normal password change.
//
//   node scripts/set-password.js --email demo@forever-store.example --password DemoShop2027
import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import { DEFAULT_DB_NAME } from "../config/mongodb.js";
import { isStrongPassword } from "../controllers/userController.js";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const main = async () => {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password");
  if (!email || !password) throw new Error("Usage: node scripts/set-password.js --email <email> --password <new password>");
  if (!isStrongPassword(password)) throw new Error("Password needs 8+ characters with an uppercase letter, a lowercase letter and a number");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || DEFAULT_DB_NAME });
  const hash = await bcrypt.hash(password, 10);
  const res = await userModel.updateOne(
    { email },
    { $set: { password: hash, passwordChangedAt: Date.now() } },
    { collation: { locale: "en", strength: 2 } }
  );
  console.log(res.matchedCount ? `Password updated for ${email}.` : `No account found for ${email}.`);
};

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
