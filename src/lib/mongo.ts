import { MongoClient, type Db, type Collection } from "mongodb";
import type { UserRecord, CustomListRecord } from "@/types";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}

export async function getUsersCollection(): Promise<Collection<UserRecord>> {
  const db = await getDb();
  const col = db.collection<UserRecord>("users");
  await col.createIndex({ username: 1 }, { unique: true });
  await col.createIndex({ lastScrapedAt: 1 });
  return col;
}

export async function getCustomListsCollection(): Promise<
  Collection<CustomListRecord>
> {
  const db = await getDb();
  const col = db.collection<CustomListRecord>("customLists");
  await col.createIndex({ id: 1 }, { unique: true });
  return col;
}
