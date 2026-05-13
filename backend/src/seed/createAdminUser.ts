import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pool from "../db/pool";

dotenv.config();

async function createAdminUser() {
  const email = "marc.paelinck@proton.me"; // ← change this
  const password = "klm94565"; // ← change this
  const role = "admin";

  try {
    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existing.rows[0]) {
      console.log(`User ${email} already exists, skipping.`);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, password_hash, role],
    );

    console.log("Admin user created:", result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin user:", err);
    process.exit(1);
  }
}

createAdminUser();
