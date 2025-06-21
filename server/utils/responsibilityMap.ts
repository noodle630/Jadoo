import fs from "fs";
import path from "path";
import stringSimilarity from "string-similarity";

export function buildResponsibilityMap(groundingPath: string, csvHeaders: string[]): { key: string, source: "vendor" | "ai" }[] {
  // Load grounding JSON
  const raw = fs.readFileSync(groundingPath, "utf-8");
  const grounding = JSON.parse(raw);

  // Extract field keys
  let keys: string[] = [];
  if (grounding.fields && Array.isArray(grounding.fields)) {
    keys = grounding.fields.map(f => f.key);
  } else {
    keys = Object.keys(grounding);
  }

  // For each key, decide if there's a matching vendor header
  const map = keys.map(key => {
    // Look for exact or fuzzy match
    const matches = stringSimilarity.findBestMatch(key.toLowerCase(), csvHeaders.map(h => h.toLowerCase()));
    const best = matches.bestMatch;

    const isVendor = best.rating >= 0.8; // tune similarity threshold

    return {
      key,
      source: isVendor ? "vendor" : "ai",
      matchedHeader: isVendor ? csvHeaders[matches.bestMatchIndex] : null
    };
  });

  return map;
}
