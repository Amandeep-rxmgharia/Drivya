import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import { connectDb } from "./config/db.js";

await connectDb();

const app = express();
const PORT = 3000;
app.use(cors({ credentials: true }));
app.use(express.json());
app.use("/auth", authRoutes);
app.use((err, req, res, next) => {
    console.log(err);
  console.log("runnig error");
  res.status(err.status || 500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`server is listening on http://localhost:${PORT}`);
});
