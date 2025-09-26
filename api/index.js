const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  course: { 
    type: String, 
    required: true,
    trim: true
  },
  enrollmentDate: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'], 
    default: 'Active' 
  }
}, { 
  timestamps: true 
});

// Course Schema
const courseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  duration: { 
    type: Number, 
    required: true,
    min: 1,
    max: 48
  },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'], 
    default: 'Active' 
  }
}, { 
  timestamps: true 
});

// Create models
const Student = mongoose.model('Student', studentSchema);
const Course = mongoose.model('Course', courseSchema);

// Routes
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EduManager API is running',
    timestamp: new Date().toISOString()
  });
});

// Dashboard Stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeCourses = await Course.countDocuments({ status: 'Active' });
    const graduates = await Student.countDocuments({ status: 'Inactive' });
    
    // Success rate calculation (simplified)
    const successRate = totalStudents > 0 ? Math.round((graduates / totalStudents) * 100) : 0;

    res.json({
      totalStudents,
      activeCourses,
      graduates,
      successRate
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Student Routes
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, email, course, enrollmentDate, status } = req.body;
    
    // Basic validation
    if (!name || !email || !course || !enrollmentDate) {
      return res.status(400).json({ 
        error: 'Name, email, course, and enrollment date are required' 
      });
    }

    const student = new Student({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      course: course.trim(),
      enrollmentDate: new Date(enrollmentDate),
      status: status || 'Active'
    });

    await student.save();
    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { name, email, course, enrollmentDate, status } = req.body;
    
    if (!name || !email || !course || !enrollmentDate) {
      return res.status(400).json({ 
        error: 'Name, email, course, and enrollment date are required' 
      });
    }

    const updateData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      course: course.trim(),
      enrollmentDate: new Date(enrollmentDate),
      status: status || 'Active'
    };

    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Course Routes
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const { name, description, duration, status } = req.body;
    
    if (!name || !description || !duration) {
      return res.status(400).json({ 
        error: 'Course name, description, and duration are required' 
      });
    }

    if (duration < 1 || duration > 48) {
      return res.status(400).json({ 
        error: 'Duration must be between 1 and 48 months' 
      });
    }

    const course = new Course({
      name: name.trim(),
      description: description.trim(),
      duration: parseInt(duration),
      status: status || 'Active'
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const { name, description, duration, status } = req.body;
    
    if (!name || !description || !duration) {
      return res.status(400).json({ 
        error: 'Course name, description, and duration are required' 
      });
    }

    if (duration < 1 || duration > 48) {
      return res.status(400).json({ 
        error: 'Duration must be between 1 and 48 months' 
      });
    }

    const updateData = {
      name: name.trim(),
      description: description.trim(),
      duration: parseInt(duration),
      status: status || 'Active'
    };

    const course = await Course.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(400).json({ error: error.message });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Serve static files and handle SPA routing
app.use(express.static(path.join(__dirname, '../public')));


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 EduManager server running on port ${PORT}`);
  console.log(`📱 Access your app at: http://localhost:${PORT}`);
});

module.exports = app;