/**
 * Module d'authentification par email : Magic Link + mot de passe (fallback)
 * Auto-approbation pour @rubix-consulting.com, approbation admin pour les autres.
 */

import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import type { Request } from "express";
import { users, magicLinks, accountRequests } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 10;
const MAGIC_LINK_EXPIRY_MINUTES = 15;
const AUTO_APPROVE_DOMAIN = "rubix-consulting.com";

// ─── Password helpers ───

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateOpenId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// ─── Domain check ───

export function isAutoApproved(email: string): boolean {
  return email.toLowerCase().trim().endsWith(`@${AUTO_APPROVE_DOMAIN}`);
}

function formatNameFromEmail(email: string): string {
  const namePart = email.split("@")[0];
  return namePart
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ─── Magic Link ───

export function generateMagicToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function getMagicLinkExpiresAt(): Date {
  return new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
}

export function buildMagicLinkUrl(req: Request, token: string): string {
  const origin =
    req.headers.origin ||
    (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
    `${req.protocol}://${req.headers.host}`;
  return `${origin}/auth/verify?token=${token}`;
}

export function buildMagicLinkEmailHtml(magicLinkUrl: string): string {
  return `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1d1d1f; background: #f5f5f7;">
        <div style="max-width: 520px; margin: 40px auto; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <h2 style="color: #1d1d1f; font-weight: 600; margin-bottom: 8px;">Connexion à Funnel Commercial</h2>
          <p style="color: #86868b; margin-bottom: 24px;">Cliquez sur le bouton ci-dessous pour vous connecter :</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLinkUrl}" 
               style="background: linear-gradient(135deg, #6d28d9, #7c3aed); color: white; padding: 14px 36px; 
                      text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;
                      display: inline-block; box-shadow: 0 4px 12px rgba(109,40,217,0.3);">
              Se connecter
            </a>
          </div>
          <p style="font-size: 13px; color: #86868b;">Ce lien est valable 15 minutes et ne peut être utilisé qu'une seule fois.</p>
        </div>
      </body>
    </html>
  `;
}

// ─── Core auth operations ───

export async function createMagicLink(email: string): Promise<{ token: string; isNewUser: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedEmail = email.toLowerCase().trim();
  const autoApproved = isAutoApproved(normalizedEmail);

  // Check if user exists
  const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  let isNewUser = existingUsers.length === 0;

  if (!autoApproved && isNewUser) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  if (!autoApproved && existingUsers[0] && !existingUsers[0].approved) {
    throw new Error("ACCOUNT_PENDING");
  }

  // Auto-create user for auto-approved domains
  if (isNewUser && autoApproved) {
    const openId = generateOpenId();
    await db.insert(users).values({
      openId,
      email: normalizedEmail,
      name: formatNameFromEmail(normalizedEmail),
      loginMethod: "magic_link",
      role: "user",
      approved: true,
    });
  }

  // Create magic link token
  const token = generateMagicToken();
  await db.insert(magicLinks).values({
    email: normalizedEmail,
    token,
    expiresAt: getMagicLinkExpiresAt(),
  });

  return { token, isNewUser };
}

export async function verifyMagicLinkToken(token: string): Promise<{ user: typeof users.$inferSelect; sessionToken: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find the magic link
  const links = await db.select().from(magicLinks)
    .where(and(eq(magicLinks.token, token), eq(magicLinks.used, false)))
    .limit(1);

  if (links.length === 0) {
    throw new Error("INVALID_TOKEN");
  }

  const link = links[0];

  if (new Date() > link.expiresAt) {
    throw new Error("TOKEN_EXPIRED");
  }

  // Mark as used
  await db.update(magicLinks).set({ used: true }).where(eq(magicLinks.id, link.id));

  // Get or create user
  const existingUsers = await db.select().from(users).where(eq(users.email, link.email)).limit(1);
  
  if (existingUsers.length === 0) {
    throw new Error("USER_NOT_FOUND");
  }

  const user = existingUsers[0];

  // Update last sign in
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  // Create session token using the SDK's signing mechanism
  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "" });

  return { user, sessionToken };
}

export async function loginWithPassword(email: string, password: string): Promise<{ user: typeof users.$inferSelect; sessionToken: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedEmail = email.toLowerCase().trim();
  const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (existingUsers.length === 0) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user = existingUsers[0];

  if (!user.passwordHash) {
    throw new Error("NO_PASSWORD_SET");
  }

  if (!user.approved) {
    throw new Error("ACCOUNT_PENDING");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "" });

  return { user, sessionToken };
}

export async function createAccountRequest(email: string, name: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedEmail = email.toLowerCase().trim();

  // Check if already exists
  const existing = await db.select().from(accountRequests)
    .where(and(eq(accountRequests.email, normalizedEmail), eq(accountRequests.status, "pending")))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("REQUEST_ALREADY_EXISTS");
  }

  // Check if user already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existingUsers.length > 0) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  await db.insert(accountRequests).values({ email: normalizedEmail, name });
}

export async function approveAccountRequest(requestId: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const requests = await db.select().from(accountRequests).where(eq(accountRequests.id, requestId)).limit(1);
  if (requests.length === 0) throw new Error("REQUEST_NOT_FOUND");

  const request = requests[0];

  // Create user
  const openId = generateOpenId();
  await db.insert(users).values({
    openId,
    email: request.email,
    name: request.name,
    loginMethod: "magic_link",
    role: "user",
    approved: true,
  });

  // Update request
  await db.update(accountRequests).set({
    status: "approved",
    reviewedBy: adminId,
    reviewedAt: new Date(),
  }).where(eq(accountRequests.id, requestId));
}

export async function rejectAccountRequest(requestId: number, adminId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(accountRequests).set({
    status: "rejected",
    reviewedBy: adminId,
    reviewedAt: new Date(),
  }).where(eq(accountRequests.id, requestId));
}
