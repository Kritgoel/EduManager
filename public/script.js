// Application State
let students = [];
let courses = [];
let currentEditingStudent = null;
let currentEditingCourse = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const searchInput = document.getElementById('searchInput');

// Modal Elements
const studentModal = document.getElementById('studentModal');
const courseModal = document.getElementById('courseModal');
const studentForm = document.getElementById('studentForm');
const courseForm = document.getElementById('courseForm');

// Loading and Notification Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const notification = document.getElementById('notification');

// Confirmation Modal Elements (NEW)
const confirmationModal = document.createElement('div');
confirmationModal.id = 'confirmationModal';
confirmationModal.className = 'modal';
confirmationModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px; padding: 0;">
        <div class="modal-header" style="background: #e74c3c; color: white; border-bottom: none;">
            <h3 id="confirmationModalTitle" style="color: white; font-weight: 700;">Confirm Action</h3>
            <button class="modal-close" id="closeConfirmationModal" style="color: white; opacity: 0.9;">✖</button>
        </div>
        <div style="padding: 30px; text-align: center;">
            <div style="font-size: 4rem; color: #e74c3c; margin-bottom: 20px;">
                <span class="icon">⚠️</span>
            </div>
            <p id="confirmationMessage" style="margin-bottom: 25px; font-size: 16px; color: #34495e; line-height: 1.5;">
                <!-- Confirmation message content -->
            </p>
        </div>
        <div class="modal-actions" style="border-top: 1px solid #e1e8ed; padding: 20px 30px; justify-content: space-between;">
            <button type="button" class="btn-secondary" id="cancelConfirmationBtn" style="flex-grow: 1; margin-right: 10px;">Cancel</button>
            <button type="button" class="btn-delete" id="confirmActionBtn" style="flex-grow: 1;">Delete</button>
        </div>
    </div>
