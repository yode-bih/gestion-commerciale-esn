import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@rubix-consulting.com",
    name: "Test User",
    loginMethod: "magic-link",
    role,
    approved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("simulation routes", () => {
  it("simulation.list returns an array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.simulation.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("simulation.save validates required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should reject empty name
    await expect(
      caller.simulation.save({
        name: "",
        year: 2026,
        quotationWeights: {},
        opportunityWeights: {},
        totalAtterrissage: 1000000,
        totalCommandes: 500000,
        totalDevisPondere: 300000,
        totalOpportunitePondere: 200000,
        totalDevisBrut: 600000,
        totalOpportuniteBrut: 400000,
        nbCommandes: 10,
        nbDevis: 5,
        nbOpportunites: 20,
      })
    ).rejects.toThrow();
  });

  it("simulation.save accepts valid data with notes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.simulation.save({
      name: "Test Scenario Optimiste",
      year: 2026,
      quotationWeights: { "1": 0.8, "2": 0.5 },
      opportunityWeights: { "10": 0.3, "20": 0.6 },
      totalAtterrissage: 15000000,
      totalCommandes: 5000000,
      totalDevisPondere: 4000000,
      totalOpportunitePondere: 6000000,
      totalDevisBrut: 8000000,
      totalOpportuniteBrut: 20000000,
      nbCommandes: 74,
      nbDevis: 33,
      nbOpportunites: 298,
      notes: "Hypothèse: taux de conversion devis amélioré",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("simulation.list returns saved simulation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.simulation.list();
    const found = list.find((s: any) => s.name === "Test Scenario Optimiste");
    expect(found).toBeDefined();
    expect(parseFloat(found!.totalAtterrissage)).toBe(15000000);
    expect(found!.nbCommandes).toBe(74);
    expect(found!.notes).toBe("Hypothèse: taux de conversion devis amélioré");
  });

  it("simulation.delete removes a simulation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const list = await caller.simulation.list();
    const sim = list.find((s: any) => s.name === "Test Scenario Optimiste");
    expect(sim).toBeDefined();

    const result = await caller.simulation.delete({ id: sim!.id });
    expect(result.success).toBe(true);

    const listAfter = await caller.simulation.list();
    const notFound = listAfter.find((s: any) => s.name === "Test Scenario Optimiste");
    expect(notFound).toBeUndefined();
  });
});
