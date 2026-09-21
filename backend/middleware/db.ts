import mysql, { Pool } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Setup paths
const DB_DIR = path.join(process.cwd(), 'backend', 'database');
const STORE_FILE = path.join(DB_DIR, 'data_store.json');

// Interface for Fallback Database State
export interface SchemaState {
  users: any[];
  complaints: any[];
  notifications: any[];
  departments: any[];
  categories: any[];
  announcements: any[];
  complaint_tracking: any[];
}

const DEFAULT_DEPARTMENTS = [
  { id: 1, name: 'Water', head: 'Rajesh Kumar', active: 1 },
  { id: 2, name: 'Road', head: 'Priya Sharma', active: 1 },
  { id: 3, name: 'Waste', head: 'Vikram Singh', active: 1 },
  { id: 4, name: 'Electricity', head: 'Amit Patel', active: 1 },
  { id: 5, name: 'Sanitation', head: 'Sanjay Dutt', active: 1 }
];

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Water', description: 'Pipeline leakages, sewage overflows, dirty water supply', active: 1 },
  { id: 2, name: 'Road', description: 'Potholes, broken footpaths, blocked roads, road repairs', active: 1 },
  { id: 3, name: 'Waste', description: 'Overflowing garbage bin, unscheduled garbage collection, debris disposal', active: 1 },
  { id: 4, name: 'Electricity', description: 'Power cuts, flickering streetlights, dangerous wire hanging', active: 1 },
  { id: 5, name: 'Sanitation', description: 'Public toilet cleanliness, open gutters, pest control spraying', active: 1 },
  { id: 6, name: 'Traffic', description: 'Malfunctioning traffic signals, illegal parking, missing signs', active: 1 },
  { id: 7, name: 'Health', description: 'Epidemic outbreak alerts, stray animals issue, food safety issues', active: 1 },
  { id: 8, name: 'Other', description: 'Miscellaneous civic issues and generic grievances', active: 1 }
];

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Monsoon Cleanliness Drive Initiated',
    content: 'We have mobilized additional municipal cleaning squads across all blocks to clean sewers and clear storm water drains on absolute priority.',
    created_by: 'System Admin',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    title: 'CivicFlow Integration with WhatsApp Helpline',
    content: 'Citizens will soon be able to register complaints and receive instant tracking updates updates directly through our upcoming verification bot.',
    created_by: 'System Admin',
    created_at: new Date().toISOString()
  }
];

let mysqlPool: Pool | null = null;
let useFallback = false;

// Default Mock Seed Data
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

