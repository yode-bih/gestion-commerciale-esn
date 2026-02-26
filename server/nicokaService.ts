/**
 * Service d'intégration API Nicoka
 * Récupère devis, commandes et opportunités avec rate limiting
 * Enrichit les données avec noms clients, projets et labels de statuts
 */

const RATE_LIMIT_DELAY = 100; // ms entre chaque appel
const RETRY_DELAY = 500; // ms en cas de 429

// ─── Mappings de statuts (depuis api.nicoka.com/page_SALES et page_CRM) ───

export const QUOTATION_STATUS_MAP: Record<number, string> = {
  1: "Nouveau",
  2: "Ouvert",
  3: "Brouillon",
  4: "Publié",
  5: "Auto validé",
  6: "Facturé",
  9: "Refusé",
  12: "Envoyé au client",
  13: "En attente validation interne",
  14: "A transmettre au client",
  15: "En cours",
  16: "Accepté",
  17: "Expiré",
  18: "Lu",
  90: "Envoyé en signature",
  91: "Signé",
  92: "Signature refusée",
  100: "Terminé",
  101: "Perdu",
  102: "Annulé",
};

export const ORDER_STATUS_MAP: Record<number, string> = {
  1: "Brouillon",
  2: "Envoyé pour validation",
  3: "Annulé",
  4: "Validé",
  5: "Auto validé",
  6: "Facturé",
  7: "Payé",
  8: "Paiement Partiel",
  9: "Refusé",
  10: "Révision",
  11: "Remboursement effectué",
  12: "Envoyé au client",
  13: "En attente validation interne",
  14: "A transmettre au client",
  15: "En cours",
  16: "Accepté",
  17: "Expiré",
  18: "Lu",
  20: "En Att. de paiement",
  21: "Partiellement Facturé",
  89: "Envoyé au PDP",
  90: "Envoyé en signature",
  91: "Signé",
  92: "Signature refusée",
  99: "Relance pour impayé",
  100: "Terminé",
  101: "Perdu",
  102: "Annulé",
};

export const OPPORTUNITY_STAGE_MAP: Record<number, string> = {
  1: "Qualification",
  2: "Besoin d'info.",
  3: "Proposition",
  4: "Négociation",
  5: "Gagné",
  99: "Perdu",
  100: "Annulé",
};

export const OPPORTUNITY_TYPE_MAP: Record<number, string> = {
  1: "Business Existant",
  2: "Nouveau Business",
  3: "Consulting",
};

function getBaseUrl(): string {
  const subdomain = process.env.NICOKA_SUBDOMAIN || "rubix-consulting";
  return `https://${subdomain}.nicoka.com/api`;
}

