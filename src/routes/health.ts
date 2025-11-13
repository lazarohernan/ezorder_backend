import express, { Request, Response } from "express";
import checkDatabaseConnection from "../controllers/healthController";

const router = express.Router();

// Simple health check endpoint
router.get("/", (req: Request, res: Response) => {
  // This will work without TypeScript errors
  checkDatabaseConnection(req, res);
});

export default router;
