import { MongoClient, type Db } from "mongodb";

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || "careerus";

function isConfiguredValue(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !/your-|placeholder|example/i.test(trimmed);
}

export function isMongoConfigured() {
  return isConfiguredValue(process.env.MONGODB_URI);
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(MONGODB_DB_NAME);
}
