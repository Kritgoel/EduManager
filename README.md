# EduManager

EduManager is a web-based Student Management System that helps educational institutions manage student data, courses, and academic records effectively.

## 🚀 Features

- 📊 Interactive Dashboard
- 👥 Student Management
- 📖 Course Management
- 📋 Report Generation
- 🔍 Quick Search Functionality
- 💻 Responsive Design

## 🛠️ Tech Stack

- **Frontend:**
  - HTML5
  - CSS3
  - Vanilla JavaScript
  - Responsive Design

- **Backend:**
  - Node.js
  - Express.js
  - MongoDB (with Mongoose)
  - RESTful API

- **Deployment:**
  - Vercel

## 📋 Prerequisites

- Node.js (v12 or higher)
- MongoDB
- npm or yarn

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Kritgoel/EduManager.git
   cd EduManager
   ```

2. Install all dependencies:
   ```bash
   # Install main dependencies
   npm install express@4.21.2    # Web framework
   npm install mongoose@8.18.2   # MongoDB ODM
   npm install cors@2.8.5        # CORS middleware
   npm install dotenv@17.2.2     # Environment variables

   # Install development dependency
   npm install nodemon@3.1.10 --save-dev  # Auto-restart server during development

   # Or install everything at once using package.json
   npm install
   ```

3. Create a `.env` file in the root directory and add your MongoDB connection string:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   ```

4. Start the development server:
   ```bash
   # For development with auto-restart
   npm run dev

   # For production
   npm start
   ```

The application will start running at `http://localhost:3000`

Note: The versions specified above are the tested versions. You can use newer versions, but they might require code adjustments.

## 🏗️ Project Structure

```
EduManager/
├── api/
│   └── index.js          # Express server and API routes
├── public/
│   ├── index.html        # Main HTML file
│   ├── style.css         # Styles
│   └── script.js         # Frontend JavaScript
├── package.json          # Project dependencies
├── vercel.json          # Vercel deployment configuration
└── README.md            # Project documentation
```

## 🌟 Key Features Explained

- **Dashboard**: Overview of key metrics and statistics
- **Student Management**: Add, edit, and manage student records
- **Course Management**: Organize and track different courses
- **Report Generation**: Generate and view academic reports
- **Search Functionality**: Quick access to student records

## 🚀 Deployment

The application is configured for deployment on Vercel. The `vercel.json` file includes the necessary routing configuration for both the API and static files.

## 📝 License

This project is licensed under the ISC License.

## 👤 Author

- Krit Goel

---

For any questions or suggestions, please feel free to open an issue or submit a pull request.