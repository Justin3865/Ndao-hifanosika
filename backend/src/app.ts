import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

app.use(helmet());

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.get("/", (_req, res) => {
    res.json({
        message: "API Ndao Hifanosika",
        status: "OK"
    });
});

app.get("/api/health", (_req, res) => {
    res.json({
        service: "backend",
        status: "OK"
    });
});

export default app;