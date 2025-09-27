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
    // We explicitly set autoIndex to true here to ensure Mongoose applies the non-unique index below.
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ MongoDB connected successfully');

    // --- FIX: Aggressively drop the old unique email index which is causing the E11000 error. ---
    // Ensure we are connected before attempting index operations.
    // We use Student.collection.dropIndex to use the model's knowledge of the collection name.
    try {
        // Note: The collection name 'students' is inferred from the Student model.
        await Student.collection.dropIndex('email_1');
        console.log('✅ Successfully dropped stale unique email_1 index.');
    } catch (indexError) {
        // Log the error only if it's not the expected 'index not found' error (code 26 or message variations).
        const isIndexNotFound = indexError.code === 26 || indexError.message.includes('index not found');
        if (!isIndexNotFound) {
             console.error('⚠️ Warning: Failed to drop email_1 index:', indexError.message);
        } else {
             console.log(`Email index drop check: Index email_1 was not found.`);
        }
    }
    // --------------------------------------------------------------------------------------------

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
// Note: We move connectDB() call after model definitions so Student is defined.
// connectDB(); // Moved below definitions

// --- NEW: Counter Schema for Auto-Incrementing IDs ---
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

/**
 * Helper function to atomically increment and retrieve the next sequence value.
 * @param {string} sequenceName - The name of the counter to increment (e.g., 'studentId').
 */
async function getNextSequenceValue(sequenceName) {
    // --- EDITED: Atomically find the counter and set the initial/reset value to 0.
    // upsert: true means if it doesn't exist, create it with sequence_value: 0
    // We use $setOnInsert to ensure the value is set only if the document is created (first time run).
    const INITIAL_ID_VALUE = 0; // The next student ID will start at 1
    
    // Atomically find the counter and initialize it if needed.
    await Counter.findOneAndUpdate(
        { _id: sequenceName },
        { $setOnInsert: { sequence_value: INITIAL_ID_VALUE } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // Atomically increment the sequence value for the next ID
    const updatedCounter = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { sequence_value: 1 } },
        { new: true } // Return the document AFTER update (the new sequence value)
    );
    
    return updatedCounter.sequence_value;
}
// --- END NEW COUNTER LOGIC ---

// Student Schema
const studentSchema = new mongoose.Schema({
  studentId: {
    type: Number,
    // --- FIX: Explicitly set index to false here to avoid implicit unique creation ---
    index: false 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    // unique: true removed here to allow duplicate emails
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

// --- FIX: Explicitly define a non-unique index to overwrite any lingering unique index in MongoDB. ---
studentSchema.index({ studentId: 1 }, { unique: false });


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

// Connect to database AFTER models are defined
connectDB();


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
    // Fetch all students and sort by the new studentId descending
    const students = await Student.find().sort({ studentId: -1, createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    // Still use the MongoDB _id for reliable lookup in the API
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
    
    // --- Implement Retry Loop for Auto-ID Generation ---
    const MAX_RETRIES = 5;
    let student;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // 1. Generate the ID immediately before creating the object
            const generatedStudentId = await getNextSequenceValue('studentId');
            
            // 2. Create and attempt to save the student document
            student = new Student({
                studentId: generatedStudentId, // Assign the generated ID
                name: name.trim(),
                email: email.trim().toLowerCase(),
                course: course.trim(),
                enrollmentDate: new Date(enrollmentDate),
                status: status || 'Active'
            });

            await student.save();
            
            // Success: Break the loop
            return res.status(201).json(student);

        } catch (error) {
            // Check for MongoDB Duplicate Key Error (E11000)
            if (error.code === 11000) {
                // Check if the duplicate key error is specifically for the 'studentId' field.
                if (error.keyPattern && error.keyPattern.studentId) {
                    console.warn(`Attempt ${attempt + 1}: Student ID collision detected on field 'studentId'. Retrying...`);
                    
                    if (attempt === MAX_RETRIES - 1) {
                        throw new Error('Failed to generate a unique Student ID after multiple retries.');
                    }
                } else if (error.keyPattern && error.keyPattern.email) {
                    // --- FIX: Explicitly handle duplicate email error, which is now allowed by schema but blocked by old index. ---
                    // Do NOT retry for email, as we want to allow duplicates.
                    throw new Error('A duplicate email was found by an unexpected database index. Please restart the application to clear the index.');
                }
                 // Continue to the next iteration to get a new ID.
            } else {
                // If it's any other error, break the retry loop and handle it normally
                throw error;
            }
        }
    }
    // This line should technically be unreachable, but included for safety.
    return res.status(500).json({ error: 'Internal server error during student creation.' });

    // --- END Retry Loop ---
  } catch (error) {
    console.error('Create student error:', error);
    // Handle the specific index cleanup error we introduced above
    if (error.message.includes('A duplicate email was found')) {
         res.status(400).json({ error: error.message });
    }
    // Generic error handling for validation or retry failure errors
    else if (error.message.includes('unique Student ID')) {
         res.status(500).json({ error: error.message });
    } else {
         res.status(400).json({ error: error.message });
    }
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    // Exclude studentId from update since it should be immutable after creation
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

    // runValidators: false is set because we removed the unique constraint on email,
    // and we don't need Mongoose to enforce it or check for it during update.
    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true } // runValidators: true is fine here, as it validates required fields
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // --- NEW LOGIC: Check student count after deletion and reset counter if empty ---
    const remainingStudents = await Student.countDocuments();
    
    if (remainingStudents === 0) {
        // Reset the sequence_value for studentId back to 0
        await Counter.findOneAndUpdate(
            { _id: 'studentId' },
            { sequence_value: 0 },
            { new: true }
        );
        console.log('✅ Student list is now empty. Student ID counter has been reset to 0.');
    }
    // --------------------------------------------------------------------------------

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
