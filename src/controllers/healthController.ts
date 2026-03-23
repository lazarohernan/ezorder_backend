import type { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../supabase/supabase";

// Separate function to handle the database check
async function checkDatabaseConnection(_request: FastifyRequest, reply: FastifyReply) {
  try {
    // Simple query to verify database connection
    const { data, error } = await supabase
      .from("restaurantes")
      .select("id")
      .limit(1);

    if (error) {
      return reply.code(500).send({ error: error.message });
    }

    return reply.code(200).send({
      status: "ok",
      message: "API and database connection functioning correctly",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return reply.code(500).send({
      status: "error",
      message: "Failed to connect to database",
      error: errorMessage,
    });
  }
}

export default checkDatabaseConnection;
