<div align="center">

# 🏛️ CivicFlow

**Smart Public Issue Management System**

A modern, responsive, and robust full-stack community governance portal that links citizens directly with verified municipal engineers and administrative panels.

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini API" />
</p>

</div>

---

## 🌟 About The Project

**CivicFlow** is designed with high-contrast corporate typography and streamlined views. It empowers people to report issues, track repairs transparently, and consult bento-style municipal performance dashboards. It effectively bridges the gap between citizens reporting public infrastructure issues (like potholes, broken streetlights) and the municipal officers responsible for fixing them.

### 🚀 Key System Features

- 👤 **Role-Based Workspaces**: Customized user experiences for **Citizens**, **Department Officers**, and **Administrators**.
- 🛠️ **Full Complaint CRUD & Lifecycle**: Move complaints seamlessly through states (`Submitted` → `Assigned` → `In Progress` → `Resolved` → `Closed`).
- 🎙️ **Voice Complaint Dictation**: Converts speech to text in real-time using the **Web Speech API** to automatically fill description logs.
- 📍 **Interactive Location Selector**: Drop coordinate pins on an active spatial map to record exact GPS latitude and longitude parameters using **Leaflet**.
- 🤖 **AI Integration**: Powered by the **Google Gemini API** for intelligent server-side text processing.
- 📈 **Smart Analytics Dashboards**: Utilizes **Chart.js** to display high-contrast, double-bar charts representing Monthly Intake and Category Distributions.
- 🗺️ **Active Density Heatmap**: Aggregates and clusters physical issue locations on an interactive spatial canvas.
- 📸 **Photo Verification Logs**: Supports uploading of on-site issue photos and after-repair verification proofs (handled securely via **Multer**).
- 🔓 **Public Transparency Portal**: Searchable, anonymous public audit ledger masking all PII (citizen details) for public integrity checkups.
- 🔐 **Secure Guards**: Hardened using JWT auth headers, bcrypt hashing, Helmet safety headers, and rate limiting.

---

## 💻 Tech Stack

### Frontend
* **Framework:** React 19 + Vite
* **Language:** TypeScript
* **Styling:** Tailwind CSS (v4)
* **Animations:** Framer Motion
* **Maps:** React Leaflet
* **Charts:** Chart.js & React-Chartjs-2
* **Icons:** Lucide React
* **Forms:** React Hook Form

### Backend
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MySQL
* **Authentication:** JWT (JSON Web Tokens) & Passport.js
* **AI Processing:** Google GenAI (Gemini API)
* **Security:** Helmet, CORS, Express Rate Limit, Bcryptjs

---

## 🗄️ Database Schema & Architecture

CivicFlow uses **MySQL** as its persistent storage engine, but features a self-healing local JSON-file fallback mechanism (`/backend/database/data_store.json`) to allow immediate local execution even if a MySQL database is not connected.

The full schema script is located in `/backend/database/schema.sql`.

### Core Tables:
1. **`users`**: Manages account roles (`Citizen`, `Officer`, `Administrator`), hashed passwords, and departments.
2. **`complaints`**: Tracks issues, descriptions, severity, GPS coordinates, category, progress statuses, assigning officers, and resolution notes.
3. **`notifications`**: Stores citizen and officer activity notifications.

---

## 🛠️ Local Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **MySQL Server** (v8.0 or higher)

### 1. Configure Environment Variables
Copy and rename the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your local MySQL details and API keys:
```env
DB_HOST="localhost"
DB_USER="root"
DB_PASSWORD="your_mysql_password"
DB_NAME="civicflow"
DB_PORT=3306
JWT_SECRET="generate_a_secure_token_key"
```

### 2. Import Database Schema
Run the following command to create the MySQL database and tables, and populate them with seed accounts:
```bash
mysql -u root -p < backend/database/schema.sql
```

### 3. Install Dependencies & Run
From the root directory, install npm packages and launch the full-stack development environment:
```bash
npm install
npm run dev
```
The application will spin up at **`http://localhost:3000`** (serving both the Express API and Vite React frontend concurrently).

---

## 📝 API Documentation

### 1. Authentication Endpoints (`/api/auth`)
* **`POST /register`**: Register a new user.
* **`POST /login`**: Standard email password login.
* **`POST /google`**: Simulate Google Passport callback token sync.
* **`GET /profile`**: Retrieve verified account profile (JWT protected).
* **`PUT /profile`**: Update name and phone number (JWT protected).
* **`PUT /password`**: Reset account password securely (JWT protected).

### 2. Complaint Endpoints (`/api/complaints`)
* **`POST /`**: Submit a new complaint (Citizen only, JWT protected, supports `multipart/form-data`).
* **`GET /`**: Fetch complaints depending on user roles (JWT protected).
* **`PUT /:id/assign`**: Assign an issue to a field officer (Admin only, JWT protected).
* **`PUT /:id/status`**: Update ticket status (Officer/Admin, JWT protected).
* **`PUT /:id/resolve`**: Submit resolution notes and upload after-repair proof images.
* **`GET /track/:trackingId`**: Public audit lookup, masking all personal details.

### 3. Analytics Endpoints (`/api/dashboard`)
* **`GET /stats`**: Fetch monthly trends, categories breakdown, heatmap cluster coordinates, and officer scores (JWT protected).

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for personal or commercial projects.

<div align="center">

## 👨‍💻 Author

**K Tirumala Achari**  
Full Stack Developer | Aspiring Software Engineer

<a href="mailto:ktirumalachari@gmail.com">
  <img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail"/>
</a>
<a href="https://www.linkedin.com/in/k-tirumala-achari-921106307/">
  <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
</a>
<a href="https://github.com/ktirumalaachari">
  <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
<a href="https://www.ktirumalaachari.me">
  <img src="https://img.shields.io/badge/Portfolio-FF6B35?style=for-the-badge&logo=firefox&logoColor=white" alt="Portfolio"/>
</a>
<br/><br/>

> _"Passionate about building impactful, user-centric solutions through technology,_
> _committed to continuous learning and innovation."_

<div align="center">
**⭐ If you found this project helpful or inspiring, please give it a star! ⭐**

<br/>
Made with ❤️ by **K Tirumala Achari**

[![GitHub](https://img.shields.io/badge/GitHub-ktirumalaachari-blue?style=flat&logo=github)](https://github.com/ktirumalaachari)

</div>