`;
document.body.appendChild(confirmationModal);


// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    // Add event listeners for the new confirmation modal
    document.getElementById('closeConfirmationModal').addEventListener('click', () => confirmationModal.classList.remove('active'));
    document.getElementById('cancelConfirmationBtn').addEventListener('click', () => confirmationModal.classList.remove('active'));
});

// Initialize Application
async function initializeApp() {
    setupEventListeners();
    await loadDashboardStats();
    await loadStudents();
    await loadCourses();
    populateCourseOptions();
}

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            switchSection(section);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Add Student Buttons
    document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal());
    document.getElementById('addStudentBtn2').addEventListener('click', () => openStudentModal());
    
    // Add Course Button
    document.getElementById('addCourseBtn').addEventListener('click', () => openCourseModal());

    // Modal Close Buttons
    document.getElementById('closeStudentModal').addEventListener('click', () => closeStudentModal());
    document.getElementById('closeCourseModal').addEventListener('click', () => closeCourseModal());
    document.getElementById('cancelStudentBtn').addEventListener('click', () => closeStudentModal());
    document.getElementById('cancelCourseBtn').addEventListener('click', () => closeCourseModal());

    // Form Submissions
    studentForm.addEventListener('submit', handleStudentSubmit);
    courseForm.addEventListener('submit', handleCourseSubmit);

    // Search Functionality
    searchInput.addEventListener('input', (e) => {
        filterStudents(e.target.value);
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === studentModal) closeStudentModal();
        if (e.target === courseModal) closeCourseModal();
        if (e.target === confirmationModal) confirmationModal.classList.remove('active');
    });

    // Close notification
    document.getElementById('closeNotification').addEventListener('click', () => {
        notification.classList.remove('active');
    });
}

// Navigation Functions
function switchSection(sectionName) {
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// API Functions
const API_BASE = '/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
    showLoading();
    try {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong');
        }

        return result;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// Dashboard Functions
async function loadDashboardStats() {
    try {
        const stats = await apiRequest('/stats');
        
        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('activeCourses').textContent = stats.activeCourses;
        document.getElementById('graduates').textContent = stats.graduates;
        document.getElementById('successRate').textContent = `${stats.successRate}%`;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Student Functions
async function loadStudents() {
    try {
        students = await apiRequest('/students');
        renderStudents();
        renderRecentStudents();
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function renderStudents() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    students.forEach((student, index) => {
        const row = createStudentRow(student, index);
        tbody.appendChild(row);
    });
}

function renderRecentStudents() {
    const tbody = document.getElementById('recentStudentsBody');
    tbody.innerHTML = '';

    // Show only first 5 students
    const recentStudents = students.slice(0, 5);
    
    recentStudents.forEach((student, index) => {
        const row = createStudentRow(student, index);
        tbody.appendChild(row);
    });
}

function createStudentRow(student, index) {
    const row = document.createElement('tr');
    // Display the numeric studentId if available, otherwise fallback to sliced MongoDB _id
    const displayId = student.studentId || student._id.substring(student._id.length - 8); 
    const enrollmentDate = new Date(student.enrollmentDate).toLocaleDateString();
    
    row.innerHTML = `
        <td>${displayId}</td>
        <td>${student.name}</td>
        <td>${student.course}</td>
        <td>${enrollmentDate}</td>
        <td><span class="status-badge status-${student.status.toLowerCase()}">${student.status}</span></td>
        <td>
            <div class="actions-container">
                <button class="btn-edit" onclick="editStudent('${student._id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="showConfirmation('student', '${student._id}', '${student.name}')">🗑️ Delete</button>
            </div>
        </td>
    `;
    
    return row;
}

function filterStudents(searchTerm) {
    const filteredStudents = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.studentId && student.studentId.toString().includes(searchTerm))
        
    );
    
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    
    filteredStudents.forEach((student, index) => {
        const row = createStudentRow(student, index);
        tbody.appendChild(row);
    });
}

// Course Functions
async function loadCourses() {
    try {
        courses = await apiRequest('/courses');
        renderCourses();
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function renderCourses() {
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = '';

    courses.forEach((course, index) => {
        const row = createCourseRow(course, index);
        tbody.appendChild(row);
    });
}

function createCourseRow(course, index) {
    const row = document.createElement('tr');
    const shortId = course._id.substring(course._id.length - 8);
    
    row.innerHTML = `
        <td>${shortId}</td>
        <td>${course.name}</td>
        <td>${course.description}</td>
        <td>${course.duration}</td>
        <td><span class="status-badge status-${course.status.toLowerCase()}">${course.status}</span></td>
        <td>
            <div class="actions-container">
                <button class="btn-edit" onclick="editCourse('${course._id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="showConfirmation('course', '${course._id}', '${course.name}')">🗑️ Delete</button>
            </div>
        </td>
    `;
    
    return row;
}

function populateCourseOptions() {
    const courseSelect = document.getElementById('studentCourse');
    courseSelect.innerHTML = '<option value="">Select Course</option>';
    
    courses.forEach(course => {
        if (course.status === 'Active') {
            const option = document.createElement('option');
            option.value = course.name;
            option.textContent = course.name;
            courseSelect.appendChild(option);
        }
    });
}

// Modal Functions
function openStudentModal(studentId = null) {
    currentEditingStudent = studentId;
    const modalTitle = document.getElementById('studentModalTitle');
    const saveBtn = document.getElementById('saveStudentBtn');
    
    if (studentId) {
        const student = students.find(s => s._id === studentId);
        if (student) {
            modalTitle.textContent = 'Edit Student';
            saveBtn.textContent = 'Update Student';
            fillStudentForm(student);
        }
    } else {
        modalTitle.textContent = 'Add New Student';
        saveBtn.textContent = 'Save Student';
        studentForm.reset();
        // Set default date to today
        document.getElementById('enrollmentDate').value = new Date().toISOString().split('T')[0];
    }
    
    studentModal.classList.add('active');
}

function closeStudentModal() {
    studentModal.classList.remove('active');
    studentForm.reset();
    currentEditingStudent = null;
}

function fillStudentForm(student) {
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentEmail').value = student.email;
    document.getElementById('studentCourse').value = student.course;
    document.getElementById('enrollmentDate').value = student.enrollmentDate.split('T')[0];
    document.getElementById('studentStatus').value = student.status;
}

function openCourseModal(courseId = null) {
    currentEditingCourse = courseId;
    const modalTitle = document.getElementById('courseModalTitle');
    const saveBtn = document.getElementById('saveCourseBtn');
    
    if (courseId) {
        const course = courses.find(c => c._id === courseId);
        if (course) {
            modalTitle.textContent = 'Edit Course';
            saveBtn.textContent = 'Update Course';
            fillCourseForm(course);
        }
    } else {
        modalTitle.textContent = 'Add New Course';
        saveBtn.textContent = 'Save Course';
        courseForm.reset();
    }
    
    courseModal.classList.add('active');
}

function closeCourseModal() {
    courseModal.classList.remove('active');
    courseForm.reset();
    currentEditingCourse = null;
}

function fillCourseForm(course) {
    document.getElementById('courseName').value = course.name;
    document.getElementById('courseDescription').value = course.description;
    document.getElementById('courseDuration').value = course.duration;
    document.getElementById('courseStatus').value = course.status;
}

// Form Handlers
async function handleStudentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(studentForm);
    const studentData = {
        name: formData.get('name'),
        email: formData.get('email'),
        course: formData.get('course'),
        enrollmentDate: formData.get('enrollmentDate'),
        status: formData.get('status')
    };

    try {
        if (currentEditingStudent) {
            await apiRequest(`/students/${currentEditingStudent}`, 'PUT', studentData);
            showNotification('Student updated successfully!', 'success');
        } else {
            await apiRequest('/students', 'POST', studentData);
            showNotification('Student added successfully!', 'success');
        }
        
        closeStudentModal();
        await loadStudents();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error saving student:', error);
    }
}

async function handleCourseSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(courseForm);
    const courseData = {
        name: formData.get('name'),
        description: formData.get('description'),
        duration: parseInt(formData.get('duration')),
        status: formData.get('status')
    };

    try {
        if (currentEditingCourse) {
            await apiRequest(`/courses/${currentEditingCourse}`, 'PUT', courseData);
            showNotification('Course updated successfully!', 'success');
        } else {
            await apiRequest('/courses', 'POST', courseData);
            showNotification('Course added successfully!', 'success');
        }
        
        closeCourseModal();
        await loadCourses();
        await loadDashboardStats();
        populateCourseOptions();
    } catch (error) {
        console.error('Error saving course:', error);
    }
}

// Edit Functions
function editStudent(studentId) {
    openStudentModal(studentId);
}

function editCourse(courseId) {
    openCourseModal(courseId);
}

// --- NEW CONFIRMATION AND DELETE LOGIC ---

/**
 * Shows a custom confirmation modal for delete actions.
 * @param {string} type - 'student' or 'course'.
 * @param {string} id - The MongoDB _id of the item to delete.
 * @param {string} name - The name of the item to display in the message.
 */
function showConfirmation(type, id, name) {
    const titleElement = document.getElementById('confirmationModalTitle');
    const messageElement = document.getElementById('confirmationMessage');
    const confirmBtn = document.getElementById('confirmActionBtn');

    titleElement.textContent = `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    messageElement.innerHTML = `Are you sure you want to permanently delete **${name}**? This action cannot be undone.`;
    confirmBtn.textContent = `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    // Clear previous listener and add new one
    confirmBtn.onclick = null;
    if (type === 'student') {
        confirmBtn.onclick = () => {
            confirmationModal.classList.remove('active');
            deleteStudent(id, name);
        };
    } else if (type === 'course') {
        confirmBtn.onclick = () => {
            confirmationModal.classList.remove('active');
            deleteCourse(id, name);
        };
    }

    confirmationModal.classList.add('active');
}

// Delete Functions
async function deleteStudent(studentId, studentName) {
    try {
        await apiRequest(`/students/${studentId}`, 'DELETE');
        showNotification(`Student "${studentName}" deleted successfully!`, 'success');
        await loadStudents();
        await loadDashboardStats();
    } catch (error) {
        console.error('Error deleting student:', error);
    }
}

async function deleteCourse(courseId, courseName) {
    try {
        await apiRequest(`/courses/${courseId}`, 'DELETE');
        showNotification(`Course "${courseName}" deleted successfully!`, 'success');
        await loadCourses();
        await loadDashboardStats();
        populateCourseOptions();
    } catch (error) {
        console.error('Error deleting course:', error);
    }
}

// --- END NEW CONFIRMATION AND DELETE LOGIC ---

// Utility Functions
function showLoading() {
    loadingSpinner.classList.add('active');
}

function hideLoading() {
    loadingSpinner.classList.remove('active');
}

function showNotification(message, type = 'info') {
    const notificationMessage = document.getElementById('notificationMessage');
    notificationMessage.textContent = message;
    
    notification.className = 'notification active';
    if (type) {
        notification.classList.add(type);
    }
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('active');
    }, 5000);
}

// Responsive menu toggle (for mobile)
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}
