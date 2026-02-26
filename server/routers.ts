import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  createMagicLink, verifyMagicLinkToken, loginWithPassword,
  createAccountRequest, approveAccountRequest, rejectAccountRequest,
  buildMagicLinkUrl, buildMagicLinkEmailHtml, isAutoApproved,
} from "./emailAuth";
import { sendEmail } from "./emailService";
import {
  fetchFunnelData, calculateLanding,
  QUOTATION_STATUS_MAP, ORDER_STATUS_MAP, OPPORTUNITY_STAGE_MAP, OPPORTUNITY_TYPE_MAP,
} from "./nicokaService";
import type { FunnelData } from "./nicokaService";

// ─── Cache helper : serve from DB, fetch from Nicoka in background ───

const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

async function getFunnelDataCached(year: number): Promise<{ data: any; lastSync: Date | null; fromCache: boolean }> {
  // Try cache first
  const cached = await db.getCachedData("funnel_snapshot", year);
  if (cached && cached.data) {
    const age = Date.now() - new Date(cached.syncedAt).getTime();
    if (age < CACHE_MAX_AGE) {
      return { data: cached.data, lastSync: cached.syncedAt, fromCache: true };
    }
  }

  // Cache miss or stale: fetch from Nicoka
  const result = await fetchAndCacheFunnelData(year);
  return { data: result, lastSync: new Date(), fromCache: false };
}

