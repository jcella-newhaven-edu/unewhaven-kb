import "server-only";
import { MongoClient, type Db } from "mongodb";

// One MongoClient for the whole app. In development, Next.js re-runs modules on every
// file change, so the client is kept on globalThis to avoid opening a new connection
// pool each time.
const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient };

function getClient(): MongoClient {
  if (globalForMongo.mongoClient) return globalForMongo.mongoClient;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add it to .env.local.");

  const client = new MongoClient(uri, {
    appName: "unewhaven-kb",
    serverSelectionTimeoutMS: 5000,
  });
  globalForMongo.mongoClient = client;
  return client;
}

/** The knowledge base database. The driver connects on the first query. */
export function getDb(): Db {
  return getClient().db(process.env.MONGODB_DB ?? "knowledge_base");
}
