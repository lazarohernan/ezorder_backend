import express, { Request, Response } from "express";
import { supabase } from "../supabase/supabase";

// Separate function to handle the database check
async function checkDatabaseConnection(req: Request, res: Response) {
  try {
    // Simple query to verify database connection
    const { data, error } = await supabase
      .from("restaurantes")
      .select("id")
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      status: "ok",
      message: "API and database connection functioning correctly",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return res.status(500).json({
      status: "error",
      message: "Failed to connect to database",
      error: errorMessage,
    });
  }
}

export default checkDatabaseConnection;
