import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../db/pool'

dotenv.config()

async function createAdminUser() {
    const email = 'marc.paelinck@proton.me' // ← change this
    const password = 'klm94565' // ← change this
    const role = 'admin'

    try {
        // Check if user already exists
        const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email])

        if ((existing as RowDataPacket[])[0]) {
            console.log(`User ${email} already exists, skipping.`)
            process.exit(0)
        }

        const password_hash = await bcrypt.hash(password, 12)

        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
            [email, password_hash, role]
        )

        const insertId = (result as ResultSetHeader).insertId

        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, email, role FROM users WHERE id = ?', [insertId])

        console.log('Admin user created:', (rows as RowDataPacket[])[0])
        process.exit(0)
    } catch (err) {
        console.error('Error creating admin user:', err)
        process.exit(1)
    }
}

createAdminUser()
