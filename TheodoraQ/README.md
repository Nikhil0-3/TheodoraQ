# TheodoraQ - Quiz Management Platform

A modern, full-stack quiz management platform built with React, Node.js, and MongoDB. Features role-based access control for administrators and candidates.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd TheodoraQ
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

3. **Set up environment variables**

Create `.env` in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Create `.env` in the backend directory:
```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
```

4. **Start the application**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend API will be available at `http://localhost:5000`

## 📁 Project Structure

This project follows a **professional feature-based architecture** for better scalability and maintainability.

```
TheodoraQ/
├── backend/                    # Node.js/Express backend
│   ├── config/                 # Configuration files
│   ├── controllers/            # Request handlers
│   ├── middleware/             # Custom middleware
│   ├── models/                 # MongoDB models
│   ├── routes/                 # API routes
│   └── utils/                  # Utility functions
│
└── src/                        # React frontend
    ├── features/               # Feature-based modules
    │   ├── auth/               # Authentication
    │   ├── admin/              # Admin features
    │   └── candidate/          # Candidate features
    ├── shared/                 # Shared components
    ├── core/                   # Core services
    ├── router/                 # Routing config
    └── assets/                 # Static assets
```

## 📚 Documentation

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed folder structure and architecture
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - How to migrate code and common patterns
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick lookup for common operations
- **[RESTRUCTURING_SUMMARY.md](./RESTRUCTURING_SUMMARY.md)** - Summary of recent changes

## ✨ Features

### Authentication
- ✅ Email/Password authentication
- ✅ Google OAuth integration
- ✅ JWT-based authorization
- ✅ Role-based access control (Admin/Candidate)

### Admin Features
- ✅ Dashboard with analytics
- ✅ Class management
- ✅ Content library
- ✅ Quiz creation and management
- ✅ Assignment tracking
- ✅ Student submissions review

### Candidate Features
- ✅ Join classes with access codes
- ✅ View assigned quizzes
- ✅ Take quizzes
- ✅ Track progress
- ✅ View grades and feedback

## 🔐 User Roles

### Admin
- Create and manage classes
- Create quizzes and assignments
- Review student submissions
- Access analytics

### Candidate (Student)
- Join classes
- View and complete assignments
- Take quizzes
- Track progress

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **Material-UI** - Component library
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Passport.js** - OAuth
- **bcryptjs** - Password hashing

## 📖 API Documentation

### Authentication Endpoints
```
POST /api/auth/register  - Register new user
POST /api/auth/login     - Login user
POST /api/auth/logout    - Logout user
GET  /api/auth/me        - Get current user
POST /api/auth/google    - Google OAuth
```

### Admin Endpoints
```
GET    /api/classes              - Get all classes
POST   /api/classes              - Create class
GET    /api/classes/:id          - Get class details
PUT    /api/classes/:id          - Update class
DELETE /api/classes/:id          - Delete class
POST   /api/classes/:id/assignments - Create assignment
```

### Candidate Endpoints
```
POST /api/classes/join           - Join class with code
GET  /api/classes/enrolled       - Get enrolled classes
GET  /api/assignments/:id        - Get assignment details
POST /api/assignments/:id/submit - Submit assignment
```

## 🧪 Testing

```bash
# Run frontend tests (when available)
npm test

# Run backend tests
cd backend
npm test
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder

### Backend (Heroku/Railway)
1. Set environment variables
2. Deploy the backend folder
3. Ensure MongoDB is accessible

## 🔧 Development

### Adding a New Feature
1. Create folder in `src/features/{feature-name}`
2. Add components, pages, hooks as needed
3. Create barrel export (`index.js`)
4. Add routes in `src/router/AppRoutes.jsx`

### Code Style
- Use ESLint configuration
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Material-UI for the component library
- React Router for routing
- Express.js for backend framework

## 📞 Support

For support, email your-email@example.com or open an issue on GitHub.

---

**Note**: This project was recently restructured to follow professional React best practices. See [RESTRUCTURING_SUMMARY.md](./RESTRUCTURING_SUMMARY.md) for details.
