// Polyfill for File API needed by undici
const { File } = require('node:buffer');
global.File = File;

const express = require('express');
const cors = require('cors');

const dotenv = require('dotenv');   
dotenv.config();

const port = process.env.PORT || 8000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    // credentials: true,
}));


app.get('/health', (req, res) => {
    res.send('Server is Running');
});

// Routes
const authRoutes = require('./routes/auth.routes');
const planRoutes = require('./routes/plan.routes');
const clinicRoutes = require('./routes/clinic.routes');
const doctorRoutes = require('./routes/doctor.routes');
const treatmentRoutes = require('./routes/treatment.routes');
const treatmentPlanningRoutes = require('./routes/treatmentPlanning.routes');
const clinicRequestRoutes = require('./routes/clinicRequest.routes');
const consultationRoutes = require('./routes/consultation.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./routes/admin.routes');
const usersRoutes = require('./routes/users.routes');
const userManagementRoutes = require('./routes/userManagement.routes');

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/treatment-planning', treatmentPlanningRoutes);
app.use('/api/clinic-requests', clinicRequestRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user-management', userManagementRoutes);

// Error handler (should be last)
const errorHandler = require('./middlewares/errorHandling.middleware');
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

