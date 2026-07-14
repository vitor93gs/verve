import { getDb } from "@/lib/mongodb";
import { clients, demands, metricsHistory, team } from "@/lib/seedData";
import { defaultInitialPassword, hashPassword } from "@/lib/passwords";

const boilerplateDemandIds = ["d1", "d2", "d3", "d4", "d5", "d6"];

export async function ensureSeeded() {
  const db = await getDb();
  const count = await db.collection("clients").estimatedDocumentCount();

  await migrateTeamUsers(db);

  if (count > 0) {
    await migrateDemandLinks(db);
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

  await migrateTeamUsers(db);
  await migrateDemandLinks(db);
}

async function migrateDemandLinks(db) {
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
}

async function migrateTeamUsers(db) {
  const passwordHash = hashPassword(defaultInitialPassword());
  const seededMembers = team.map((member) => ({
    ...member,
    email: member.email.toLowerCase(),
    role: member.role || "member",
    passwordHash,
    updatedAt: new Date()
  }));

  await Promise.all(
    seededMembers.map(async (member) => {
      const existing = await db.collection("team").findOne(
        { $or: [{ id: member.id }, { email: member.email }] },
        { projection: { _id: 1, id: 1, name: 1, area: 1, email: 1, role: 1, passwordHash: 1 } }
      );

      if (existing) {
        const missingFields = {};
        if (!existing.id) missingFields.id = member.id;
        if (!existing.name) missingFields.name = member.name;
        if (!existing.area) missingFields.area = member.area;
        if (!existing.email) missingFields.email = member.email;
        if (!existing.role) missingFields.role = member.role;
        if (!existing.passwordHash) missingFields.passwordHash = member.passwordHash;

        if (Object.keys(missingFields).length === 0) {
          return;
        }

        return db.collection("team").updateOne(
          { _id: existing._id },
          { $set: { ...missingFields, updatedAt: member.updatedAt } }
        );
      }

      try {
        return await db.collection("team").updateOne(
          { id: member.id },
          {
            $setOnInsert: { ...member, createdAt: new Date() }
          },
          { upsert: true }
        );
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        return db.collection("team").updateOne(
          { email: member.email },
          { $setOnInsert: { ...member, createdAt: new Date() } },
          { upsert: true }
        );
      }
    })
  );

  await db.collection("team").updateMany(
    { role: { $exists: false } },
    { $set: { role: "member", updatedAt: new Date() } }
  );

  await db.collection("team").updateMany(
    { passwordHash: { $exists: false } },
    { $set: { passwordHash, updatedAt: new Date() } }
  );
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
