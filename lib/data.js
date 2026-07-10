import { getDb } from "@/lib/mongodb";
import { clients, demands, metricsHistory, team } from "@/lib/seedData";

const boilerplateDemandIds = ["d1", "d2", "d3", "d4", "d5", "d6"];

export async function ensureSeeded() {
  const db = await getDb();
  const count = await db.collection("clients").estimatedDocumentCount();

  if (count > 0) {
    await db.collection("demands").deleteMany({ id: { $in: boilerplateDemandIds } });
    const clientDocs = await db.collection("clients").find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();
    await Promise.all(
      clientDocs.map((client) =>
        db.collection("demands").updateMany(
          { client: client.name, clientId: { $exists: false } },
          { $set: { clientId: client.id } }
        )
      )
    );
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

  await db.collection(collection).insertMany(docs);
}

export async function getDashboardData() {
  await ensureSeeded();
  const db = await getDb();
  const [clientDocs, teamDocs, demandDocs, metricDocs] = await Promise.all([
    db.collection("clients").find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray(),
    db.collection("team").find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray(),
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
