import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, magicLinks, accountRequests,
  quotationStatusWeights, opportunityStatusWeights,
  nicokaCache, simulationScenarios,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Quotation Status Weights ───

export async function getQuotationWeights() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quotationStatusWeights).where(eq(quotationStatusWeights.active, true));
}

export async function upsertQuotationWeight(statusId: string, statusLabel: string, weight: number, description?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(quotationStatusWeights).values({ statusId, statusLabel, weight: String(weight), description: description || null })
    .onDuplicateKeyUpdate({ set: { statusLabel, weight: String(weight), description: description || null } });
}

// ─── Opportunity Status Weights ───

export async function getOpportunityWeights() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opportunityStatusWeights).where(eq(opportunityStatusWeights.active, true));
}

export async function upsertOpportunityWeight(statusId: string, statusLabel: string, weight: number, description?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(opportunityStatusWeights).values({ statusId, statusLabel, weight: String(weight), description: description || null })
    .onDuplicateKeyUpdate({ set: { statusLabel, weight: String(weight), description: description || null } });
}

// ─── Account Requests ───

export async function getPendingAccountRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountRequests).where(eq(accountRequests.status, "pending")).orderBy(desc(accountRequests.createdAt));
}

export async function getAllAccountRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountRequests).orderBy(desc(accountRequests.createdAt));
}

// ─── Simulation Scenarios ───

export async function getSimulationScenarios() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(simulationScenarios).orderBy(desc(simulationScenarios.updatedAt));
}

export async function createSimulationScenario(data: {
  name: string; year: number; createdBy?: number;
  quotationWeightsOverride?: any; opportunityWeightsOverride?: any; notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(simulationScenarios).values(data);
}

// ─── Nicoka Cache ───

export async function getCachedData(dataType: "quotations" | "orders" | "opportunities" | "customers" | "projects" | "funnel_snapshot", year: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(nicokaCache)
    .where(and(eq(nicokaCache.dataType, dataType), eq(nicokaCache.year, year)))
    .orderBy(desc(nicokaCache.syncedAt)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function setCachedData(dataType: "quotations" | "orders" | "opportunities" | "customers" | "projects" | "funnel_snapshot", year: number, data: any) {
  const db = await getDb();
  if (!db) return;
  await db.delete(nicokaCache).where(and(eq(nicokaCache.dataType, dataType), eq(nicokaCache.year, year)));
  await db.insert(nicokaCache).values({ dataType, year, data });
}

export async function getLastSyncDate(year: number): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ syncedAt: nicokaCache.syncedAt }).from(nicokaCache)
    .where(and(eq(nicokaCache.dataType, "funnel_snapshot"), eq(nicokaCache.year, year)))
    .orderBy(desc(nicokaCache.syncedAt)).limit(1);
  return result.length > 0 ? result[0].syncedAt : null;
}