const DEFAULT_USERS = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@civicflow.com',
    password: DEFAULT_PASSWORD_HASH,
    phone: '9876543210',
    role: 'Administrator',
    status: 'ACTIVE',
    googleId: null,
    department: null,
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Officer Rajesh',
    email: 'officer.water@civicflow.com',
    password: DEFAULT_PASSWORD_HASH,
    phone: '9876543211',
    role: 'Officer',
    status: 'ACTIVE',
    googleId: null,
    department: 'Water',
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Officer Priya',
    email: 'officer.road@civicflow.com',
    password: DEFAULT_PASSWORD_HASH,
    phone: '9876543212',
    role: 'Officer',
    status: 'ACTIVE',
    googleId: null,
    department: 'Road',
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Officer Vikram',
    email: 'officer.waste@civicflow.com',
    password: DEFAULT_PASSWORD_HASH,
    phone: '9876543213',
    role: 'Officer',
    status: 'ACTIVE',
    googleId: null,
    department: 'Waste',
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Officer Amit',
    email: 'officer.electricity@civicflow.com',
    password: DEFAULT_PASSWORD_HASH,
    phone: '9876543214',
    role: 'Officer',
    status: 'ACTIVE',
    googleId: null,
    department: 'Electricity',
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    name: 'Anil Kumar',
    email: 'citizen@civicflow.com',
    password: DEFAULT_PASSWORD_HASH,
    phone: '9876543215',
    role: 'Citizen',
    status: 'ACTIVE',
    googleId: null,
    department: null,
    avatar: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_COMPLAINTS = [
  {
    id: 1,
    tracking_id: 'CF-2026-000101',
    title: 'Severe Water Leakage',
    description: 'Main pipeline has burst near Maple Street, causing water logging and low pressure in residential areas.',
    category: 'Water',
    priority: 'High',
    location_lat: 12.9716,
    location_lng: 77.5946,
    location_name: 'Maple Street Crossing, Sector 4',
    image_url: null,
    status: 'In Progress',
    citizen_id: 6,
    officer_id: 2,
    resolution_notes: null,
    resolution_image: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    tracking_id: 'CF-2026-000102',
    title: 'Damaged Pothole on Highway',
    description: 'Large, dangerous pothole right in the middle of the dual-carriageway. Needs urgent patching as it poses severe risk.',
    category: 'Road',
    priority: 'Critical',
    location_lat: 12.9740,
    location_lng: 77.6010,
    location_name: 'Outer Ring Road, Block B',
    image_url: null,
    status: 'Assigned',
    citizen_id: 6,
    officer_id: 3,
    resolution_notes: null,
    resolution_image: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    tracking_id: 'CF-2026-000103',
    title: 'Streetlights Flickering and Offline',
    description: 'Several streetlights are completely out, creating safety issues for pedestrian traffic after dark.',
    category: 'Electricity',
    priority: 'Medium',
    location_lat: 12.9650,
    location_lng: 77.5890,
    location_name: 'Victoria Lane',
    image_url: null,
    status: 'Resolved',
    citizen_id: 6,
    officer_id: 5,
    resolution_notes: 'Replaced 4 burnt-out LED bulbs and re-wired the light sensor pole.',
    resolution_image: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    tracking_id: 'CF-2026-000104',
    title: 'Overflowing Garbage Bin',
    description: 'Public garbage dump has not been cleared for three days. Foul smell and stray dogs gathered.',
    category: 'Waste',
    priority: 'Medium',
    location_lat: 12.9800,
    location_lng: 77.6200,
    location_name: 'Greenpark Avenue Market',
    image_url: null,
    status: 'Submitted',
    citizen_id: 6,
    officer_id: null,
    resolution_notes: null,
    resolution_image: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: 1,
    user_id: 6,
    title: 'Complaint Registered Successfully',
    message: 'Your complaint CF-2026-000104 regarding "Overflowing Garbage Bin" has been submitted.',
    is_read: 0,
    created_at: new Date().toISOString()
  }
];

// Helper to load fallback database
export function loadFallbackStore(): SchemaState {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const defaultState: SchemaState = {
    users: DEFAULT_USERS,
    complaints: DEFAULT_COMPLAINTS,
    notifications: DEFAULT_NOTIFICATIONS,
    departments: DEFAULT_DEPARTMENTS,
    categories: DEFAULT_CATEGORIES,
    announcements: DEFAULT_ANNOUNCEMENTS,
    complaint_tracking: []
  };

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
    return defaultState;
  }

  try {
    const rawData = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(rawData);
    
    // Auto-backfill missing keys to prevent crashes on pre-existing data stores
    let updated = false;
    if (!parsed.departments) { parsed.departments = DEFAULT_DEPARTMENTS; updated = true; }
    if (!parsed.categories) { parsed.categories = DEFAULT_CATEGORIES; updated = true; }
    if (!parsed.announcements) { parsed.announcements = DEFAULT_ANNOUNCEMENTS; updated = true; }
    if (!parsed.users) { parsed.users = DEFAULT_USERS; updated = true; }
    if (!parsed.complaints) { parsed.complaints = DEFAULT_COMPLAINTS; updated = true; }
    if (!parsed.notifications) { parsed.notifications = DEFAULT_NOTIFICATIONS; updated = true; }

    // Set default is_active if user doesn't have it
    parsed.users.forEach((u: any) => {
      if (u.is_active === undefined) {
        u.is_active = u.status === 'SUSPENDED' ? 0 : 1;
        updated = true;
      }
      if (u.status === undefined) {
        u.status = u.is_active === 0 ? 'SUSPENDED' : 'ACTIVE';
        updated = true;
      }
      if (u.googleId === undefined) {
        u.googleId = u.google_id || null;
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }

    return parsed as SchemaState;
  } catch (error) {
    console.error('Error reading fallback JSON store, resetting to seed data:', error);
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
    return defaultState;
  }
}

// Helper to save fallback database
export function saveFallbackStore(state: SchemaState) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write to local fallback database file:', error);
  }
}

