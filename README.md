# 🚗 AutoBook

**AutoBook** is a full-stack web application for booking automotive services at local auto shops. Built as a capstone project using React and Firebase.

---

## ✨ Features

### 👤 Customers
- Browse and follow local auto shops via a Shop Feed
- Book services (oil change, tire rotation, tune-up, etc.)
- Track booking history and statuses
- Manage registered vehicles
- Find available mechanics
- Request strategic vehicle checkups
- Receive real-time notifications/alerts

### 🏪 Shop Owners
- Manage incoming service bookings (approve/reject/complete)
- Manage mechanics and staff
- Track car parts inventory
- View shop reviews and ratings
- Access shop analytics and reports
- Publish posts to the shop feed

### 🛡️ Admin
- Manage all platform users
- Approve or reject new account registrations
- Monitor all bookings across shops
- Send platform-wide alerts

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7 |
| Backend / DB | Firebase Firestore |
| Auth | Firebase Authentication (Email + Google OAuth) |
| Storage | Firebase Storage |
| Hosting | (your hosting platform here) |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/autobook.git
cd autobook
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the project root with your Firebase config:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run locally
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── App.js              # Root routing (role-based)
├── UserContext.js      # Global auth & user state
├── firebase.js         # Firebase initialization
└── screens/            # All page components
    ├── Onboarding.js
    ├── Login.js / Signup.js
    ├── Dashboard.js    # Role-based redirect hub
    ├── CustomerDashboard.js
    ├── OwnerDashboard.js
    ├── Admin*.js       # Admin management screens
    └── ...
```

---

## 👥 Team

> Add your team members here

---

## 📄 License

This project was created for academic/capstone purposes.