async function fetchAndCacheFunnelData(year: number) {
  const funnelData = await fetchFunnelData(year);
  const qWeights = await db.getQuotationWeights();
  const oWeights = await db.getOpportunityWeights();
  const quotationWeightsMap: Record<string, number> = {};
  qWeights.forEach((w) => { quotationWeightsMap[w.statusId] = parseFloat(String(w.weight)); });
  const opportunityWeightsMap: Record<string, number> = {};
  oWeights.forEach((w) => { opportunityWeightsMap[w.statusId] = parseFloat(String(w.weight)); });
  const landing = calculateLanding(funnelData, quotationWeightsMap, opportunityWeightsMap);

  const result = {
    ...landing,
    quotations: funnelData.uniqueQuotations,
    orders: funnelData.orders,
    opportunities: funnelData.uniqueOpportunities,
    allQuotations: funnelData.quotations,
    allOpportunities: funnelData.opportunities,
  };

  // Save to cache
  try {
    await db.setCachedData("funnel_snapshot", year, result);
  } catch (e) {
    console.warn("[Cache] Failed to save funnel snapshot:", e);
  }

  return result;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    sendMagicLink: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const { token } = await createMagicLink(input.email);
          const magicLinkUrl = buildMagicLinkUrl(ctx.req, token);
          const html = buildMagicLinkEmailHtml(magicLinkUrl);
          await sendEmail({
            to: input.email.toLowerCase().trim(),
            subject: "Connexion à Funnel Commercial ESN",
            html,
          });
          return { message: "Un lien de connexion a été envoyé à votre adresse email." };
        } catch (error: any) {
          if (error.message === "ACCOUNT_NOT_FOUND") {
            return { error: "Aucun compte trouvé pour cette adresse. Demandez un accès à un administrateur." };
          }
          if (error.message === "ACCOUNT_PENDING") {
            return { error: "Votre demande de compte est en attente d'approbation." };
          }
          throw error;
        }
      }),

    verifyMagicLink: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const { user, sessionToken } = await verifyMagicLinkToken(input.token);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          return { success: true, user };
        } catch (error: any) {
          if (error.message === "INVALID_TOKEN") {
            return { success: false, error: "Lien invalide ou déjà utilisé." };
          }
          if (error.message === "TOKEN_EXPIRED") {
            return { success: false, error: "Ce lien a expiré. Veuillez en demander un nouveau." };
          }
          throw error;
        }
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const { user, sessionToken } = await loginWithPassword(input.email, input.password);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          return { success: true, user };
        } catch (error: any) {
          if (error.message === "INVALID_CREDENTIALS" || error.message === "NO_PASSWORD_SET") {
            return { success: false, error: "Identifiants invalides." };
          }
          if (error.message === "ACCOUNT_PENDING") {
            return { success: false, error: "Votre compte est en attente d'approbation." };
          }
          throw error;
        }
      }),

    requestAccount: publicProcedure
      .input(z.object({ email: z.string().email(), name: z.string().min(2) }))
      .mutation(async ({ input }) => {
        try {
          await createAccountRequest(input.email, input.name);
          return { message: "Votre demande a été envoyée. Un administrateur la traitera prochainement." };
        } catch (error: any) {
          if (error.message === "REQUEST_ALREADY_EXISTS") {
            return { error: "Une demande est déjà en cours pour cette adresse." };
          }
          if (error.message === "USER_ALREADY_EXISTS") {
            return { error: "Un compte existe déjà pour cette adresse." };
          }
          throw error;
        }
      }),

    checkAutoApprove: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(({ input }) => {
        return { autoApproved: isAutoApproved(input.email) };
      }),
  }),

  statusMaps: router({
    getAll: publicProcedure.query(() => ({
      quotationStatuses: QUOTATION_STATUS_MAP,
      orderStatuses: ORDER_STATUS_MAP,
      opportunityStages: OPPORTUNITY_STAGE_MAP,
      opportunityTypes: OPPORTUNITY_TYPE_MAP,
    })),
  }),

  funnel: router({
    // getData sert les données depuis le cache DB — chargement instantané
    getData: protectedProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const year = input?.year || new Date().getFullYear();
        const { data, lastSync, fromCache } = await getFunnelDataCached(year);
        return { ...data, lastSync, fromCache };
      }),

    // sync force un rechargement depuis l'API Nicoka et met à jour le cache
    sync: protectedProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .mutation(async ({ input }) => {
        const year = input?.year || new Date().getFullYear();
        const result = await fetchAndCacheFunnelData(year);
        return { ...result, lastSync: new Date(), fromCache: false };
      }),

    // lastSync retourne la date du dernier sync
    lastSync: protectedProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const year = input?.year || new Date().getFullYear();
        const lastSync = await db.getLastSyncDate(year);
        return { lastSync };
      }),

    simulate: protectedProcedure
      .input(z.object({
        quotationWeights: z.record(z.string(), z.number()),
        opportunityWeights: z.record(z.string(), z.number()),
        year: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const year = input.year || new Date().getFullYear();
        const funnelData = await fetchFunnelData(year);
        return calculateLanding(funnelData, input.quotationWeights, input.opportunityWeights);
      }),
  }),

  admin: router({
    getQuotationWeights: adminProcedure.query(async () => db.getQuotationWeights()),
    upsertQuotationWeight: adminProcedure
      .input(z.object({ statusId: z.string(), statusLabel: z.string(), weight: z.number().min(0).max(1), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.upsertQuotationWeight(input.statusId, input.statusLabel, input.weight, input.description);
        return { success: true };
      }),
    getOpportunityWeights: adminProcedure.query(async () => db.getOpportunityWeights()),
    upsertOpportunityWeight: adminProcedure
      .input(z.object({ statusId: z.string(), statusLabel: z.string(), weight: z.number().min(0).max(1), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.upsertOpportunityWeight(input.statusId, input.statusLabel, input.weight, input.description);
        return { success: true };
      }),
    getPendingRequests: adminProcedure.query(async () => db.getPendingAccountRequests()),
    getAllRequests: adminProcedure.query(async () => db.getAllAccountRequests()),
    approveRequest: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await approveAccountRequest(input.requestId, ctx.user.id);
        return { success: true };
      }),
    rejectRequest: adminProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await rejectAccountRequest(input.requestId, ctx.user.id);
        return { success: true };
      }),
    getScenarios: adminProcedure.query(async () => db.getSimulationScenarios()),
    createScenario: adminProcedure
      .input(z.object({
        name: z.string(), year: z.number(),
        quotationWeightsOverride: z.record(z.string(), z.number()).optional(),
        opportunityWeightsOverride: z.record(z.string(), z.number()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createSimulationScenario({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
