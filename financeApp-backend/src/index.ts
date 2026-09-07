import "./env.ts";
import express from "express";
import cors from "cors";

import { verifyToken } from "./middleware/auth.ts";
import { verifyAdmin } from "./middleware/adminAuth";
import userRouter from "./routes/user.ts";
import tradesRouter from "./routes/trades.ts";
import riskProfileRouter from "./routes/riskProfile.ts";
import bondsRouter from "./routes/bonds.ts";
import companiesRouter from "./routes/companies.ts";
import adminRouter from "./routes/admin.ts";
import { startTradeResolver } from "./services/tradeResolver.ts";

const app = express();
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Public
app.use("/bonds", bondsRouter);
app.use("/companies", companiesRouter);

// Authenticated user routes
app.use("/user", verifyToken, userRouter);
app.use("/trades", verifyToken, tradesRouter);
app.use("/risk-profile", verifyToken, riskProfileRouter);

// Admin-only routes (POST /companies also goes through admin check)
app.use("/admin", verifyAdmin, adminRouter);

startTradeResolver();
//startBondsCron();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
