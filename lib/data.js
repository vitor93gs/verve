import { getDb } from "@/lib/mongodb";
import { clients, demands, metricsHistory, team } from "@/lib/seedData";

export async function ensureSeeded() {
  const db = await getDb();
  const count = await db.collection("clients").estimatedDocumentCount();

  if (count > 0) {
    return;
  }

  await Promise.all([
    db.collection("clients").insertMany(clients),
    db.collection("team").insertMany(team),
    db.collection("demands").insertMany(demands),
    db.collection("metricsHistory").insertMany(metricsHistory)
  ]);

  await Promise.all([
    db.collection("clients").createIndex({ id: 1 }, { unique: true }),
    db.collection("team").createIndex({ id: 1 }, { unique: true }),
    db.collection("demands").createIndex({ id: 1 }, { unique: true }),
    db.collection("metricsHistory").createIndex({ clientId: 1 }, { unique: true })
  ]);
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
