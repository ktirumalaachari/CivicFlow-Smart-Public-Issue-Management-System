import * as db from "../middleware/db.ts";
import bcrypt from "bcryptjs";

export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: "Citizen" | "Officer" | "Administrator" | "ADMIN";
  status: "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED";
  department?: string;
  avatar?: string;
  googleId?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

function mapUser(row: any): User | null {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    phone: row.phone,
    role: row.role,
    status: row.status || "ACTIVE",
    department: row.department,
    avatar: row.avatar,
    googleId: row.googleId || row.google_id || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  };
}

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const rows = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  static async findById(id: string): Promise<User | null> {
    const rows = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  static async findByRole(role: string): Promise<User[]> {
    const rows = await db.query("SELECT * FROM users WHERE role = ?", [role]);
    return rows.map(mapUser).filter((u): u is User => u !== null);
  }

  static async create(user: Partial<User>): Promise<string> {
    let passwordHash = "";

    if (user.password) {
      passwordHash = await bcrypt.hash(user.password, 10);
    } else {
      passwordHash = await bcrypt.hash(
        "OAuthAccountNoPassword" + Math.random(),
        10,
      );
    }

    const status =
      user.status || (user.role === "Officer" ? "PENDING" : "ACTIVE");

    const result = await db.query(
      `INSERT INTO users
    (name, email, password, phone, role, department, avatar, status, googleId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.name,
        user.email?.toLowerCase(),
        passwordHash,
        user.phone || null,
        user.role || "Citizen",
        user.department || null,
        user.avatar || null,
        status,
        user.googleId || null,
      ],
    );

    return String(result.insertId);
  }

  static async updatePassword(
    id: string,
    plainTextPassword: string,
  ): Promise<boolean> {
    const passwordHash = await bcrypt.hash(plainTextPassword, 10);
    const result = await db.query(
      "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [passwordHash, id],
    );
    return result.affectedRows > 0;
  }

  static async updateStatus(
    id: string,
    status: "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED",
  ): Promise<boolean> {
    const result = await db.query(
      "UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  }

  static async getAll(): Promise<User[]> {
    const rows = await db.query("SELECT * FROM users");
    return rows.map(mapUser).filter((u): u is User => u !== null);
  }
  static async updateProfile(
    id: string,
    name: string,
    phone: string,
  ): Promise<boolean> {
    const result = await db.query(
      "UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, phone, id],
    );
    return result.affectedRows > 0;
  }
}
