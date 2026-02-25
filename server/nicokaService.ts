/**
 * Service d'intégration API Nicoka
 * Récupère devis, commandes et opportunités avec rate limiting
 */

const RATE_LIMIT_DELAY = 100; // ms entre chaque appel
const RETRY_DELAY = 500; // ms en cas de 429

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

// ─── Public API ───

export interface NicokaQuotation {
  quotationid: number;
  uid: string;
  customerid: number;
  customerLabel?: string;
  projectid: number | null;
  reference: string;
  status: string;
  statusLabel?: string;
  gross_total: number;
  grand_total: number;
  date: string;
  signature_date: string | null;
  period_start: string | null;
  period_end: string | null;
  employeeid: number | null;
  assign_to_name: string | null;
}

export interface NicokaOrder {
  orderid: number;
  uid: string;
  customerid: number;
  customerLabel?: string;
  projectid: number | null;
  quotationid: number | null;
  opid: number | null;
  reference: number;
  status: string;
  statusLabel?: string;
  gross_total: number;
  grand_total: number;
  total_invoiced: number;
  still_to_invoice: number;
  date: string;
  signature_date: string | null;
  period_start: string | null;
  period_end: string | null;
}

export interface NicokaOpportunity {
  opid: number;
  label: string;
  type: string;
  typeLabel?: string;
  stage: string;
  stageLabel?: string;
  customerid: number;
  customerLabel?: string;
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

export async function fetchQuotations(): Promise<NicokaQuotation[]> {
  const raw = await fetchAllPaginated("/quotations");
  return raw.map((q: any) => ({
    quotationid: q.quotationid,
    uid: q.uid || "",
    customerid: q.customerid,
    customerLabel: q.customerLabel || q.customer_label || "",
    projectid: q.projectid || null,
    reference: q.reference || "",
    status: String(q.status || ""),
    statusLabel: q.statusLabel || q.status_label || "",
    gross_total: parseNumber(q.gross_total),
    grand_total: parseNumber(q.grand_total),
    date: q.date || "",
    signature_date: q.signature_date || null,
    period_start: q.period_start || null,
    period_end: q.period_end || null,
    employeeid: q.employeeid || null,
    assign_to_name: q.assign_to_name || null,
  }));
}

export async function fetchOrders(): Promise<NicokaOrder[]> {
  const raw = await fetchAllPaginated("/orders");
  return raw.map((o: any) => ({
    orderid: o.orderid,
    uid: o.uid || "",
    customerid: o.customerid,
    customerLabel: o.customerLabel || o.customer_label || "",
    projectid: o.projectid || null,
    quotationid: o.quotationid || null,
    opid: o.opid || null,
    reference: o.reference,
    status: String(o.status || ""),
    statusLabel: o.statusLabel || o.status_label || "",
    gross_total: parseNumber(o.gross_total),
    grand_total: parseNumber(o.grand_total),
    total_invoiced: parseNumber(o.total_invoiced),
    still_to_invoice: parseNumber(o.still_to_invoice),
    date: o.date || "",
    signature_date: o.signature_date || null,
    period_start: o.period_start || null,
    period_end: o.period_end || null,
  }));
}

export async function fetchOpportunities(): Promise<NicokaOpportunity[]> {
  const raw = await fetchAllPaginated("/opportunities");
  return raw.map((op: any) => ({
    opid: op.opid,
    label: op.label || "",
    type: String(op.type || ""),
    typeLabel: op.typeLabel || op.type_label || "",
    stage: String(op.stage || ""),
    stageLabel: op.stageLabel || op.stage_label || "",
    customerid: op.customerid,
    customerLabel: op.customerLabel || op.customer_label || "",
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
  }));
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
  // Opportunités dédoublonnées (sans devis ni commande)
  uniqueOpportunities: NicokaOpportunity[];
  // Devis dédoublonnés (sans commande associée)
  uniqueQuotations: NicokaQuotation[];
}

export async function fetchFunnelData(): Promise<FunnelData> {
  const [quotations, orders, opportunities] = await Promise.all([
    fetchQuotations(),
    fetchOrders(),
    fetchOpportunities(),
  ]);

  // Dédoublonnage : IDs de devis qui ont une commande
  const quotationIdsWithOrder = new Set(
    orders.filter((o) => o.quotationid).map((o) => o.quotationid!)
  );

  // Dédoublonnage : IDs d'opportunités qui ont un devis ou une commande
  const opportunityIdsWithOrder = new Set(
    orders.filter((o) => o.opid).map((o) => o.opid!)
  );

  // On ne peut pas directement lier opportunités → devis via l'API standard
  // On utilise les commandes comme pont : si une commande a un opid, l'opportunité est couverte
  // Pour les devis, on vérifie s'ils ont une commande via quotationid

  const uniqueQuotations = quotations.filter(
    (q) => !quotationIdsWithOrder.has(q.quotationid)
  );

  const uniqueOpportunities = opportunities.filter(
    (op) => !opportunityIdsWithOrder.has(op.opid)
  );

  return {
    quotations,
    orders,
    opportunities,
    uniqueOpportunities,
    uniqueQuotations,
  };
}

export interface LandingCalculation {
  // Montants certains (commandes)
  ordersTotal: number;
  ordersInvoiced: number;
  ordersRemaining: number;
  // Montants pondérés (devis uniques)
  quotationsWeightedTotal: number;
  quotationsRawTotal: number;
  // Montants pondérés (opportunités uniques)
  opportunitiesWeightedTotal: number;
  opportunitiesRawTotal: number;
  // Atterrissage total
  landingTotal: number;
  // Détails par catégorie
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

  // Commandes (certaines)
  const ordersTotal = orders.reduce((sum, o) => sum + o.gross_total, 0);
  const ordersInvoiced = orders.reduce((sum, o) => sum + o.total_invoiced, 0);
  const ordersRemaining = orders.reduce((sum, o) => sum + o.still_to_invoice, 0);

  // Devis pondérés
  const quotationsRawTotal = uniqueQuotations.reduce((sum, q) => sum + q.gross_total, 0);
  const quotationsWeightedTotal = uniqueQuotations.reduce((sum, q) => {
    const weight = quotationWeights[q.status] ?? 0.5;
    return sum + q.gross_total * weight;
  }, 0);

  // Opportunités pondérées
  const opportunitiesRawTotal = uniqueOpportunities.reduce((sum, op) => sum + op.amount, 0);
  const opportunitiesWeightedTotal = uniqueOpportunities.reduce((sum, op) => {
    const weight = opportunityWeights[op.stage] ?? 0.3;
    return sum + op.amount * weight;
  }, 0);

  return {
    ordersTotal,
    ordersInvoiced,
    ordersRemaining,
    quotationsWeightedTotal,
    quotationsRawTotal,
    opportunitiesWeightedTotal,
    opportunitiesRawTotal,
    landingTotal: ordersTotal + quotationsWeightedTotal + opportunitiesWeightedTotal,
    orderCount: orders.length,
    quotationCount: uniqueQuotations.length,
    opportunityCount: uniqueOpportunities.length,
  };
}
