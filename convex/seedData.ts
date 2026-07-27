// Demo dataset mirroring the prototype site. Foundation/organisation names
// are kept for fidelity; individual donors are fictionalised.
// Currency values are in pence (minor units). Dates are ms epochs built
// from an anchor "now" passed in by the seed mutation.

export const DEMO_PASSWORD = "demo2026!";
export const DEMO_ADMIN_EMAIL = "admin@demo.thedifference.org";
export const DEMO_USER_EMAIL = "user@demo.thedifference.org";

type FieldSeed = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "currency"
    | "date"
    | "select"
    | "multiselect"
    | "relation"
    | "url"
    | "email";
  options?: Array<string>;
  relationTo?: string;
  required?: boolean;
  searchable?: boolean;
  showInList?: boolean;
  group?: string;
  systemMapping?:
    | "name"
    | "stage"
    | "status"
    | "amountMinor"
    | "dueAt"
    | "parentId";
};

export const ENTITY_TYPES = [
  { key: "contact", label: "Contact", labelPlural: "Contacts" },
  { key: "organisation", label: "Organisation", labelPlural: "Organisations" },
  { key: "gift", label: "Gift", labelPlural: "Committed gifts" },
  { key: "pipeline", label: "Pipeline prospect", labelPlural: "Pipeline" },
  { key: "deadline", label: "Deadline", labelPlural: "Deadlines" },
];

