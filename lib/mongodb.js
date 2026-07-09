import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "verve";

let client;
let clientPromise;

if (uri && process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else if (uri) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  if (!clientPromise) {
    throw new Error("Missing MONGODB_URI. Add it to .env.local before running the app.");
  }

  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
