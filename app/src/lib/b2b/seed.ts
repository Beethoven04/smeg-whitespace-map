// Ported verbatim from the team's "Opportunity Radar" Lovable project (src/lib/opportunities/seed.ts), 24 Oct 2026.
// 9 real Malmö projects from municipal planning records and press, each fact tied to a source.
import type { Project, Source, Fact } from "./types";
const accessedDate = "2026-10-24";
const meeting =
  "https://motenmedborgarportal.malmo.se/committees/stadsbyggnadsnamnden/mote-2026-08-26";
const source = (
  id: string,
  url: string,
  title: string,
  publisher = "Malmö stad",
  documentDate = "",
): Source => ({ id, url, title, publisher, documentDate, accessedDate });
function project(
  id: string,
  name: string,
  district: string,
  projectType: Project["projectType"],
  stage: Project["stage"],
  sources: Source[],
  options: Partial<Project> = {},
): Project {
  return {
    id,
    name,
    municipality: "Malmö",
    district,
    projectType,
    stage,
    units: {
      value: null,
      kind: projectType === "hotel" ? "hotel_rooms" : "dwellings",
      status: "unknown",
    },
    tenure: projectType === "hotel" ? "not_applicable" : "unknown",
    developer: { name: null, verified: false },
    sources,
    facts: [],
    inferences: [],
    missing: ["Procurement timing and appliance specifications unknown"],
    conflicts: [],
    salesStatus: "new",
    statusHistory: [{ status: "new", at: "2026-10-24T00:00:00Z" }],
    notes: "",
    origin: "seed",
    edited: false,
    updatedAt: "2026-10-24T00:00:00Z",
    ...options,
  };
}
const protocolUrl =
  "https://motenmedborgarportal.malmo.se/committees/stadsbyggnadsnamnden/mote-2026-08-26/protocol/protokoll-sbn-2026-08-26-gdprpdf?downloadMode=open";
const PROTOCOL_ID = "sbn-protocol-2026-08-26";
const protocol = () =>
  source(
    PROTOCOL_ID,
    protocolUrl,
    "Stadsbyggnadsnämnden protokoll 2026-08-26 (justerat 2026-09-02)",
    "Malmö stad",
    "2026-09-02",
  );