export const FIELD_DEFS: Record<string, Array<FieldSeed>> = {
  contact: [
    { key: "name", label: "Name", type: "text", required: true, searchable: true, systemMapping: "name" },
    { key: "role", label: "Role", type: "text", searchable: true, showInList: true, group: "Details" },
    { key: "organisation", label: "Organisation", type: "relation", relationTo: "organisation", showInList: true, systemMapping: "parentId", group: "Details" },
    { key: "email", label: "Email", type: "email", group: "Details" },
    { key: "region", label: "Region", type: "text", group: "Details" },
    { key: "warmth", label: "Relationship", type: "select", options: ["Cold", "Warm", "Very warm", "Lapsed"], showInList: true, systemMapping: "status", group: "Relationship" },
    { key: "relationshipScore", label: "Relationship score", type: "number", group: "Relationship" },
    { key: "primaryOwner", label: "Primary owner", type: "text", group: "Relationship" },
    { key: "tags", label: "Tags", type: "multiselect", options: ["DSP yr 2", "DSP 2026", "ILC c.3", "ILC London", "ILC alumni", "ILC 2026/27", "Policy", "Partnership", "Funder contact", "Major donor", "Press", "Prospect", "Top 20", "Active grant", "Trust CEO", "IncludEd speaker", "LA partner"], searchable: true, showInList: true, group: "Details" },
    { key: "source", label: "Source", type: "text", group: "Details" },
    { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
  ],
  organisation: [
    { key: "name", label: "Name", type: "text", required: true, searchable: true, systemMapping: "name" },
    { key: "orgType", label: "Type", type: "select", options: ["School", "MAT", "Local authority", "Funder", "Corporate Foundation", "Press", "Government", "Other"], required: true, showInList: true, systemMapping: "stage", group: "Details" },
    { key: "region", label: "Region", type: "text", showInList: true, group: "Details" },
    { key: "urn", label: "School URN", type: "text", searchable: true, group: "School data" },
    { key: "la", label: "Local authority", type: "text", group: "School data" },
    { key: "ofsted", label: "Ofsted", type: "select", options: ["Outstanding", "Good", "Requires improvement", "Inadequate"], group: "School data" },
    { key: "roll", label: "Roll (pupils)", type: "number", group: "School data" },
    { key: "paRate", label: "PA rate %", type: "number", group: "School data" },
    { key: "warmth", label: "Relationship", type: "select", options: ["Cold", "Warm", "Very warm", "Lapsed"], systemMapping: "status", group: "Relationship" },
    { key: "primaryOwner", label: "Primary owner", type: "text", group: "Relationship" },
    { key: "tags", label: "Tags", type: "multiselect", options: ["Active grant", "Regrant", "Programmes", "DSP yr 2", "DSP 2026", "ILC", "ILC partner", "Partnership", "Prospect", "DSP interest", "Report due", "Policy", "Sensitive", "Press", "Qualifying", "Good", "Outstanding"], searchable: true, showInList: true, group: "Details" },
    { key: "website", label: "Website", type: "url", group: "Details" },
    { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
  ],
  gift: [
    { key: "name", label: "Funder", type: "text", required: true, searchable: true, systemMapping: "name" },
    { key: "funderOrg", label: "Funder organisation", type: "relation", relationTo: "organisation", systemMapping: "parentId", group: "Details" },
    { key: "funderType", label: "Type", type: "select", options: ["Individual", "Corp Foundation", "Trust & Foundation", "Corporate", "Gift Aid"], showInList: true, group: "Details" },
    { key: "budgetCategory", label: "Budget category", type: "select", options: ["Restricted — programmes", "Restricted — influencing", "Restricted — other", "Unrestricted grants", "Unrestricted donations", "Sponsorship", "Gift Aid"], showInList: true, group: "Details" },
    { key: "financialYear", label: "Financial year", type: "select", options: ["22/23", "23/24", "24/25", "25/26", "26/27", "27/28"], required: true, group: "Details" },
    { key: "pledge", label: "Committed (FY)", type: "currency", systemMapping: "amountMinor", showInList: true, group: "Amounts" },
    { key: "totalPledge", label: "Pledge total (all years)", type: "currency", group: "Amounts" },
    { key: "received", label: "Received", type: "currency", showInList: true, group: "Amounts" },
    { key: "dueDate", label: "Instalment due", type: "date", systemMapping: "dueAt", group: "Amounts" },
    { key: "giftAid", label: "Gift Aid", type: "select", options: ["Y", "N"], group: "Details" },
    { key: "newOrRegrant", label: "New / regrant", type: "select", options: ["New", "Regrant"], showInList: true, group: "Details" },
    { key: "status", label: "Status", type: "select", options: ["Received", "Part received", "Due", "Pledged"], showInList: true, systemMapping: "stage", group: "Details" },
  ],
  pipeline: [
    { key: "name", label: "Funder / prospect", type: "text", required: true, searchable: true, systemMapping: "name" },
    { key: "organisation", label: "Organisation", type: "relation", relationTo: "organisation", systemMapping: "parentId", group: "Details" },
    { key: "stage", label: "Stage", type: "select", options: ["1. Identified", "2. Researching", "3. Planning", "4. In progress", "5. Submitted/Asked", "Successful", "Unsuccessful", "Stewarding"], required: true, showInList: true, systemMapping: "stage", group: "Pipeline" },
    { key: "relationship", label: "Relationship", type: "select", options: ["Cold", "Warm", "Lapsed"], showInList: true, systemMapping: "status", group: "Pipeline" },
    { key: "funderType", label: "Type", type: "select", options: ["New Funder", "Regrant", "Previous Funder"], showInList: true, group: "Pipeline" },
    { key: "ask", label: "Ask (25/26)", type: "currency", systemMapping: "amountMinor", showInList: true, group: "Pipeline" },
    { key: "likelihood", label: "Likelihood %", type: "number", showInList: true, group: "Pipeline" },
    { key: "lead", label: "Lead", type: "select", options: ["Anna", "Arran", "Kiran"], showInList: true, group: "Pipeline" },
    { key: "rag", label: "RAG", type: "select", options: ["Green", "Amber", "Red"], showInList: true, group: "Pipeline" },
    { key: "programme", label: "Programme", type: "select", options: ["ILC partnerships", "DSP schools", "General fundraising"], group: "Pipeline" },
    { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
  ],
  deadline: [
    { key: "name", label: "Funder", type: "text", required: true, searchable: true, systemMapping: "name" },
    { key: "funderOrg", label: "Funder organisation", type: "relation", relationTo: "organisation", systemMapping: "parentId", group: "Details" },
    { key: "deadlineType", label: "Type", type: "select", options: ["Application", "Report", "Renewal", "Compliance"], required: true, showInList: true, systemMapping: "stage", group: "Details" },
    { key: "dueDate", label: "Due date", type: "date", required: true, systemMapping: "dueAt", showInList: true, group: "Details" },
    { key: "lead", label: "Lead", type: "select", options: ["Anna", "Arran", "Kiran"], showInList: true, group: "Details" },
    { key: "status", label: "Status", type: "select", options: ["Open", "Completed"], systemMapping: "status", group: "Details" },
    { key: "outcome", label: "Outcome", type: "select", options: ["Done", "Secured", "Declined"], group: "Details" },
    { key: "notes", label: "Notes", type: "textarea", showInList: true, group: "Notes" },
  ],
};

const DAY = 24 * 60 * 60 * 1000;
const gbp = (pounds: number) => Math.round(pounds * 100);

// key → org seed. `key` is only used to wire relations during seeding.
export function organisationSeeds() {
  return [
    { key: "northgate", fields: { name: "Northgate Primary School", orgType: "School", region: "Bradford / NECA", urn: "103847", la: "Bradford", ofsted: "Requires improvement", roll: 412, paRate: 34, warmth: "Warm", primaryOwner: "Will (DSP)", tags: ["DSP yr 2", "ILC", "Partnership"] } },
    { key: "pennine", fields: { name: "Pennine MAT", orgType: "MAT", region: "West Yorkshire", warmth: "Warm", tags: ["Prospect", "DSP interest"] } },
    { key: "aoshearman", fields: { name: "A&O Shearman Foundation", orgType: "Corporate Foundation", region: "City of London", warmth: "Warm", tags: ["Active grant", "Regrant", "Programmes"] } },
    { key: "esmee", fields: { name: "Esmée Fairbairn Foundation", orgType: "Funder", region: "London", warmth: "Very warm", tags: ["Active grant", "Report due"] } },
    { key: "impetus", fields: { name: "Impetus", orgType: "Funder", region: "London", warmth: "Very warm", tags: ["Active grant"] } },
    { key: "bridges", fields: { name: "Bridges Impact Foundation", orgType: "Corporate Foundation", region: "London", warmth: "Warm", tags: ["Active grant"] } },
    { key: "dfn", fields: { name: "DFN Foundation", orgType: "Funder", region: "London", warmth: "Warm", tags: ["Prospect"] } },
    { key: "neca", fields: { name: "NECA", orgType: "Local authority", region: "North East", warmth: "Warm", tags: ["ILC partner", "Qualifying"] } },
    { key: "tes", fields: { name: "TES", orgType: "Press", region: "London", warmth: "Warm", tags: ["Press"] } },
    { key: "bradfordla", fields: { name: "Bradford LA", orgType: "Local authority", region: "Bradford", warmth: "Warm", tags: ["ILC", "DSP yr 2"] } },
    { key: "inspiration", fields: { name: "Inspiration Trust", orgType: "MAT", region: "East of England", warmth: "Cold", tags: ["Prospect", "DSP interest"] } },
    { key: "dfe", fields: { name: "Department for Education", orgType: "Government", region: "London", warmth: "Warm", tags: ["Policy", "Sensitive"] } },
    { key: "beacon", fields: { name: "Beacon Academy", orgType: "School", region: "Cleethorpes", urn: "143592", ofsted: "Good", roll: 950, warmth: "Warm", tags: ["DSP 2026", "Good"] } },
    { key: "dixonsbroadgreen", fields: { name: "Dixons Broadgreen Academy", orgType: "School", region: "Liverpool", urn: "140316", ofsted: "Good", roll: 820, warmth: "Warm", tags: ["DSP 2026", "Good"] } },
    { key: "jorichardson", fields: { name: "Jo Richardson Community School", orgType: "School", region: "Dagenham", urn: "133561", ofsted: "Outstanding", roll: 1400, warmth: "Warm", tags: ["DSP 2026", "Outstanding"] } },
    { key: "dixonstrust", fields: { name: "Dixons Academies Trust", orgType: "MAT", region: "Bradford", warmth: "Warm", tags: ["DSP 2026"] } },
    { key: "kpmg", fields: { name: "KPMG Foundation", orgType: "Corporate Foundation", region: "London", warmth: "Warm", tags: ["Active grant", "Regrant"] } },
    { key: "garfield", fields: { name: "Garfield Weston Foundation", orgType: "Funder", region: "London", warmth: "Warm", tags: ["Regrant"] } },
    { key: "paulhamlyn", fields: { name: "Paul Hamlyn Foundation", orgType: "Funder", region: "London", warmth: "Warm", tags: ["Prospect"] } },
    { key: "wates", fields: { name: "Wates Family Enterprise Trust", orgType: "Funder", region: "London", warmth: "Warm", tags: ["Active grant", "Regrant"] } },
  ];
}

export function contactSeeds() {
  return [
    { org: "northgate", flagged: true, restricted: true, fields: { name: "Kiran Gill", role: "Head teacher", email: "k.gill@northgate.bradford.sch.uk", region: "Bradford / NECA", warmth: "Warm", relationshipScore: 78, primaryOwner: "Will (DSP) · Shaun (Partnerships)", source: "ILC 2024 cohort", tags: ["DSP yr 2", "ILC c.3", "IncludEd speaker"] } },
    { org: "dfe", fields: { name: "Esther Bhatt", role: "Director · DfE Schools Group", warmth: "Very warm", relationshipScore: 85, tags: ["Policy"] } },
    { org: "pennine", fields: { name: "Jamie Okafor", role: "CEO", warmth: "Warm", tags: ["Partnership", "Prospect"] } },
    { org: "bradfordla", fields: { name: "Irfan Amin", role: "Assistant Head · Haringey LP", warmth: "Warm", tags: ["ILC London"] } },
    { org: "aoshearman", fields: { name: "Emma Turnbull", role: "Head of Foundation", warmth: "Warm", relationshipScore: 74, tags: ["Funder contact", "Active grant"] } },
    { org: "impetus", fields: { name: "Tamara Kessler", role: "Director of Grants", warmth: "Very warm", relationshipScore: 88, tags: ["Funder contact", "Top 20"] } },
    { org: "bridges", fields: { name: "Barbara Hewson", role: "Grants Manager", warmth: "Warm", tags: ["Funder contact", "Active grant"] } },
    { org: "dfn", fields: { name: "Philippa Welch", role: "Senior Programme Officer", warmth: "Warm", tags: ["Prospect", "Top 20"] } },
    { org: "northgate", fields: { name: "Nicola Wilson", role: "Headteacher · Temple Mill Primary", warmth: "Warm", tags: ["ILC London"] } },
    { org: "tes", fields: { name: "Sharon Mensah", role: "Education Correspondent", warmth: "Warm", tags: ["Press"] } },
    { org: "esmee", fields: { name: "Arran Mitchell", role: "Philanthropy Manager", warmth: "Very warm", relationshipScore: 90, tags: ["Major donor", "Active grant"] } },
    { org: "bradfordla", flagged: true, fields: { name: "Rachel Okafor", role: "Principal · Westbridge Academy", warmth: "Warm", tags: ["ILC c.3"] } },
    { org: "bradfordla", fields: { name: "Sam Oduya", role: "Head of Inclusion", warmth: "Warm", tags: ["ILC c.3", "LA partner"] } },
    { org: "northgate", flagged: true, fields: { name: "Will Chen", role: "Exec Head · Three Bridges Primary", warmth: "Warm", tags: ["ILC alumni"] } },
    { org: "beacon", fields: { name: "Natalie Myers", role: "Headteacher", warmth: "Warm", tags: ["DSP 2026", "ILC 2026/27"] } },
    { org: "dixonsbroadgreen", fields: { name: "Adam Samy", role: "Headteacher", warmth: "Warm", tags: ["DSP 2026"] } },
    { org: "jorichardson", fields: { name: "Lisa Keane", role: "Headteacher", warmth: "Warm", tags: ["DSP 2026", "ILC 2026/27"] } },
    { org: "dixonstrust", fields: { name: "Luke Sparkes", role: "Trust CEO", warmth: "Warm", tags: ["DSP 2026", "Trust CEO"] } },
    { org: "pennine", fields: { name: "Maria Santos", role: "Trust CEO", warmth: "Warm", tags: ["Partnership"] } },
    { org: "northgate", fields: { name: "Phil Davis", role: "Data Manager", warmth: "Warm", tags: ["DSP yr 2"] } },
    { org: "northgate", fields: { name: "Asha Reddy", role: "Inclusion Lead", warmth: "Cold", tags: ["DSP yr 2"] } },
    { org: "kpmg", fields: { name: "Kevin Doyle", role: "Foundation Director", warmth: "Warm", tags: ["Funder contact", "Active grant"] } },
    { org: "garfield", fields: { name: "Flora Bennett", role: "Programme Officer", warmth: "Warm", tags: ["Funder contact"] } },
    { org: "paulhamlyn", fields: { name: "Catherine Ross", role: "Head of Strategic Fund", warmth: "Warm", tags: ["Funder contact", "Prospect"] } },
    { org: "wates", fields: { name: "Seth Palmer", role: "Trust Manager", warmth: "Warm", tags: ["Funder contact", "Active grant"] } },
  ];
}

// Committed gifts, 25/26 — individuals fictionalised, foundations kept.
export function giftSeeds(now: number) {
  const fy = "25/26";
  const rows: Array<{
    org?: string;
    fields: Record<string, unknown>;
  }> = [
    { org: "aoshearman", fields: { name: "A&O Shearman Foundation", funderType: "Corp Foundation", budgetCategory: "Restricted — programmes", pledge: gbp(75000), received: gbp(25000), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Alex Whitfield & Lena Joyce", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(100), received: gbp(100), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Apax Foundation (matched giving)", funderType: "Corp Foundation", budgetCategory: "Unrestricted donations", pledge: gbp(16000), received: gbp(16000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Brian & Sara Openshaw", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(5000), received: gbp(5000), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Benedict Kalu", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(4000), received: gbp(4000), newOrRegrant: "New", status: "Received" } },
    { org: "bridges", fields: { name: "Bridges Impact Foundation", funderType: "Corp Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(110000), totalPledge: gbp(380000), received: gbp(110000), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { org: "esmee", fields: { name: "Esmée Fairbairn", funderType: "Trust & Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(100000), totalPledge: gbp(300000), dueDate: now + 18 * DAY, newOrRegrant: "Regrant", status: "Due" } },
    { fields: { name: "Fidelity", funderType: "Corp Foundation", budgetCategory: "Restricted — programmes", pledge: gbp(40385), totalPledge: gbp(121000), received: gbp(40385), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Gerald Corben / GC Charitable Trust", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(10000), received: gbp(10000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Guy Trelawney / Boscombe", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(500), received: gbp(500), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Gareth & Katy Ansell Trust", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(1000), dueDate: now + 40 * DAY, giftAid: "N", newOrRegrant: "New", status: "Due" } },
    { fields: { name: "Gift Aid (Feb 24–Mar 26)", funderType: "Gift Aid", budgetCategory: "Gift Aid", pledge: gbp(9625), received: gbp(9712), giftAid: "Y", status: "Received" } },
    { fields: { name: "Gideon & Ava Meyer", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(3000), dueDate: now + 25 * DAY, giftAid: "N", newOrRegrant: "New", status: "Due" } },
    { fields: { name: "Grace Trust", funderType: "Trust & Foundation", budgetCategory: "Restricted — programmes", pledge: gbp(10000), received: gbp(10000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Henry Willoughby", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(100), received: gbp(100), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { org: "impetus", fields: { name: "Impetus (Engage Fund)", funderType: "Trust & Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(162000), totalPledge: gbp(1620000), received: gbp(162000), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Inflexion", funderType: "Corp Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(75000), totalPledge: gbp(225000), received: gbp(75000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Jonah Deakin (CAF)", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(400), received: gbp(400), newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Jack Merton-Price", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(50), received: gbp(50), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Josie & Carl Harwood", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(1000), dueDate: now + 55 * DAY, giftAid: "Y", newOrRegrant: "New", status: "Due" } },
    { fields: { name: "Jonas & Elise Hartley", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(200), received: gbp(200), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Joseph Levy Foundation", funderType: "Trust & Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(12500), received: gbp(12500), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Julian & Freya Mercer", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(2000), received: gbp(2000), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { org: "kpmg", fields: { name: "KPMG", funderType: "Corp Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(100000), totalPledge: gbp(300000), received: gbp(100000), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Kurt & Magda Stern Foundation", funderType: "Trust & Foundation", budgetCategory: "Restricted — other", pledge: gbp(27400), received: gbp(27400), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Lawrence Tremaine", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(500), received: gbp(500), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Lovington Foundation", funderType: "Trust & Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(10000), received: gbp(10000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Miriam Denny", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(100), received: gbp(100), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Mark & Johanna Prescott", funderType: "Individual", budgetCategory: "Unrestricted donations", giftAid: "Y", newOrRegrant: "New", status: "Pledged" } },
    { fields: { name: "Martin Deverell (CAF America)", funderType: "Individual", budgetCategory: "Unrestricted donations", giftAid: "N", newOrRegrant: "New", status: "Pledged" } },
    { fields: { name: "Martin Hesketh Family Trust", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(500), received: gbp(500), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Mission 44", funderType: "Trust & Foundation", budgetCategory: "Restricted — programmes", pledge: gbp(86000), received: gbp(45000), dueDate: now + 60 * DAY, giftAid: "N", newOrRegrant: "Regrant", status: "Part received" } },
    { fields: { name: "Philip & Joanna Lampard", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(1000), received: gbp(1370), newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Sam & Deborah Ledger", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(50000), totalPledge: gbp(150000), dueDate: now + 12 * DAY, giftAid: "N", newOrRegrant: "Regrant", status: "Due" } },
    { fields: { name: "Sam Ledger (CAF)", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(5000), received: gbp(5000), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Schroder Foundation", funderType: "Trust & Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(30000), totalPledge: gbp(60000), received: gbp(30000), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Simon & Vera Rothwell", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(10000), received: gbp(10000), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Stefan Doran", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(10000), totalPledge: gbp(30000), dueDate: now + 28 * DAY, giftAid: "N", newOrRegrant: "New", status: "Due" } },
    { fields: { name: "Stewart Radley", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(33000), totalPledge: gbp(100000), received: gbp(33000), newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Swire Charitable Trust", funderType: "Trust & Foundation", budgetCategory: "Restricted — programmes", pledge: gbp(50000), received: gbp(50000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "The George Michael Fund", funderType: "Trust & Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(10000), received: gbp(10000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "The Quilter Foundation", funderType: "Corp Foundation", budgetCategory: "Unrestricted grants", pledge: gbp(5000), dueDate: now + 45 * DAY, giftAid: "N", newOrRegrant: "New", status: "Due" } },
    { fields: { name: "Tom Brierley (CAF)", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(250), received: gbp(250), giftAid: "N", newOrRegrant: "New", status: "Received" } },
    { fields: { name: "Tom Lampard", funderType: "Individual", budgetCategory: "Unrestricted donations", pledge: gbp(100), received: gbp(200), giftAid: "Y", newOrRegrant: "New", status: "Received" } },
    { org: "wates", fields: { name: "Wates Family Enterprise Trust", funderType: "Trust & Foundation", budgetCategory: "Sponsorship", pledge: gbp(40000), received: gbp(40000), giftAid: "N", newOrRegrant: "Regrant", status: "Received" } },
    { fields: { name: "Y TREE", funderType: "Corporate", budgetCategory: "Unrestricted donations", pledge: gbp(1000), received: gbp(1000), giftAid: "N", newOrRegrant: "New", status: "Received" } },
  ];
  const withFy: Array<{ org?: string; fields: Record<string, unknown> }> =
    rows.map((r) => ({ ...r, fields: { ...r.fields, financialYear: fy } }));

  // Historical + forward years: one aggregate gift per category so the
  // financial-overview table matches the prototype's totals.
  const summary: Array<[string, string, number]> = [
    ["22/23", "Unrestricted grants", 1256000],
    ["23/24", "Unrestricted grants", 704000],
    ["23/24", "Unrestricted donations", 66000],
    ["23/24", "Restricted — other", 49000],
    ["23/24", "Restricted — programmes", 243000],
    ["24/25", "Restricted — programmes", 187000],
    ["24/25", "Restricted — influencing", 70000],
    ["24/25", "Restricted — other", 49000],
    ["24/25", "Unrestricted grants", 704000],
    ["24/25", "Unrestricted donations", 66000],
    ["26/27", "Restricted — programmes", 25000],
    ["26/27", "Restricted — other", 32000],
    ["26/27", "Unrestricted grants", 335000],
    ["26/27", "Unrestricted donations", 43000],
    ["27/28", "Restricted — programmes", 25000],
    ["27/28", "Unrestricted grants", 185000],
    ["27/28", "Unrestricted donations", 43000],
  ];
  for (const [year, category, pounds] of summary) {
    withFy.push({
      fields: {
        name: `${year} committed — ${category}`,
        funderType: "Trust & Foundation",
        budgetCategory: category,
        financialYear: year,
        pledge: gbp(pounds),
        status: year < fy ? "Received" : "Pledged",
      },
    });
  }
  return withFy;
}

export const TARGET_SEEDS: Array<[string, number]> = [
  ["22/23", gbp(1206000)],
  ["23/24", gbp(1200000)],
  ["24/25", gbp(1350000)],
  ["25/26", gbp(1100000)],
  ["26/27", gbp(1260000)],
  ["27/28", gbp(1300000)],
];

export function pipelineSeeds() {
  const rows: Array<{
    name: string;
    stage: string;
    relationship?: string;
    funderType: string;
    ask?: number;
    likelihood?: number;
    lead?: string;
    rag?: string;
    programme?: string;
  }> = [
    { name: "A&O Shearman", stage: "3. Planning", relationship: "Warm", funderType: "Regrant", likelihood: 30, lead: "Arran", rag: "Green", programme: "General fundraising" },
    { name: "Aberdeen Group Charitable Trust", stage: "5. Submitted/Asked", funderType: "New Funder", ask: gbp(60000), likelihood: 10, lead: "Arran", rag: "Green", programme: "DSP schools" },
    { name: "Adam Crozier", stage: "2. Researching", relationship: "Lapsed", funderType: "New Funder", likelihood: 10, lead: "Anna", rag: "Red" },
    { name: "AKO Foundation", stage: "2. Researching", relationship: "Warm", funderType: "New Funder", likelihood: 10, lead: "Anna", rag: "Amber" },
    { name: "Alchemy Foundation", stage: "3. Planning", relationship: "Warm", funderType: "New Funder", likelihood: 20, lead: "Anna", rag: "Green" },
    { name: "Aldermore", stage: "Unsuccessful", relationship: "Cold", funderType: "New Funder", likelihood: 10, lead: "Anna", rag: "Red" },
    { name: "Apax Foundation", stage: "4. In progress", relationship: "Warm", funderType: "Regrant", ask: gbp(75000), likelihood: 60, lead: "Anna", rag: "Green", programme: "ILC partnerships" },
    { name: "Barclays UK", stage: "2. Researching", relationship: "Warm", funderType: "New Funder", lead: "Anna", rag: "Amber" },
    { name: "Berkeley Foundation", stage: "5. Submitted/Asked", relationship: "Cold", funderType: "New Funder", ask: gbp(75000), likelihood: 10, lead: "Arran", rag: "Amber", programme: "DSP schools" },
    { name: "Bramall Foundation", stage: "Unsuccessful", relationship: "Cold", funderType: "New Funder", ask: gbp(50000), likelihood: 10, lead: "Arran", rag: "Red" },
    { name: "Bridges Impact Foundation", stage: "Successful", relationship: "Warm", funderType: "Regrant", likelihood: 40, lead: "Anna", rag: "Green", programme: "ILC partnerships" },
    { name: "Charles Hayward Foundation", stage: "Unsuccessful", relationship: "Cold", funderType: "New Funder", ask: gbp(25000), likelihood: 20, lead: "Arran", rag: "Red" },
    { name: "City Bridge Trust", stage: "3. Planning", relationship: "Cold", funderType: "New Funder", lead: "Arran", rag: "Amber" },
    { name: "Clothworkers Foundation", stage: "4. In progress", funderType: "New Funder", ask: gbp(20000), likelihood: 10, lead: "Arran", rag: "Amber", programme: "General fundraising" },
    { name: "CVC Foundation", stage: "3. Planning", relationship: "Warm", funderType: "Previous Funder", likelihood: 20, lead: "Anna", rag: "Green" },
    { name: "DFN Foundation", stage: "3. Planning", relationship: "Warm", funderType: "New Funder", likelihood: 20, lead: "Anna", rag: "Green", programme: "DSP schools" },
    { name: "DHL Foundation", stage: "Unsuccessful", relationship: "Warm", funderType: "Regrant", ask: gbp(200000), likelihood: 40, lead: "Anna", rag: "Red" },
    { name: "Drapers Charitable Fund", stage: "4. In progress", relationship: "Cold", funderType: "New Funder", ask: gbp(25000), likelihood: 10, lead: "Arran", rag: "Amber", programme: "General fundraising" },
    { name: "The Dulverton Trust", stage: "5. Submitted/Asked", relationship: "Warm", funderType: "Regrant", ask: gbp(40000), likelihood: 40, lead: "Arran", rag: "Green", programme: "ILC partnerships" },
    { name: "Esmée Fairbairn", stage: "Successful", relationship: "Warm", funderType: "Regrant", likelihood: 50, lead: "Anna", rag: "Green", programme: "ILC partnerships" },
    { name: "Eranda Rothschild Foundation", stage: "3. Planning", relationship: "Cold", funderType: "New Funder", likelihood: 10, lead: "Arran", rag: "Amber" },
    { name: "Foux Foundation", stage: "5. Submitted/Asked", relationship: "Cold", funderType: "New Funder", ask: gbp(30000), likelihood: 10, lead: "Arran", rag: "Amber", programme: "DSP schools" },
    { name: "Garfield Weston Foundation", stage: "4. In progress", relationship: "Warm", funderType: "Regrant", ask: gbp(150000), likelihood: 30, lead: "Anna", rag: "Green", programme: "DSP schools" },
    { name: "Generational Foundation", stage: "3. Planning", relationship: "Warm", funderType: "New Funder", likelihood: 20, lead: "Anna", rag: "Green" },
    { name: "The Grace Trust", stage: "3. Planning", relationship: "Warm", funderType: "Regrant", ask: gbp(25000), likelihood: 40, lead: "Arran", rag: "Green", programme: "General fundraising" },
    { name: "Hargreaves Foundation", stage: "3. Planning", funderType: "New Funder", ask: gbp(30000), likelihood: 10, lead: "Arran", rag: "Amber" },
    { name: "The Headley Trust", stage: "4. In progress", relationship: "Cold", funderType: "New Funder", ask: gbp(75000), likelihood: 10, lead: "Arran", rag: "Amber", programme: "DSP schools" },
    { name: "Henry Smith Charity", stage: "2. Researching", relationship: "Lapsed", funderType: "New Funder", rag: "Red" },
    { name: "Impetus (core)", stage: "3. Planning", relationship: "Warm", funderType: "Regrant", likelihood: 50, lead: "Kiran", rag: "Green", programme: "ILC partnerships" },
    { name: "Inflexion Foundation", stage: "Successful", relationship: "Warm", funderType: "New Funder", likelihood: 20, lead: "Anna", rag: "Green" },
    { name: "John Laing Charitable Trust", stage: "2. Researching", relationship: "Cold", funderType: "New Funder", ask: gbp(25000), likelihood: 10, lead: "Arran", rag: "Red" },
    { name: "KPMG Foundation", stage: "Stewarding", relationship: "Warm", funderType: "Regrant", lead: "Anna", rag: "Green", programme: "ILC partnerships" },
    { name: "Man Charitable Trust", stage: "4. In progress", relationship: "Cold", funderType: "New Funder", likelihood: 20, lead: "Arran", rag: "Amber", programme: "General fundraising" },
    { name: "Mission 44", stage: "3. Planning", relationship: "Warm", funderType: "Regrant", likelihood: 10, lead: "Anna", rag: "Green" },
    { name: "Morgan Stanley International Foundation", stage: "Unsuccessful", relationship: "Cold", funderType: "New Funder", ask: gbp(100000), likelihood: 10, lead: "Arran", rag: "Red" },
    { name: "National Lottery Community Fund", stage: "3. Planning", relationship: "Cold", funderType: "New Funder", likelihood: 20, lead: "Arran", rag: "Amber" },
    { name: "NFU Mutual Charitable Trust", stage: "4. In progress", funderType: "New Funder", ask: gbp(30000), likelihood: 10, lead: "Arran", rag: "Amber", programme: "General fundraising" },
    { name: "Nuffield Foundation", stage: "Unsuccessful", relationship: "Cold", funderType: "New Funder", ask: gbp(150000), likelihood: 10, lead: "Arran", rag: "Red" },
    { name: "Paul Hamlyn Foundation", stage: "3. Planning", relationship: "Warm", funderType: "New Funder", likelihood: 30, lead: "Anna", rag: "Green", programme: "ILC partnerships" },
    { name: "Philip Richards", stage: "3. Planning", relationship: "Warm", funderType: "Regrant", ask: gbp(10000), likelihood: 40, lead: "Anna", rag: "Green" },
    { name: "The Schroder Foundation", stage: "3. Planning", relationship: "Warm", funderType: "Regrant", likelihood: 50, lead: "Arran", rag: "Green", programme: "General fundraising" },
    { name: "Treebeard Trust", stage: "3. Planning", relationship: "Warm", funderType: "New Funder", ask: gbp(60000), likelihood: 20, lead: "Anna", rag: "Green", programme: "DSP schools" },
    { name: "The Frank Jackson Foundation", stage: "4. In progress", relationship: "Cold", funderType: "New Funder", ask: gbp(40000), likelihood: 10, rag: "Amber", programme: "General fundraising" },
    { name: "Wates Family Enterprise Trust", stage: "Successful", relationship: "Warm", funderType: "Regrant", likelihood: 60, lead: "Arran", rag: "Green" },
  ];
  return rows;
}

export function deadlineSeeds(now: number) {
  return [
    { org: "esmee", fields: { name: "Esmée Fairbairn Foundation", deadlineType: "Report", dueDate: now - 27 * DAY, lead: "Arran", status: "Open", notes: "Year 1 grant report. Draft started — needs Kiran sign-off." } },
    { org: "garfield", fields: { name: "Garfield Weston Foundation", deadlineType: "Application", dueDate: now - 42 * DAY, lead: "Anna", status: "Open", notes: "Regrant — portal deadline missed. Contact programme officer." } },
    { org: "impetus", fields: { name: "Impetus (Core)", deadlineType: "Compliance", dueDate: now - 26 * DAY, lead: "Kiran", status: "Open", notes: "Due diligence renewal. Tamara has chased twice." } },
    { org: "aoshearman", fields: { name: "A&O Shearman Foundation", deadlineType: "Report", dueDate: now + 5 * DAY, lead: "Arran", status: "Open", notes: "Annual impact update. Draft shared with Anna for review." } },
    { fields: { name: "Aberdeen Group Charitable", deadlineType: "Application", dueDate: now + 14 * DAY, lead: "Arran", status: "Open", notes: "Ideas Fund — DSP focus. First draft needed by end of this week." } },
    { fields: { name: "Apax Foundation", deadlineType: "Renewal", dueDate: now + 19 * DAY, lead: "Anna", status: "Open", notes: "Multi-year renewal conversation — soft ask already floated." } },
    { org: "bridges", fields: { name: "Bridges Impact Foundation", deadlineType: "Report", dueDate: now + 24 * DAY, lead: "Kiran", status: "Open", notes: "Interim KPI report. Victoria to confirm format this week." } },
    { org: "paulhamlyn", fields: { name: "Paul Hamlyn Foundation", deadlineType: "Application", dueDate: now + 29 * DAY, lead: "Anna", status: "Open", notes: "Strategic Fund — invite only. Awaiting formal invite letter." } },
    { fields: { name: "Inflexion Foundation", deadlineType: "Report", dueDate: now + 49 * DAY, lead: "Anna", status: "Open", notes: "Year 1 narrative report. 3-year grant." } },
    { fields: { name: "Eranda Rothschild Foundation", deadlineType: "Application", dueDate: now + 65 * DAY, lead: "Arran", status: "Open", notes: "Resubmission. Ask: £40k programmes." } },
    { org: "dfn", fields: { name: "DFN Foundation", deadlineType: "Renewal", dueDate: now + 66 * DAY, lead: "Kiran", status: "Open", notes: "Renewal conversation — Philippa contact. No format agreed yet." } },
    { org: "esmee", fields: { name: "Esmée Fairbairn Foundation", deadlineType: "Report", dueDate: now + 80 * DAY, lead: "Arran", status: "Open", notes: "Year 2 grant report. Start pulling data in July." } },
    { org: "bridges", fields: { name: "Bridges Impact Foundation", deadlineType: "Report", dueDate: now - 35 * DAY, lead: "Arran", status: "Completed", outcome: "Done", notes: "Interim KPI report submitted on time." } },
    { fields: { name: "Inflexion Foundation", deadlineType: "Application", dueDate: now - 60 * DAY, lead: "Anna", status: "Completed", outcome: "Secured", notes: "£225k over 3 years confirmed." } },
    { org: "kpmg", fields: { name: "KPMG Foundation", deadlineType: "Report", dueDate: now - 50 * DAY, lead: "Anna", status: "Completed", outcome: "Done", notes: "EOY report submitted." } },
    { org: "wates", fields: { name: "Wates Family Enterprise Trust", deadlineType: "Renewal", dueDate: now - 20 * DAY, lead: "Arran", status: "Completed", outcome: "Secured", notes: "Sponsorship renewed for 25/26." } },
  ];
}

// Activity seeds — `contact` refers to a contact seed name, else global feed.
export function activitySeeds(now: number) {
  return [
    { contact: "Kiran Gill", kind: "email", body: "Email sent by Shannon (Comms) — IncludEd 2025 save the date", team: "Comms", happenedAt: now - 4 * DAY },
    { contact: "Kiran Gill", kind: "meeting", body: "School visit completed — WSI visioning session", detail: "Will + Ella", team: "DSP", happenedAt: now - 14 * DAY },
    { contact: "Kiran Gill", kind: "note", body: "Fundraising note — major donor conversation flagged", detail: "Arran · Restricted access", team: "Fundraising", happenedAt: now - 21 * DAY },
    { contact: "Kiran Gill", kind: "journey", body: "IncludEd 2023 — attended as delegate", happenedAt: now - 580 * DAY },
    { contact: "Kiran Gill", kind: "journey", body: "ILC cohort 3 — completed programme", happenedAt: now - 300 * DAY },
    { contact: "Kiran Gill", kind: "journey", body: "IncludEd 2024 — invited as speaker", happenedAt: now - 180 * DAY },
    { contact: "Kiran Gill", kind: "journey", body: "DSP school — year 2 of 3", happenedAt: now - 240 * DAY },
    { kind: "email", body: "Email sent to Kiran Gill — IncludEd 2025 save the date", team: "Comms", happenedAt: now - 4 * DAY },
    { kind: "meeting", body: "WSI visit completed — Northgate Primary", detail: "Will + Ella", team: "DSP", happenedAt: now - 7 * DAY },
    { kind: "system", body: "New deal created — NECA Local Authority", detail: "£48,000 · Stage: Proposal", team: "Partnerships", happenedAt: now - 7 * DAY },
    { kind: "system", body: "ILC cohort 3 — Day 5 attendance logged", detail: "47/52 present · 3 absences with notice", team: "ILC", happenedAt: now - 9 * DAY },
    { kind: "note", body: "Funder note — Esmée Fairbairn reporting deadline", detail: "Due in 18 days · Arran assigned", team: "Fundraising", happenedAt: now - 10 * DAY },
    { kind: "note", body: "Policy contact updated — warm → very warm", detail: "Esther · DfE engagement follow-up", team: "Policy", happenedAt: now - 11 * DAY },
    { kind: "email", body: "Four Bullet Friday sent — issue #47", detail: "2,847 sent · 48% open rate", team: "Comms", happenedAt: now - 3 * DAY },
    { contact: "Esther Bhatt", kind: "meeting", body: "DfE roundtable — inclusion white paper", team: "Policy", happenedAt: now - 15 * DAY },
    { contact: "Emma Turnbull", kind: "email", body: "EOG report shared ahead of September deadline", team: "Fundraising", happenedAt: now - 30 * DAY },
    { contact: "Tamara Kessler", kind: "meeting", body: "Monthly 1-2-1 with Kiran (CEO)", team: "Fundraising", happenedAt: now - 18 * DAY },
  ];
}

export function taskSeeds(now: number) {
  return [
    { title: "Esmée Fairbairn — Year 1 grant report due", recordName: "Esmée Fairbairn Foundation", assigneeName: "Arran", team: "Fundraising", dueAt: now + 18 * DAY },
    { title: "Send A&O Shearman impact update ahead of Sept reporting deadline", recordName: "A&O Shearman Foundation", assigneeName: "Arran", team: "Fundraising", dueAt: now + 66 * DAY },
    { title: "WSI compliance check — Northgate Primary", recordName: "Northgate Primary School", assigneeName: "Will", team: "DSP", dueAt: now + 10 * DAY },
    { title: "Confirm IncludEd 2025 speaker list with Comms", assigneeName: "Shannon", team: "Comms", dueAt: now + 21 * DAY },
    { title: "Chase Aberdeen Ideas Fund first draft", recordName: "Aberdeen Group Charitable", assigneeName: "Arran", team: "Fundraising", dueAt: now + 7 * DAY },
  ];
}
