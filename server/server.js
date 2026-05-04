require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const campaignRoutes = require("./routes/campaignRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { notFound, globalErrorHandler } = require("./middlewares/asyncHandler");
const { trackEmailOpen, handleUnsub }  = require('./controllers/webhookController');

const sendRoutes      = require('./routes/sendRoutes');
const feedbackRoutes  = require('./routes/feedbackRoutes');
const userRoutes      = require('./routes/userRoutes');
const webhookRoutes   = require('./routes/webhookRoutes');
const paymentRoutes   = require('./routes/paymentRoutes');


const admin = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Tracking (no auth) ────────────────────────────────────────
app.get('/api/track/open',  trackEmailOpen);
app.get('/api/track/unsub', handleUnsub);

// ── API Routes ────────────────────────────────────────────────
app.use('/api/campaigns',  campaignRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/send',       sendRoutes);
app.use('/api/f',          feedbackRoutes);
app.use('/api/feedback',   feedbackRoutes);   // alias for dashboard
app.use('/api/user',       userRoutes);
app.use('/api/webhooks',   webhookRoutes);
app.use('api/payments', paymentRoutes)

// Error handling
app.use(notFound);
app.use(globalErrorHandler);

// Start server after DB connects
connectDB().then(() => {
  app.listen(5000, () => console.log("Server running on 5000"));
});