// Initialize Database connection (or fallback)
export async function initializeDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'civicflow';
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  console.log(`[CivicFlow DB] Attempting to initialize connection pool for ${user}@${host}:${port}/${database}...`);

  try {
    // Attempt standard MySQL pool initialization
    mysqlPool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000, // Quick timeout so we fallback swiftly
    });

    // Test the connection
    const conn = await mysqlPool.getConnection();
    console.log('[CivicFlow DB] SUCCESS: Connected to MySQL database successfully.');
    await conn.query(`
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255),
    role ENUM('Citizen','Officer','Administrator') NOT NULL DEFAULT 'Citizen',
    department VARCHAR(100),
    googleId VARCHAR(255),
    avatar TEXT,
    status ENUM('ACTIVE','PENDING','REJECTED','SUSPENDED') DEFAULT 'ACTIVE',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
`);
    // Automatically apply required database schema upgrades for Status and GoogleId
    try {
      const [columns]: any = await conn.query('SHOW COLUMNS FROM `users`');
      const columnNames = columns.map((col: any) => col.Field);
      
      if (!columnNames.includes('googleId') && !columnNames.includes('google_id')) {
        console.log('[CivicFlow DB Migration] Adding googleId column to users table...');
        await conn.query('ALTER TABLE `users` ADD COLUMN `googleId` VARCHAR(255) DEFAULT NULL');
      }
      
      if (!columnNames.includes('status')) {
        console.log('[CivicFlow DB Migration] Adding status column to users table...');
        await conn.query("ALTER TABLE `users` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'");
      }
      
      const [compColumns]: any = await conn.query('SHOW COLUMNS FROM `complaints`');
      const compColumnNames = compColumns.map((col: any) => col.Field);
      if (!compColumnNames.includes('supports')) {
        console.log('[CivicFlow DB Migration] Adding supports column to complaints table...');
        await conn.query("ALTER TABLE `complaints` ADD COLUMN `supports` INT NOT NULL DEFAULT 0");
      }
      
      // Ensure complaint_tracking table exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`complaint_tracking\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`complaint_id\` INT NOT NULL,
          \`status\` VARCHAR(50) NOT NULL,
          \`officer_name\` VARCHAR(255) DEFAULT NULL,
          \`remarks\` TEXT DEFAULT NULL,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (\`complaint_id\`) REFERENCES \`complaints\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      console.log('[CivicFlow DB Migration] Database schema check completed successfully.');
    } catch (migErr: any) {
      console.warn('[CivicFlow DB Migration] Schema update check warning:', migErr.message);
    }

    conn.release();
    useFallback = false;
  } catch (err: any) {
    console.warn(`[CivicFlow DB] WARNING: Could not connect to MySQL server (${err.message}).`);
    console.warn('[CivicFlow DB] STATUS: Switching automatically to high-performance local SQLite-JSON Fallback Engine.');
    useFallback = true;
    loadFallbackStore(); // Seed file if needed
  }
}

// Global query dispatcher
export async function query(sql: string, params: any[] = []): Promise<any> {
  if (!useFallback && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query(sql, params);
      return rows;
    } catch (mysqlErr: any) {
      console.error('[CivicFlow MySQL Error] Query failed, falling back to JSON:', mysqlErr.message);
      // fallback dynamically
      return executeLocalQuery(sql, params);
    }
  } else {
    return executeLocalQuery(sql, params);
  }
}

// Execute local mock query engine on the JSON file
function executeLocalQuery(sql: string, params: any[]): any {
  const normalizedSql = sql.trim().replace(/\s+/g, ' ');
  const store = loadFallbackStore();

  // 1. SELECT * FROM users WHERE email = ?
  if (normalizedSql.match(/SELECT \* FROM `?users`? WHERE `?email`?\s*=\s*\?/i)) {
    const email = params[0]?.toLowerCase();
    const user = store.users.find(u => u.email.toLowerCase() === email);
    return user ? [user] : [];
  }

  // 2. SELECT * FROM users WHERE id = ?
  if (normalizedSql.match(/SELECT \* FROM `?users`? WHERE `?id`?\s*=\s*\?/i)) {
    const id = Number(params[0]);
    const user = store.users.find(u => u.id === id);
    return user ? [user] : [];
  }

  // 3. SELECT * FROM users (e.g. for Admin lists)
  if (normalizedSql.match(/SELECT \* FROM `?users`?$/i) || normalizedSql.match(/SELECT \* FROM `?users`? WHERE role = \?/i)) {
    if (params.length > 0) {
      const role = params[0];
      return store.users.filter(u => u.role === role);
    }
    return store.users;
  }

  // 4. INSERT INTO users
  if (normalizedSql.match(/INSERT INTO `?users`?/i)) {
    // Columns: name, email, password, phone, role, department, avatar, status, googleId
    const newUser = {
      id: store.users.length > 0 ? Math.max(...store.users.map(u => u.id)) + 1 : 1,
      name: params[0],
      email: params[1],
      password: params[2],
      phone: params[3] || null,
      role: params[4] || 'Citizen',
      department: params[5] || null,
      avatar: params[6] || null,
      status: params[7] || (params[4] === 'Officer' ? 'PENDING' : 'ACTIVE'),
      googleId: params[8] || null,
      is_active: (params[7] === 'SUSPENDED' || params[7] === 'PENDING') ? 0 : 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.users.push(newUser);
    saveFallbackStore(store);
    return { insertId: newUser.id, affectedRows: 1 };
  }

  // 5. UPDATE users
  if (normalizedSql.match(/UPDATE `?users`?/i)) {
    // Handle password update, profile update, status update, etc.
    if (normalizedSql.includes('status = ?')) {
      const status = params[0];
      const id = Number(params[1]);
      const userIndex = store.users.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        store.users[userIndex].status = status;
        store.users[userIndex].is_active = status === 'ACTIVE' ? 1 : 0;
        store.users[userIndex].updated_at = new Date().toISOString();
        saveFallbackStore(store);
        return { affectedRows: 1 };
      }
    } else if (normalizedSql.includes('password = ?')) {
      // UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      const password = params[0];
      const id = Number(params[1]);
      const userIndex = store.users.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        store.users[userIndex].password = password;
        store.users[userIndex].updated_at = new Date().toISOString();
        saveFallbackStore(store);
        return { affectedRows: 1 };
      }
    } else if (normalizedSql.includes('name = ?')) {
      // UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      const name = params[0];
      const phone = params[1];
      const id = Number(params[2]);
      const userIndex = store.users.findIndex(u => u.id === id);
      if (userIndex !== -1) {
        store.users[userIndex].name = name;
        store.users[userIndex].phone = phone;
        store.users[userIndex].updated_at = new Date().toISOString();
        saveFallbackStore(store);
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // 6. SELECT * FROM complaints ORDER BY ...
  if (normalizedSql.match(/SELECT \* FROM `?complaints`?/i) && !normalizedSql.includes('WHERE')) {
    // Populate citizens and officers for nested displays in frontend
    return store.complaints.map(c => enrichComplaint(c, store));
  }

  // 7. SELECT * FROM complaints WHERE citizen_id = ?
  if (normalizedSql.match(/SELECT \* FROM `?complaints`? WHERE `?citizen_id`?\s*=\s*\?/i)) {
    const citizenId = Number(params[0]);
    const list = store.complaints.filter(c => c.citizen_id === citizenId);
    return list.map(c => enrichComplaint(c, store));
  }

  // 8. SELECT * FROM complaints WHERE officer_id = ?
  if (normalizedSql.match(/SELECT \* FROM `?complaints`? WHERE `?officer_id`?\s*=\s*\?/i)) {
    const officerId = Number(params[0]);
    const list = store.complaints.filter(c => c.officer_id === officerId);
    return list.map(c => enrichComplaint(c, store));
  }

  // 9. SELECT * FROM complaints WHERE tracking_id = ?
  if (normalizedSql.match(/SELECT \* FROM `?complaints`? WHERE `?tracking_id`?\s*=\s*\?/i)) {
    const trackingId = params[0];
    const comp = store.complaints.find(c => c.tracking_id.toUpperCase() === trackingId.toUpperCase());
    return comp ? [enrichComplaint(comp, store)] : [];
  }

  // 10. INSERT INTO complaints
  if (normalizedSql.match(/INSERT INTO `?complaints`?/i)) {
    // tracking_id, title, description, category, priority, location_lat, location_lng, location_name, image_url, citizen_id
    const newComp = {
      id: store.complaints.length > 0 ? Math.max(...store.complaints.map(c => c.id)) + 1 : 1,
      tracking_id: params[0],
      title: params[1],
      description: params[2],
      category: params[3],
      priority: params[4],
      location_lat: params[5] ? Number(params[5]) : null,
      location_lng: params[6] ? Number(params[6]) : null,
      location_name: params[7] || null,
      image_url: params[8] || null,
      status: 'Submitted',
      citizen_id: Number(params[9]),
      officer_id: null,
      resolution_notes: null,
      resolution_image: null,
      supports: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.complaints.push(newComp);

    saveFallbackStore(store);
    return { insertId: newComp.id, affectedRows: 1 };
  }

  // 11. UPDATE complaints (e.g., status, assigning officer, resolution notes)
  if (normalizedSql.match(/UPDATE `?complaints`?/i)) {
    // Handle specific fields
    if (normalizedSql.includes('officer_id = ?') && normalizedSql.includes('status = ?') && !normalizedSql.includes('resolution_notes')) {
      // Admin Assigning Officer: UPDATE complaints SET officer_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      const officerId = params[0] ? Number(params[0]) : null;
      const status = params[1];
      const id = Number(params[2]);
      const idx = store.complaints.findIndex(c => c.id === id);
      if (idx !== -1) {
        store.complaints[idx].officer_id = officerId;
        store.complaints[idx].status = status;
        store.complaints[idx].updated_at = new Date().toISOString();

        saveFallbackStore(store);
        return { affectedRows: 1 };
      }
    } else if (normalizedSql.includes('status = ?') && normalizedSql.includes('resolution_notes = ?')) {
      // Officer resolving complaint: UPDATE complaints SET status = ?, resolution_notes = ?, resolution_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      const status = params[0];
      const notes = params[1];
      const image = params[2];
      const id = Number(params[3]);
      const idx = store.complaints.findIndex(c => c.id === id);
      if (idx !== -1) {
        store.complaints[idx].status = status;
        store.complaints[idx].resolution_notes = notes;
        store.complaints[idx].resolution_image = image;
        store.complaints[idx].updated_at = new Date().toISOString();

        saveFallbackStore(store);
        return { affectedRows: 1 };
      }
    } else if (normalizedSql.includes('status = ?') && !normalizedSql.includes('resolution_notes')) {
      // Generic status update
      const status = params[0];
      const id = Number(params[1]);
      const idx = store.complaints.findIndex(c => c.id === id);
      if (idx !== -1) {
        store.complaints[idx].status = status;
        store.complaints[idx].updated_at = new Date().toISOString();

        saveFallbackStore(store);
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // 12. SELECT * FROM notifications WHERE user_id = ?
  if (normalizedSql.match(/SELECT \* FROM `?notifications`? WHERE `?user_id`?\s*=\s*\?/i)) {
    const userId = Number(params[0]);
    return store.notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // 13. UPDATE notifications SET is_read = 1
  if (normalizedSql.match(/UPDATE `?notifications`? SET `?is_read`?\s*=\s*1\s*WHERE `?user_id`?\s*=\s*\?/i)) {
    const userId = Number(params[0]);
    store.notifications.forEach((n, idx) => {
      if (n.user_id === userId) {
        store.notifications[idx].is_read = 1;
      }
    });
    saveFallbackStore(store);
    return { affectedRows: 1 };
  }

  // If we reach here, print warning and return appropriate defaults for counts or arrays
  console.warn(`[CivicFlow Local DB] Query pattern not explicitly matched in local engine: "${normalizedSql}"`);
  return [];
}

// Helper to join user details on complaints in fallback mode
function enrichComplaint(complaint: any, store: SchemaState) {
  const citizen = store.users.find(u => u.id === complaint.citizen_id);
  const officer = complaint.officer_id ? store.users.find(u => u.id === complaint.officer_id) : null;

  return {
    ...complaint,
    citizen_name: citizen ? citizen.name : 'Unknown Citizen',
    citizen_email: citizen ? citizen.email : '',
    citizen_phone: citizen ? citizen.phone : '',
    officer_name: officer ? officer.name : null,
    officer_email: officer ? officer.email : null,
    officer_phone: officer ? officer.phone : null,
    officer_department: officer ? officer.department : null
  };
}
