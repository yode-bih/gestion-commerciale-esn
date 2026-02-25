import { describe, expect, it } from "vitest";
import { calculateLanding, type FunnelData, type NicokaQuotation, type NicokaOrder, type NicokaOpportunity } from "./nicokaService";

function makeOrder(overrides: Partial<NicokaOrder> = {}): NicokaOrder {
  return {
    orderid: 1,
    uid: "CMD-001",
    customerid: 100,
    customerLabel: "Client A",
    projectid: null,
    quotationid: null,
    opid: null,
    reference: 1,
    status: "1",
    statusLabel: "Active",
    gross_total: 10000,
    grand_total: 12000,
    total_invoiced: 5000,
    still_to_invoice: 5000,
    date: "2026-01-15",
    signature_date: null,
    period_start: null,
    period_end: null,
    ...overrides,
  };
}

function makeQuotation(overrides: Partial<NicokaQuotation> = {}): NicokaQuotation {
  return {
    quotationid: 1,
    uid: "DEV-001",
    customerid: 100,
    customerLabel: "Client A",
    projectid: null,
    reference: "REF-001",
    status: "2",
    statusLabel: "En cours",
    gross_total: 20000,
    grand_total: 24000,
    date: "2026-02-01",
    signature_date: null,
    period_start: null,
    period_end: null,
    employeeid: null,
    assign_to_name: null,
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<NicokaOpportunity> = {}): NicokaOpportunity {
  return {
    opid: 1,
    label: "Opportunité Test",
    type: "1",
    typeLabel: "Régie",
    stage: "3",
    stageLabel: "Qualification",
    customerid: 100,
    customerLabel: "Client A",
    amount: 50000,
    probability: 40,
    close_date: "2026-06-01",
    quantity: null,
    price: null,
    cost: null,
    margin: null,
    assign_to_name: "Jean Dupont",
    period_start: null,
    period_end: null,
    ...overrides,
  };
}

describe("calculateLanding", () => {
  it("calculates landing total from orders, quotations and opportunities", () => {
    const funnelData: FunnelData = {
      quotations: [makeQuotation()],
      orders: [makeOrder()],
      opportunities: [makeOpportunity()],
      uniqueQuotations: [makeQuotation()],
      uniqueOpportunities: [makeOpportunity()],
    };

    const quotationWeights: Record<string, number> = { "2": 0.7 };
    const opportunityWeights: Record<string, number> = { "3": 0.3 };

    const result = calculateLanding(funnelData, quotationWeights, opportunityWeights);

    expect(result.ordersTotal).toBe(10000);
    expect(result.ordersInvoiced).toBe(5000);
    expect(result.ordersRemaining).toBe(5000);
    expect(result.quotationsRawTotal).toBe(20000);
    expect(result.quotationsWeightedTotal).toBe(14000); // 20000 * 0.7
    expect(result.opportunitiesRawTotal).toBe(50000);
    expect(result.opportunitiesWeightedTotal).toBe(15000); // 50000 * 0.3
    expect(result.landingTotal).toBe(39000); // 10000 + 14000 + 15000
    expect(result.orderCount).toBe(1);
    expect(result.quotationCount).toBe(1);
    expect(result.opportunityCount).toBe(1);
  });

  it("uses default weights when status not configured", () => {
    const funnelData: FunnelData = {
      quotations: [makeQuotation({ status: "99" })],
      orders: [],
      opportunities: [makeOpportunity({ stage: "99" })],
      uniqueQuotations: [makeQuotation({ status: "99" })],
      uniqueOpportunities: [makeOpportunity({ stage: "99" })],
    };

    const result = calculateLanding(funnelData, {}, {});

    // Default quotation weight is 0.5, default opportunity weight is 0.3
    expect(result.quotationsWeightedTotal).toBe(10000); // 20000 * 0.5
    expect(result.opportunitiesWeightedTotal).toBe(15000); // 50000 * 0.3
    expect(result.landingTotal).toBe(25000);
  });

  it("handles empty data correctly", () => {
    const funnelData: FunnelData = {
      quotations: [],
      orders: [],
      opportunities: [],
      uniqueQuotations: [],
      uniqueOpportunities: [],
    };

    const result = calculateLanding(funnelData, {}, {});

    expect(result.ordersTotal).toBe(0);
    expect(result.quotationsWeightedTotal).toBe(0);
    expect(result.opportunitiesWeightedTotal).toBe(0);
    expect(result.landingTotal).toBe(0);
    expect(result.orderCount).toBe(0);
    expect(result.quotationCount).toBe(0);
    expect(result.opportunityCount).toBe(0);
  });

  it("correctly deduplicates quotations with orders", () => {
    const order = makeOrder({ orderid: 1, quotationid: 10 });
    const quotationWithOrder = makeQuotation({ quotationid: 10, gross_total: 30000 });
    const quotationWithoutOrder = makeQuotation({ quotationid: 20, gross_total: 15000 });

    // uniqueQuotations should only contain the one without an order
    const funnelData: FunnelData = {
      quotations: [quotationWithOrder, quotationWithoutOrder],
      orders: [order],
      opportunities: [],
      uniqueQuotations: [quotationWithoutOrder], // already deduplicated
      uniqueOpportunities: [],
    };

    const result = calculateLanding(funnelData, { "2": 0.8 }, {});

    expect(result.quotationCount).toBe(1);
    expect(result.quotationsRawTotal).toBe(15000);
    expect(result.quotationsWeightedTotal).toBe(12000); // 15000 * 0.8
  });

  it("correctly deduplicates opportunities with orders", () => {
    const order = makeOrder({ orderid: 1, opid: 5 });
    const opportunityWithOrder = makeOpportunity({ opid: 5, amount: 80000 });
    const opportunityWithoutOrder = makeOpportunity({ opid: 10, amount: 40000 });

    const funnelData: FunnelData = {
      quotations: [],
      orders: [order],
      opportunities: [opportunityWithOrder, opportunityWithoutOrder],
      uniqueQuotations: [],
      uniqueOpportunities: [opportunityWithoutOrder], // already deduplicated
    };

    const result = calculateLanding(funnelData, {}, { "3": 0.5 });

    expect(result.opportunityCount).toBe(1);
    expect(result.opportunitiesRawTotal).toBe(40000);
    expect(result.opportunitiesWeightedTotal).toBe(20000); // 40000 * 0.5
    expect(result.landingTotal).toBe(10000 + 20000); // order + opportunity
  });

  it("handles multiple items and sums correctly", () => {
    const orders = [
      makeOrder({ orderid: 1, gross_total: 10000, total_invoiced: 3000, still_to_invoice: 7000 }),
      makeOrder({ orderid: 2, gross_total: 25000, total_invoiced: 25000, still_to_invoice: 0 }),
    ];
    const quotations = [
      makeQuotation({ quotationid: 1, status: "1", gross_total: 15000 }),
      makeQuotation({ quotationid: 2, status: "2", gross_total: 30000 }),
    ];
    const opportunities = [
      makeOpportunity({ opid: 1, stage: "1", amount: 20000 }),
      makeOpportunity({ opid: 2, stage: "2", amount: 60000 }),
    ];

    const funnelData: FunnelData = {
      quotations,
      orders,
      opportunities,
      uniqueQuotations: quotations,
      uniqueOpportunities: opportunities,
    };

    const qWeights = { "1": 0.9, "2": 0.6 };
    const oWeights = { "1": 0.2, "2": 0.5 };

    const result = calculateLanding(funnelData, qWeights, oWeights);

    expect(result.ordersTotal).toBe(35000);
    expect(result.ordersInvoiced).toBe(28000);
    expect(result.ordersRemaining).toBe(7000);
    expect(result.quotationsRawTotal).toBe(45000);
    expect(result.quotationsWeightedTotal).toBe(15000 * 0.9 + 30000 * 0.6); // 13500 + 18000 = 31500
    expect(result.opportunitiesRawTotal).toBe(80000);
    expect(result.opportunitiesWeightedTotal).toBe(20000 * 0.2 + 60000 * 0.5); // 4000 + 30000 = 34000
    expect(result.landingTotal).toBe(35000 + 31500 + 34000); // 100500
  });
});