function getHeaders(): Record<string, string> {
  const token = process.env.NICOKA_API_TOKEN;
  if (!token) throw new Error("NICOKA_API_TOKEN non configuré");
  return { Authorization: `Bearer ${token}` };
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  const headers = getHeaders();
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, { headers });
    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Nicoka API error: ${response.status} - ${await response.text()}`);
    }
    return response.json();
  }
  throw new Error("Nicoka API: max retries exceeded");
}

async function fetchAllPaginated(endpoint: string, params: Record<string, string> = {}): Promise<any[]> {
  const baseUrl = getBaseUrl();
  const allData: any[] = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const queryParams = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) });
    const url = `${baseUrl}${endpoint}?${queryParams}`;
    const result = await fetchWithRetry(url);

    const data = result.data || result;
    if (Array.isArray(data)) {
      allData.push(...data);
    } else {
      break;
    }

    if (!result.pages || offset + limit >= (result.total || 0)) break;
    offset += limit;
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));
  }

  return allData;
}

// ─── Fetch customers for name resolution ───

interface NicokaCustomer {
  customerid: number;
  label: string;
  name1: string;
  name2: string;
  accountNumber: string;
}

// Cache clients en mémoire pour éviter de les recharger à chaque appel
let _customersCache: Map<number, NicokaCustomer> | null = null;
let _customersCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchCustomers(): Promise<Map<number, NicokaCustomer>> {
  const now = Date.now();
  if (_customersCache && (now - _customersCacheTime) < CACHE_TTL) {
    return _customersCache;
  }

  const raw = await fetchAllPaginated("/customers");
  const map = new Map<number, NicokaCustomer>();
  for (const c of raw) {
    map.set(c.customerid, {
      customerid: c.customerid,
      label: c.label || c.name1 || "",
      name1: c.name1 || "",
      name2: c.name2 || "",
      accountNumber: c.account_number || "",
    });
  }
  _customersCache = map;
  _customersCacheTime = now;
  return map;
}

// ─── Fetch projects for enrichment ───

interface NicokaProject {
  projectid: number;
  label: string;
  customerid: number;
}

// Cache projets
let _projectsCache: Map<number, NicokaProject> | null = null;
let _projectsCacheTime = 0;

async function fetchProjects(): Promise<Map<number, NicokaProject>> {
  const now = Date.now();
  if (_projectsCache && (now - _projectsCacheTime) < CACHE_TTL) {
    return _projectsCache;
  }

  const raw = await fetchAllPaginated("/projects");
  const map = new Map<number, NicokaProject>();
  for (const p of raw) {
    map.set(p.projectid, {
      projectid: p.projectid,
      label: p.label || "",
      customerid: p.customerid,
    });
  }
  _projectsCache = map;
  _projectsCacheTime = now;
  return map;
}

// ─── Public API ───

export interface NicokaQuotation {
  quotationid: number;
  uid: string;
  label: string;
  customerid: number;
  customerName: string;
  accountNumber: string;
  projectid: number | null;
  reference: string;
  status: number;
  statusLabel: string;
  gross_total: number;
  grand_total: number;
  date: string;
  signature_date: string | null;
  period_start: string | null;
  period_end: string | null;
  employeeid: number | null;
  assign_to_name: string | null;
  opid: number | null;
}

export interface NicokaOrder {
  orderid: number;
  uid: string;
  label: string;
  customerid: number;
  customerName: string;
  accountNumber: string;
  projectid: number | null;
  projectLabel: string;
  quotationid: number | null;
  opid: number | null;
  reference: string;
  status: number;
  statusLabel: string;
  gross_total: number;
  grand_total: number;
  total_invoiced: number;
  still_to_invoice: number;
  date: string;
  signature_date: string | null;
  period_start: string | null;
  period_end: string | null;
  assign_to_name: string | null;
}

export interface NicokaOpportunity {
  opid: number;
  label: string;
  type: number;
  typeLabel: string;
  stage: number;
  stageLabel: string;
  customerid: number;
  customerName: string;
  amount: number;
  probability: number | null;
  close_date: string | null;
  quantity: number | null;
  price: number | null;
  cost: number | null;
  margin: number | null;
  assign_to_name: string | null;
  period_start: string | null;
  period_end: string | null;
}

function parseNumber(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

export async function fetchQuotations(customersMap: Map<number, NicokaCustomer>): Promise<NicokaQuotation[]> {
  const raw = await fetchAllPaginated("/quotations");
  return raw.map((q: any) => {
    const customer = customersMap.get(q.customerid);
    return {
      quotationid: q.quotationid,
      uid: q.uid || "",
      label: q.label || q.reference || "",
      customerid: q.customerid,
      customerName: customer?.label || "",
      accountNumber: customer?.accountNumber || "",
      projectid: q.projectid || null,
      reference: q.reference || "",
      status: parseInt(String(q.status || 0)),
      statusLabel: QUOTATION_STATUS_MAP[parseInt(String(q.status || 0))] || `Statut ${q.status}`,
      gross_total: parseNumber(q.gross_total),
      grand_total: parseNumber(q.grand_total),
      date: q.date || "",
      signature_date: q.signature_date || null,
      period_start: q.period_start || null,
      period_end: q.period_end || null,
      employeeid: q.employeeid || null,
      assign_to_name: q.assign_to_name || null,
      opid: q.opid || null,
    };
  });
}

export async function fetchOrders(customersMap: Map<number, NicokaCustomer>, projectsMap: Map<number, NicokaProject>): Promise<NicokaOrder[]> {
  const raw = await fetchAllPaginated("/orders");
  return raw.map((o: any) => {
    const customer = customersMap.get(o.customerid);
    const projectId = o.projectid || null;
    const project = projectId ? projectsMap.get(projectId) : null;
    return {
      orderid: o.orderid,
      uid: o.uid || "",
      label: o.label || o.reference || "",
      customerid: o.customerid,
      customerName: customer?.label || "",
      accountNumber: customer?.accountNumber || "",
      projectid: projectId,
      projectLabel: project?.label || "",
      quotationid: o.quotationid || null,
      opid: o.opid || null,
      reference: String(o.reference || ""),
      status: parseInt(String(o.status || 0)),
      statusLabel: ORDER_STATUS_MAP[parseInt(String(o.status || 0))] || `Statut ${o.status}`,
      gross_total: parseNumber(o.gross_total),
      grand_total: parseNumber(o.grand_total),
      total_invoiced: parseNumber(o.total_invoiced),
      still_to_invoice: parseNumber(o.still_to_invoice),
      date: o.date || "",
      signature_date: o.signature_date || null,
      period_start: o.period_start || null,
      period_end: o.period_end || null,
      assign_to_name: o.assign_to_name || null,
    };
  });
}

export async function fetchOpportunities(customersMap: Map<number, NicokaCustomer>): Promise<NicokaOpportunity[]> {
  const raw = await fetchAllPaginated("/opportunities");
  return raw.map((op: any) => {
    const customer = customersMap.get(op.customerid);
    return {
      opid: op.opid,
      label: op.label || "",
      type: parseInt(String(op.type || 0)),
      typeLabel: OPPORTUNITY_TYPE_MAP[parseInt(String(op.type || 0))] || `Type ${op.type}`,
      stage: parseInt(String(op.stage || 0)),
      stageLabel: OPPORTUNITY_STAGE_MAP[parseInt(String(op.stage || 0))] || `Étape ${op.stage}`,
      customerid: op.customerid,
      customerName: customer?.label || "",
      amount: parseNumber(op.amount),
      probability: op.probability !== null ? parseNumber(op.probability) : null,
      close_date: op.close_date || null,
      quantity: op.quantity !== null ? parseNumber(op.quantity) : null,
      price: op.price !== null ? parseNumber(op.price) : null,
      cost: op.cost !== null ? parseNumber(op.cost) : null,
      margin: op.margin !== null ? parseNumber(op.margin) : null,
      assign_to_name: op.assign_to_name || null,
      period_start: op.period_start || null,
      period_end: op.period_end || null,
    };
  });
}

/**
 * Récupère toutes les données et calcule l'atterrissage
 * Logique de dédoublonnage : les opportunités ne sont comptées que si
 * aucun devis ou commande n'y est associé.
 */
export interface FunnelData {
  quotations: NicokaQuotation[];
  orders: NicokaOrder[];
  opportunities: NicokaOpportunity[];
  allQuotations: NicokaQuotation[];
  allOrders: NicokaOrder[];
  uniqueOpportunities: NicokaOpportunity[];
  uniqueQuotations: NicokaQuotation[];
}

export async function fetchFunnelData(year?: number): Promise<FunnelData> {
  // Fetch reference data first (customers + projects)
  const [customersMap, projectsMap] = await Promise.all([
    fetchCustomers(),
    fetchProjects(),
  ]);

  // Fetch business data with enrichment
  const [quotations, orders, opportunities] = await Promise.all([
    fetchQuotations(customersMap),
    fetchOrders(customersMap, projectsMap),
    fetchOpportunities(customersMap),
  ]);

  // Filtrer par année en cours (commandes et devis)
  const targetYear = year || new Date().getFullYear();
  const filterByYear = (dateStr: string | null | undefined, periodStart: string | null | undefined, periodEnd: string | null | undefined): boolean => {
    if (periodStart && periodEnd) {
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      const yearStart = new Date(`${targetYear}-01-01`);
      const yearEnd = new Date(`${targetYear}-12-31`);
      return start <= yearEnd && end >= yearStart;
    }
    if (dateStr) {
      const d = new Date(dateStr);
      return d.getFullYear() === targetYear;
    }
    return true;
  };

  const filteredOrders = orders.filter((o) => filterByYear(o.date, o.period_start, o.period_end));
  const filteredQuotations = quotations.filter((q) => filterByYear(q.date, q.period_start, q.period_end));

  // Dédoublonnage : IDs de devis qui ont une commande
  const quotationIdsWithOrder = new Set(
    filteredOrders.filter((o) => o.quotationid).map((o) => o.quotationid!)
  );

  // Dédoublonnage : IDs d'opportunités qui ont une commande
  const opportunityIdsWithOrder = new Set(
    filteredOrders.filter((o) => o.opid).map((o) => o.opid!)
  );

  // IDs d'opportunités qui ont un devis (même sans commande)
  const opportunityIdsWithQuotation = new Set(
    filteredQuotations.filter((q) => q.opid).map((q) => q.opid!)
  );

  const uniqueQuotations = filteredQuotations.filter(
    (q) => !quotationIdsWithOrder.has(q.quotationid)
  );

  const uniqueOpportunities = opportunities.filter(
    (op) => !opportunityIdsWithOrder.has(op.opid) && !opportunityIdsWithQuotation.has(op.opid)
  );

  return {
    quotations: filteredQuotations,
    orders: filteredOrders,
    opportunities,
    allQuotations: quotations,
    allOrders: orders,
    uniqueOpportunities,
    uniqueQuotations,
  };
}

export interface LandingCalculation {
  ordersTotal: number;
  ordersInvoiced: number;
  ordersRemaining: number;
  quotationsWeightedTotal: number;
  quotationsRawTotal: number;
  opportunitiesWeightedTotal: number;
  opportunitiesRawTotal: number;
  landingTotal: number;
  orderCount: number;
  quotationCount: number;
  opportunityCount: number;
}

export function calculateLanding(
  funnelData: FunnelData,
  quotationWeights: Record<string, number>,
  opportunityWeights: Record<string, number>
): LandingCalculation {
  const { orders, uniqueQuotations, uniqueOpportunities } = funnelData;

  const ordersTotal = orders.reduce((sum, o) => sum + o.gross_total, 0);
  const ordersInvoiced = orders.reduce((sum, o) => sum + o.total_invoiced, 0);
  const ordersRemaining = orders.reduce((sum, o) => sum + o.still_to_invoice, 0);

  const quotationsRawTotal = uniqueQuotations.reduce((sum, q) => sum + q.gross_total, 0);
  const quotationsWeightedTotal = uniqueQuotations.reduce((sum, q) => {
    const weight = quotationWeights[String(q.status)] ?? 0.5;
    return sum + q.gross_total * weight;
  }, 0);

  const opportunitiesRawTotal = uniqueOpportunities.reduce((sum, op) => sum + op.amount, 0);
  const opportunitiesWeightedTotal = uniqueOpportunities.reduce((sum, op) => {
    const weight = opportunityWeights[String(op.stage)] ?? 0.3;
    return sum + op.amount * weight;
  }, 0);

  const landingTotal = ordersTotal + quotationsWeightedTotal + opportunitiesWeightedTotal;

  return {
    ordersTotal,
    ordersInvoiced,
    ordersRemaining,
    quotationsWeightedTotal,
    quotationsRawTotal,
    opportunitiesWeightedTotal,
    opportunitiesRawTotal,
    landingTotal,
    orderCount: orders.length,
    quotationCount: uniqueQuotations.length,
    opportunityCount: uniqueOpportunities.length,
  };
}
