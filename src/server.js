const express = require("express");
const helmet = require("helmet");

const env = require("./config/env");
const corsMiddleware = require("./middleware/cors");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const widgetRoutes = require("./routes/widgets");
const widgetDeliveryRoutes = require("./routes/widgetDelivery");
const submissionRoutes = require("./routes/submissions");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/widgets", widgetRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/", widgetDeliveryRoutes);

app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Widget platform listening on port ${env.port}`);
  });
}

module.exports = app;
