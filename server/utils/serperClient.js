// ─────────────────────────────────────────────
//  Serper API Client — Google Search wrapper
// ─────────────────────────────────────────────
import axios from "axios";

const SERPER_ENDPOINT = "https://google.serper.dev/search";

let serperApiKey = null;
let mockMode = false;

export function initSerper(apiKey) {
  if (!apiKey || apiKey === "MOCK") {
    mockMode = true;
    console.warn("[Serper] No API key — running in MOCK mode.");
  } else {
    serperApiKey = apiKey;
    mockMode = false;
  }
}

/**
 * Perform a web search and return organic results.
 * @param {string} query
 * @param {number} num — number of results (max 100)
 * @returns {Promise<Array<{title, link, snippet}>>}
 */
export async function webSearch(query, num = 20) {
  if (mockMode) return getMockResults(query);

  const response = await axios.post(
    SERPER_ENDPOINT,
    { q: query, num },
    {
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
    }
  );
  return (response.data.organic || []).map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));
}

/**
 * Web fetch — retrieve text content from a URL.
 */
export async function webFetch(url) {
  if (mockMode) return `Mock content for ${url}`;
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: { "User-Agent": "ScholarshipHunterBot/1.0" },
    });
    // Return first 3000 chars of text-like content
    return String(res.data).substring(0, 3000);
  } catch {
    return null;
  }
}

function getMockResults(query) {
  const base = [
    {
      title: "Fulbright Scholarship Program 2026",
      link: "https://foreign.fulbrightonline.org/",
      snippet:
        "The Fulbright Program offers grants for graduate study, research, and teaching worldwide.",
    },
    {
      title: "Gates Cambridge Scholarship 2026",
      link: "https://www.gatescambridge.org/",
      snippet:
        "Full-cost scholarships for outstanding applicants from outside the UK to study at Cambridge.",
    },
    {
      title: "Chevening Scholarship 2026–2027",
      link: "https://www.chevening.org/scholarships/",
      snippet:
        "UK government's global scholarship programme offering full funding for a one-year master's.",
    },
    {
      title: "DAAD Scholarships for International Students",
      link: "https://www.daad.de/en/",
      snippet:
        "German academic exchange scholarships for students at all levels in various fields.",
    },
    {
      title: "Commonwealth Scholarship 2026",
      link: "https://cscuk.fcdo.gov.uk/scholarships/",
      snippet:
        "Commonwealth Scholarships for citizens of low and middle income Commonwealth countries.",
    },
    {
      title: "Erasmus Mundus Joint Masters 2026",
      link: "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus_en",
      snippet:
        "European Commission scholarships for excellence in joint master's programmes.",
    },
    {
      title: "Rhodes Scholarship 2026",
      link: "https://www.rhodeshouse.ox.ac.uk/",
      snippet:
        "The oldest international graduate scholarship programme at the University of Oxford.",
    },
    {
      title: "Knight-Hennessy Scholars at Stanford",
      link: "https://knight-hennessy.stanford.edu/",
      snippet:
        "Full funding for graduate studies at Stanford across all disciplines.",
    },
    {
      title: "Aga Khan Foundation International Scholarship",
      link: "https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarships",
      snippet:
        "Scholarships for postgraduate studies for students from developing countries.",
    },
    {
      title: "MEXT Japanese Government Scholarship 2026",
      link: "https://www.mext.go.jp/en/",
      snippet:
        "Japanese Ministry of Education scholarships for international graduate students.",
    },
  ];
  // Duplicate to simulate 50+ results
  return [...base, ...base, ...base, ...base, ...base].slice(0, 50);
}
