import { getDb } from "@/lib/mongodb";
import { clients, demands, metricsHistory, team } from "@/lib/seedData";
import { defaultInitialPassword, hashPassword } from "@/lib/passwords";

export async function ensureSeeded() {
  const db = await getDb();
  const count = await db.collection("clients").estimatedDocumentCount();

  if (count > 0) {
    return;
  }

  await Promise.all([
    insertSeedDocs(db, "clients", clients),
    insertSeedDocs(db, "team", team),
    insertSeedDocs(db, "demands", demands),
    insertSeedDocs(db, "metricsHistory", metricsHistory)
  ]);

  await Promise.all([
    db.collection("clients").createIndex({ id: 1 }, { unique: true }),
    db.collection("team").createIndex({ id: 1 }, { unique: true }),
    db.collection("team").createIndex({ email: 1 }, { unique: true }),
    db.collection("demands").createIndex({ id: 1 }, { unique: true }),
    db.collection("metricsHistory").createIndex({ clientId: 1 }, { unique: true })
  ]);
}

async function insertSeedDocs(db, collection, docs) {
  if (docs.length === 0) {
    return;
  }

  const count = await db.collection(collection).estimatedDocumentCount();
  if (count > 0) {
    return;
  }

  const seedDocs = collection === "team" ? withInitialPasswords(docs) : docs;
  await db.collection(collection).insertMany(seedDocs);
}

function withInitialPasswords(docs) {
  const passwordHash = hashPassword(defaultInitialPassword());
  return docs.map((member) => ({
    ...member,
    email: member.email.toLowerCase(),
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}

export async function getDashboardData() {
  await ensureSeeded();
  const db = await getDb();
  const [clientDocs, teamDocs, demandDocs, metricDocs] = await Promise.all([
    db.collection("clients").find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray(),
    db.collection("team").find({}, { projection: { _id: 0, passwordHash: 0 } }).sort({ name: 1 }).toArray(),
    db.collection("demands").find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
    db.collection("metricsHistory").find({}, { projection: { _id: 0 } }).toArray()
  ]);

  return {
    clients: clientDocs,
    team: teamDocs,
    demands: demandDocs,
    metricsHistory: Object.fromEntries(metricDocs.map((item) => [item.clientId, item.history]))
  };
}
