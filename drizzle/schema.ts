import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

// ─── Users (extended with password for Magic Link fallback) ───
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Magic Links ───
export const magicLinks = mysqlTable("magic_links", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLink = typeof magicLinks.$inferSelect;

// ─── Account Requests (for non-rubix-consulting domains) ───
export const accountRequests = mysqlTable("account_requests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountRequest = typeof accountRequests.$inferSelect;

// ─── Quotation Status Weights (pondération des statuts de devis) ───
export const quotationStatusWeights = mysqlTable("quotation_status_weights", {
  id: int("id").autoincrement().primaryKey(),
  statusId: varchar("statusId", { length: 64 }).notNull().unique(),
  statusLabel: varchar("statusLabel", { length: 255 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).default("0.50").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QuotationStatusWeight = typeof quotationStatusWeights.$inferSelect;

// ─── Opportunity Status Weights (pondération des statuts d'opportunités) ───
export const opportunityStatusWeights = mysqlTable("opportunity_status_weights", {
  id: int("id").autoincrement().primaryKey(),
  statusId: varchar("statusId", { length: 64 }).notNull().unique(),
  statusLabel: varchar("statusLabel", { length: 255 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).default("0.30").notNull(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OpportunityStatusWeight = typeof opportunityStatusWeights.$inferSelect;

// ─── Nicoka Sync Cache (cache des données Nicoka pour performance) ───
export const nicokaCache = mysqlTable("nicoka_cache", {
  id: int("id").autoincrement().primaryKey(),
  dataType: mysqlEnum("dataType", ["quotations", "orders", "opportunities", "customers", "projects", "funnel_snapshot"]).notNull(),
  year: int("year").notNull(),
  data: json("data").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type NicokaCache = typeof nicokaCache.$inferSelect;

// ─── Simulation Scenarios ───
export const simulationScenarios = mysqlTable("simulation_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  year: int("year").notNull(),
  createdBy: int("createdBy"),
  quotationWeightsOverride: json("quotationWeightsOverride"),
  opportunityWeightsOverride: json("opportunityWeightsOverride"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SimulationScenario = typeof simulationScenarios.$inferSelect;
