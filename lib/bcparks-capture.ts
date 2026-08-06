/**
 * Bookmarklet that reads an already-rendered BC Parks search-results page.
 *
 * This never issues its own request to camping.bcparks.ca. The user runs their
 * own normal search in their own logged-in browser tab, and this only reads the
 * DOM that is already on screen, then puts the extracted rows on the clipboard
 * for pasting into the dashboard. That keeps it clear of the Azure WAF bot
 * challenge that blocks any automated fetch of the site.
 *
 * Selectors below come from the real rendered markup of
 * /create-booking/results?...&view=list (Angular `app-legacy-list-view`):
 *
 *   div[role=listitem].list-entry
 *     h3[id^="map-link-name-"]      -> name, prefixed by a visually hidden
 *                                     category span ("Campsite" / "Cabin")
 *     [id^="availability-"]
 *       .availability-label         -> "Available" / "Not available"
 *
 * The same component renders every drill-down level (region -> park -> site),
 * so one extractor covers all of them.
 */
export const CAPTURE_SOURCE = `(() => {
  const text = (el) => (el ? (el.textContent || "").replace(/\\s+/g, " ").trim() : "");
  const entries = Array.from(document.querySelectorAll('[role="listitem"].list-entry, .list-entry'));

  const rows = entries.map((entry) => {
    const heading = entry.querySelector('h3[id^="map-link-name-"]') || entry.querySelector("h3");
    const hidden = heading ? heading.querySelector(".cdk-visually-hidden") : null;
    const category = text(hidden);
    let name = text(heading);
    if (category && name.startsWith(category)) name = name.slice(category.length).trim();

    const availabilityBlock = entry.querySelector('[id^="availability-"]');
    const label = text(availabilityBlock ? availabilityBlock.querySelector(".availability-label") : null);
    const icon = entry.querySelector('[class*="icon-available"], [class*="icon-unavailable"]');
    const iconClass = icon ? icon.className : "";

    return {
      name,
      category,
      availability: label,
      available: /available/i.test(label) && !/not\\s+available|unavailable/i.test(label),
      iconHint: iconClass,
    };
  }).filter((row) => row.name);

  const params = new URLSearchParams(location.search);
  const dateField = (id) => {
    const el = document.getElementById(id);
    return el ? el.getAttribute("data-e2e-date") || el.value || "" : "";
  };
  const equipment = text(document.querySelector("#equipment-field .mat-mdc-select-min-line"));
  const listLabel = document.querySelector(".list-view-results");

  const payload = {
    capturedAt: new Date().toISOString(),
    pageTitle: text(document.getElementById("pageTitle")),
    sourceUrl: location.href,
    search: {
      startDate: params.get("startDate") || dateField("arrival-date-field"),
      endDate: params.get("endDate") || dateField("departure-date-field"),
      nights: params.get("nights") || "",
      equipment,
      resultsLabel: listLabel ? listLabel.getAttribute("aria-label") || "" : "",
    },
    rows,
  };

  const json = JSON.stringify(payload, null, 2);
  const done = () => window.alert(
    "BC Parks capture: " + rows.length + " row(s) copied.\\n\\n" +
    (payload.pageTitle ? "Level: " + payload.pageTitle + "\\n" : "") +
    "Paste it into the dashboard's Capture box."
  );
  const fallback = () => {
    const box = document.createElement("textarea");
    box.value = json;
    box.style.cssText = "position:fixed;top:5%;left:5%;width:90%;height:70%;z-index:2147483647;font:12px monospace";
    document.body.appendChild(box);
    box.focus();
    box.select();
    window.alert("Clipboard was blocked. The JSON is selected in the box - copy it, then remove the box by reloading.");
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).then(done, fallback);
  } else {
    fallback();
  }
})()`;

export function captureBookmarklet() {
  return `javascript:${encodeURIComponent(CAPTURE_SOURCE)}`;
}

export type CapturedRow = {
  name: string;
  category: string;
  availability: string;
  available: boolean;
};

export type CapturePayload = {
  capturedAt: string;
  pageTitle: string;
  sourceUrl: string;
  search: {
    startDate: string;
    endDate: string;
    nights: string;
    equipment: string;
    resultsLabel: string;
  };
  rows: CapturedRow[];
};
