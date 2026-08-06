/**
 * Bookmarklet that reads an already-rendered BC Parks search-results page.
 *
 * This never issues its own request to the reservation site. The user runs
 * their own normal search in their own logged-in browser tab, and this only
 * reads the DOM already on screen, then posts those rows to this dashboard
 * (falling back to the clipboard if that send is blocked). That keeps it clear
 * of the Azure WAF bot challenge that rejects automated reads of the site.
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
  const found = Array.from(document.querySelectorAll('[role="listitem"].list-entry, .list-entry'));

  // At the individual-site level BC Parks renders each row more than once (the
  // markup carries hide_xs / hide_gt-xs responsive variants, and entries can
  // nest), which without this returned every site twice. Keep only innermost
  // matches, then collapse by name - names are unique within one result list at
  // every drill-down level, so this cannot merge two genuinely different rows.
  const entries = found.filter((el) => !found.some((other) => other !== el && el.contains(other)));

  const seen = Object.create(null);

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
  }).filter((row) => {
    if (!row.name) return false;
    if (seen[row.name]) return false;
    seen[row.name] = true;
    return true;
  });

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
  const summary = rows.filter((r) => r.available).length + " available of " + rows.length +
    (payload.pageTitle ? " in " + payload.pageTitle : "");

  const copyFallback = (why) => {
    const finish = () => window.alert(
      why + "\\n\\nCaptured " + summary + " and copied it instead.\\nPaste it into the dashboard's Capture box."
    );
    const manual = () => {
      const box = document.createElement("textarea");
      box.value = json;
      box.style.cssText = "position:fixed;top:5%;left:5%;width:90%;height:70%;z-index:2147483647;font:12px monospace";
      document.body.appendChild(box);
      box.focus();
      box.select();
      window.alert(why + "\\n\\nClipboard was blocked too. The JSON is selected - copy it, then reload to clear.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(finish, manual);
    } else {
      manual();
    }
  };

  // ENDPOINT is substituted in when the dashboard renders this bookmarklet, so
  // one click sends the capture straight there and no copy/paste is needed.
  // camping.bcparks.ca sets no connect-src (nor default-src) in its CSP, so a
  // cross-origin POST out is allowed; the dashboard answers the preflight.
  const endpoint = "__CAPTURE_ENDPOINT__";
  if (endpoint && endpoint.indexOf("http") === 0) {
    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: { "content-type": "application/json" },
      body: json,
    })
      .then((res) => res.json().catch(() => ({})).then((data) => {
        if (!res.ok) throw new Error((data && data.message) || ("HTTP " + res.status));
        window.alert("Sent to dashboard: " + ((data && data.message) || summary));
      }))
      .catch((err) => copyFallback("Could not reach the dashboard (" + err.message + ")."));
  } else {
    copyFallback("No dashboard endpoint configured.");
  }
})()`;

/**
 * Builds the bookmarklet URL.
 *
 * Pass the dashboard's own `/api/capture` URL to get the one-click version that
 * posts directly. With no endpoint the bookmarklet falls back to copying the
 * JSON for manual pasting, which is what the standalone install page uses
 * before the dashboard has been deployed anywhere.
 */
export function captureBookmarklet(endpoint?: string) {
  const source = CAPTURE_SOURCE.replace("__CAPTURE_ENDPOINT__", endpoint ?? "");
  return `javascript:${encodeURIComponent(source)}`;
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
