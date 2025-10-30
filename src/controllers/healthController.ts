import express, { Request, Response } from "express";
import { supabase } from "../supabase/supabase";

// Separate function to handle the database check
async function checkDatabaseConnection(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from("health_check")
      .select("*")
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      status: "ok",
      message: "API and database connection functioning correctly",
      data,
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