const fact = (id: string, field: string, value: Fact["value"], sourceId: string): Fact => ({
  id,
  field,
  value,
  sourceId,
});
function planningFacts(
  id: string,
  stage: Project["stage"],
  sourceId: string,
  date?: string,
): Fact[] {
  return [
    fact(`${id}-primary`, "sourceType", "municipal_document", sourceId),
    fact(`${id}-stage`, "stage", stage, sourceId),
    ...(date ? [fact(`${id}-date`, "stageDate", date, sourceId)] : []),
  ];
}
export function getSeedProjects(): Project[] {
  return [
    project(
      "tygelsjo",
      "Tygelsjö 52:34",
      "Tygelsjö by",
      "residential",
      "antagen",
      [source("tyg-source", meeting, "Stadsbyggnadsnämnden, 26 August 2026"), protocol()],
      {
        planId: "Dp 5867",
        stageDate: "2026-08-26",
        units: { value: 104, kind: "dwellings", status: "approximate", sourceId: "tyg-source" },
        facts: [
          ...planningFacts("tyg", "antagen", "tyg-source", "2026-08-26"),
          fact(
            "tyg-units",
            "units",
            "Approx. 47 small houses and 57 apartments (104 dwellings)",
            "tyg-source",
          ),
          fact(
            "tyg-farm",
            "planUses",
            "Existing farm may be converted to homes, offices, care, temporary accommodation and centre uses",
            "tyg-source",
          ),
          fact("tyg-protocol-primary", "sourceType", "municipal_document", PROTOCOL_ID),
          fact(
            "tyg-adopted",
            "decision",
            "Adopted by Stadsbyggnadsnämnden on behalf of kommunfullmäktige (§235)",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Developer unknown",
          "Tenure and individual kitchen specifications unknown",
          "Procurement timing unknown",
          "Not confirmed laga kraft; appeal period",
        ],
        inferences: [
          "Residential project signal; permitted temporary accommodation does not confirm a hotel project.",
          "Reservations were filed (Tygelsjö: V), so appeals are possible.",
        ],
      },
    ),
    project(
      "trollhattan",
      "Trollhättan 6",
      "Västra Hamnen (Beijerskajen)",
      "mixed",
      "samrad",
      [
        source(
          "troll-plan",
          "https://malmo.se/Bo-och-leva/Bygga-och-bo/Detaljplaner/Gallande-och-pagaende-detaljplaner/5827.html",
          "Detailed plan 5827",
        ),
        source(
          "troll-project",
          "https://malmo.se/Stadsutveckling/Det-har-ar-pa-gang-i-Malmo/Trollhattan-6.html",
          "Trollhättan 6 development",
        ),
        protocol(),
      ],
      {
        planId: "Dp 5827",
        stageDate: "2026-09-08",
        nextMilestone: "Granskning planned before summer 2027",
        facts: [
          ...planningFacts("troll", "samrad", "troll-plan", "2026-09-08"),
          fact(
            "troll-consultation",
            "consultation",
            "Samråd 2026-09-08 to 2026-10-04 (completed)",
            "troll-plan",
          ),
          fact(
            "troll-next",
            "nextMilestone",
            "Granskning planned before summer 2027",
            "troll-plan",
          ),
          fact(
            "troll-uses",
            "planUses",
            "Housing, offices, centre uses and underground parking; up to 15 storeys; parts of existing office building preserved",
            "troll-project",
          ),
          fact(
            "troll-decision",
            "decision",
            "Samråd approved; committee instructed dialogue with the property owner about being a pilot under the current parking policy (§241)",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Units unknown",
          "Developer unknown",
          "Tenure and kitchen specifications unknown",
          "Procurement timing unknown",
        ],
      },
    ),
    project(
      "holmastycket",
      "Holmastycket 1",
      "Elinelund",
      "residential",
      "antagen",
      [source("holm-source", meeting, "Stadsbyggnadsnämnden, 26 August 2026"), protocol()],
      {
        planId: "Dp 5748",
        stageDate: "2026-08-26",
        units: { value: 180, kind: "dwellings", status: "approximate", sourceId: "holm-source" },
        facts: [
          ...planningFacts("holm", "antagen", "holm-source", "2026-08-26"),
          fact(
            "holm-units",
            "units",
            "Approx. 180 dwellings and one retail unit along Annetorpsvägen",
            "holm-source",
          ),
          fact("holm-protocol-primary", "sourceType", "municipal_document", PROTOCOL_ID),
          fact(
            "holm-adopted",
            "decision",
            "Adopted by Stadsbyggnadsnämnden on behalf of kommunfullmäktige (§239)",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Developer unknown",
          "Tenure and kitchen specifications unknown",
          "Procurement timing unknown",
          "Not confirmed laga kraft; appeal period",
        ],
        inferences: ["Reservations were filed (Holmastycket: M and SD), so appeals are possible."],
      },
    ),
    project(
      "delsjon",
      "Delsjön 4",
      "Bellevuegården",
      "residential",
      "bygglov_beviljat",
      [source("dels-source", meeting, "Stadsbyggnadsnämnden, 26 August 2026"), protocol()],
      {
        stageDate: "2026-08-26",
        facts: [
          ...planningFacts("dels", "bygglov_beviljat", PROTOCOL_ID, "2026-08-26"),
          fact(
            "dels-proposal",
            "buildingProposal",
            "One 10-storey apartment building along Lorensborgsgatan",
            "dels-source",
          ),
          fact(
            "dels-decision",
            "decision",
            '"Stadsbyggnadsnämnden beviljar bygglov" for one 10-storey apartment building along Lorensborgsgatan (§250)',
            PROTOCOL_ID,
          ),
          fact(
            "dels-startbesked",
            "startbeskedBlocked",
            "Startbesked may not be given until soil contamination has been remediated",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Units unknown",
          "Developer unknown",
          "Tenure and kitchen specifications unknown",
        ],
      },
    ),
    project(
      "bryggeriet",
      "Kvarteret Bryggeriet",
      "Innerstaden",
      "mixed",
      "granskning",
      [
        source(
          "bryg-source",
          "https://malmo.se/Service/Bygga-och-bo/Detaljplaner/Pagaende-planarbeten-och-antagna-detaljplaner/5299.html",
          "Detailed plan 5299",
        ),
        protocol(),
      ],
      {
        planId: "Dp 5299",
        stageDate: "2026-09-08",
        units: { value: 340, kind: "dwellings", status: "approximate", sourceId: "bryg-source" },
        facts: [
          ...planningFacts("bryg", "granskning", "bryg-source", "2026-09-08"),
          fact("bryg-review", "reviewPeriod", "Granskning 2026-09-08 to 2026-10-06", "bryg-source"),
          fact(
            "bryg-units",
            "units",
            "Approx. 340 dwellings plus preschool, parking garage, offices and centre uses",
            "bryg-source",
          ),
          fact(
            "bryg-nohotel",
            "hotelUse",
            "Hotel use explicitly excluded (ej tillfällig vistelse)",
            "bryg-source",
          ),
          fact(
            "bryg-decision",
            "decision",
            "Committee approved sending the plan to granskning (§240)",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Developer unknown",
          "Tenure and kitchen specifications unknown",
          "Procurement timing unknown",
        ],
      },
    ),
    project(
      "limhamn",
      "Limhamn 155:355 m fl",
      "Bunkeflostrand area",
      "residential",
      "granskning",
      [
        source(
          "lim-source",
          "https://malmo.se/Bo-och-leva/Bygga-och-bo/Detaljplaner/Gallande-och-pagaende-detaljplaner/5622.html",
          "Detailed plan 5622",
        ),
      ],
      {
        planId: "Dp 5622",
        units: { value: 980, kind: "dwellings", status: "approximate", sourceId: "lim-source" },
        facts: [
          fact("lim-primary", "sourceType", "municipal_document", "lim-source"),
          fact(
            "lim-units",
            "units",
            "Approx. 900 apartments and 80 small houses, 2 to 5 storeys",
            "lim-source",
          ),
          fact("lim-stage", "stage", "granskning", "lim-source"),
          fact(
            "lim-stage-docs",
            "planDocuments",
            'Plan page lists "Underrättelse om granskning" and "Planbeskrivning granskning"',
            "lim-source",
          ),
        ],
        missing: [
          "Granskning date not shown on plan page; stage may be outdated, verify with stadsbyggnadskontoret",
          "Developer unknown",
          "Tenure and kitchen specifications unknown",
          "Procurement timing unknown",
        ],
      },
    ),
    project(
      "klagstorp",
      "Klagstorp 34:1 m fl",
      "Västra Klagstorp",
      "residential",
      "samrad",
      [source("klag-source", meeting, "Stadsbyggnadsnämnden, 26 August 2026"), protocol()],
      {
        planId: "Dp 5887",
        stageDate: "2026-08-26",
        facts: [
          ...planningFacts("klag", "samrad", "klag-source", "2026-08-26"),
          fact(
            "klag-uses",
            "planUses",
            "Preserves and develops Änghaga gård with homes and centre uses; new small houses in the southern and western parts; a public park for stormwater; new access from Borrebackevägen",
            "klag-source",
          ),
          fact(
            "klag-decision",
            "decision",
            "Samråd approved; after samråd the office will study adding multi-family buildings (§242)",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Units unknown",
          "Developer unknown",
          "Tenure and kitchen specifications unknown",
          "Procurement timing unknown",
        ],
      },
    ),
    project(
      "bunkeflo",
      "Bunkeflo 7:61",
      "South Hyllie",
      "mixed",
      "planbesked",
      [source("bunk-source", meeting, "Stadsbyggnadsnämnden, 26 August 2026"), protocol()],
      {
        stageDate: "2026-08-26",
        nextMilestone: "Final adoption expected by 2030 at the latest",
        facts: [
          ...planningFacts("bunk", "planbesked", "bunk-source", "2026-08-26"),
          fact(
            "bunk-proposal",
            "proposal",
            "Positive planbesked proposed 2026-08-26 for a new detailed plan for mixed urban development (blandad stad) with infrastructure",
            "bunk-source",
          ),
          fact(
            "bunk-applicant",
            "applicant",
            "Private landowner; name not published in the agenda",
            "bunk-source",
          ),
          fact("bunk-decision", "decision", "Positive planbesked decided (§247)", PROTOCOL_ID),
          fact(
            "bunk-horizon",
            "expectedAdoption",
            "The committee assesses that planning will lead to final adoption by 2030 at the latest",
            PROTOCOL_ID,
          ),
        ],
        missing: [
          "Units unknown",
          "Developer unknown (private landowner, name not published)",
          "Tenure and kitchen specifications unknown",
          "Procurement timing unknown",
        ],
      },
    ),
    project(
      "ruby",
      "Ruby Malmö",
      "Davidshall",
      "hotel",
      "hotel_announced",
      [
        source(
          "ruby-hn",
          "https://www.hospitalitynet.org/announcement/41013174.html",
          "Ruby Malmö hotel announcement",
          "Hospitality Net",
          "2025-09-03",
        ),
        source(
          "ruby-cms",
          "https://cms.law/sv/swe/nyheter/cms-wistrand-raadgivare-till-ruby-group-vid-nytt-hotellprojekt-i-malmoe",
          "CMS Wistrand advises Ruby Group in Malmö",
          "CMS Wistrand",
        ),
        source(
          "ruby-ft",
          "https://fastighetstidningen.se/?p=137297",
          "Ruby hotel development in Malmö",
          "Fastighetstidningen",
        ),
      ],
      {
        units: { value: 78, kind: "hotel_rooms", status: "verified", sourceId: "ruby-hn" },
        developer: { name: "Revelop", verified: true, sourceId: "ruby-hn" },
        operator: { name: "Ruby Group", verified: true, sourceId: "ruby-hn" },
        nextMilestone:
          "Opening Q1 2028 reported; conflicting end-2027 report requires confirmation",
        facts: [
          fact("ruby-stage", "stage", "hotel_announced", "ruby-hn"),
          fact("ruby-units", "units", 78, "ruby-hn"),
          fact(
            "ruby-conversion",
            "conversion",
            "Former office building of approx. 3,500 m²",
            "ruby-hn",
          ),
          fact("ruby-dev", "developer", "Revelop", "ruby-hn"),
          fact("ruby-operator", "operator", "Ruby Group", "ruby-hn"),
          fact("ruby-position", "positioning", "lean_luxury", "ruby-hn"),
          fact(
            "ruby-ihg",
            "segment",
            "Joining IHG premium segment; interior design by Ruby in-house team",
            "ruby-hn",
          ),
          fact("ruby-opening-hn", "openingDate", "Q1 2028", "ruby-hn"),
          fact("ruby-opening-cms", "openingDate", "Q1 2028", "ruby-cms"),
          fact("ruby-opening-ft", "openingDate", "End of 2027", "ruby-ft"),
        ],
        conflicts: [
          "Opening: Q1 2028 in Hospitality Net and CMS Wistrand; end of 2027 in Fastighetstidningen.",
        ],
        missing: [
          "Original announcement date not verified",
          "Food and beverage areas not verified",
          "Premium location evidence missing",
          "Procurement timing and appliance specifications unknown",
          "Primary operator/developer announcement not yet verified",
        ],
        inferences: [
          "Lean Luxury positioning supports a hotel customer-fit signal, not an appliance budget or purchasing commitment.",
        ],
      },
    ),
  ];
}
