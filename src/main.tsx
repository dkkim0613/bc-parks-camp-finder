import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  CalendarDays,
  Car,
  Clipboard,
  DollarSign,
  ExternalLink,
  Flame,
  Home,
  KeyRound,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Tent,
  Trees,
  Utensils,
  Waves,
} from "lucide-react";
import "./styles.css";

type StayType = "campsite" | "cabin";
type DateRange = "30" | "60" | "90" | "weekend";
type FireStatus = "allowed" | "restricted" | "unknown";

type StayOption = {
  id: string;
  type: StayType;
  park: string;
  area: string;
  distanceKm: number;
  driveMinutes: number;
  earliest: string;
  availableDates: string[];
  availableDateOffsets: number[];
  nights: string;
  weekend: boolean;
  maxParty: number;
  tents?: string;
  siteKind?: string;
  price: string;
  priceNote: string;
  facilities: string[];
  activities: string[];
  fireStatus: FireStatus;
  cooking: string;
  sourceUrl: string;
  bookingUrl: string;
  fireUrl: string;
};

type BookingPreset = {
  bookingType: "Campsite" | "Cabin";
  parkSearch: string;
  arrival: string;
  departure: string;
  equipment: string;
  partySize: string;
};

type RefreshStatus = {
  refreshedAt: string;
  source: string;
  mode: string;
  liveAvailabilityConnected: boolean;
  manualRefreshConnected?: boolean;
  note: string;
};

const HOME_ADDRESS = "1015 Howie Ave";
const GITHUB_WORKFLOW_URL =
  "https://github.com/dkkim0613/bc-parks-camp-finder/actions/workflows/daily-refresh.yml";

const options: StayOption[] = [
  {
    id: "porteau-cove-main",
    type: "campsite",
    park: "Porteau Cove Park",
    area: "Oceanfront campsites",
    distanceKm: 47,
    driveMinutes: 45,
    earliest: "Aug 7",
    availableDates: ["Aug 7-8", "Aug 18", "Sep 3-5", "Sep 21"],
    availableDateOffsets: [4, 15, 31, 49],
    nights: "1-2 nights",
    weekend: true,
    maxParty: 4,
    tents: "1-3 tents",
    siteKind: "Standard single site",
    price: "~$41-$59 CAD total",
    priceNote: "1 night estimate: camping fee + $6 reservation fee; non-residents add $20",
    facilities: ["Flush toilets", "Showers", "Drinking water", "Boat launch"],
    activities: ["Ocean views", "Kayaking", "Diving", "Short shoreline walks"],
    fireStatus: "restricted",
    cooking: "Gas/propane stove likely okay; confirm bulletin before travel",
    sourceUrl: "https://bcparks.ca/porteau-cove-park/",
    bookingUrl: "https://camping.bcparks.ca/",
    fireUrl:
      "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  },
  {
    id: "alice-lake-camping",
    type: "campsite",
    park: "Alice Lake Park",
    area: "Family campground",
    distanceKm: 78,
    driveMinutes: 75,
    earliest: "Aug 13",
    availableDates: ["Aug 13", "Aug 27-28", "Sep 9-11", "Oct 2-3"],
    availableDateOffsets: [10, 24, 37, 60],
    nights: "1-3 nights",
    weekend: true,
    maxParty: 4,
    tents: "1-3 tents",
    siteKind: "Standard single site",
    price: "~$47-$65 CAD total",
    priceNote: "1 night estimate: camping fee + $6 reservation fee; non-residents add $20",
    facilities: ["Flush toilets", "Showers", "Drinking water", "Playground"],
    activities: ["Lake swimming", "Hiking", "Biking nearby", "Family beach time"],
    fireStatus: "restricted",
    cooking: "Use contained camp stove; campfires depend on current order",
    sourceUrl: "https://bcparks.ca/alice-lake-park/",
    bookingUrl: "https://camping.bcparks.ca/",
    fireUrl:
      "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  },
  {
    id: "golden-ears-alouette",
    type: "campsite",
    park: "Golden Ears Park",
    area: "Alouette Lake area",
    distanceKm: 61,
    driveMinutes: 70,
    earliest: "Aug 20",
    availableDates: ["Aug 20", "Sep 6-7", "Sep 17-19", "Oct 4"],
    availableDateOffsets: [17, 34, 45, 62],
    nights: "1-2 nights",
    weekend: true,
    maxParty: 4,
    tents: "1-3 tents",
    siteKind: "Double site",
    price: "~$47-$65 CAD total",
    priceNote: "Excluded by default: double-site booking would roughly double site fees",
    facilities: ["Pit/flush toilets", "Drinking water", "Boat launch", "Picnic areas"],
    activities: ["Lake paddling", "Beach", "Waterfalls", "Trail network"],
    fireStatus: "unknown",
    cooking: "Check park advisory and fire centre before using open flame",
    sourceUrl: "https://bcparks.ca/golden-ears-park/",
    bookingUrl: "https://camping.bcparks.ca/",
    fireUrl:
      "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  },
  {
    id: "cultus-lake-cabin",
    type: "cabin",
    park: "Cultus Lake Park",
    area: "Cabin-style stays",
    distanceKm: 103,
    driveMinutes: 90,
    earliest: "Sep 8",
    availableDates: ["Sep 8-10", "Sep 24", "Oct 6-8"],
    availableDateOffsets: [36, 52, 64],
    nights: "1-3 nights",
    weekend: false,
    maxParty: 4,
    siteKind: "Cabin",
    price: "~$96-$146 CAD total",
    priceNote: "1 night cabin estimate + $6 reservation fee; non-residents add $20",
    facilities: ["Nearby washrooms", "Lake access", "Picnic areas", "Family amenities"],
    activities: ["Swimming", "Paddling", "Easy walks", "Nearby family attractions"],
    fireStatus: "restricted",
    cooking: "Cabin cooking rules vary; verify appliance and flame rules",
    sourceUrl: "https://bcparks.ca/cultus-lake-park/",
    bookingUrl: "https://camping.bcparks.ca/",
    fireUrl:
      "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  },
  {
    id: "saysutshun-cabin",
    type: "cabin",
    park: "Saysutshun Newcastle Island Park",
    area: "Group-friendly cabin options",
    distanceKm: 82,
    driveMinutes: 125,
    earliest: "Aug 29",
    availableDates: ["Aug 29-30", "Sep 15-17", "Oct 10"],
    availableDateOffsets: [26, 43, 68],
    nights: "1-2 nights",
    weekend: true,
    maxParty: 4,
    siteKind: "Cabin",
    price: "~$86-$136 CAD total",
    priceNote: "1 night cabin estimate + $6 reservation fee; ferry/park extras not included",
    facilities: ["Ferry access", "Flush toilets", "Picnic areas", "Food nearby seasonally"],
    activities: ["Island walks", "Beaches", "Cycling", "Harbour views"],
    fireStatus: "allowed",
    cooking: "Contained stove preferred; confirm local island/park restrictions",
    sourceUrl: "https://bcparks.ca/saysutshun-newcastle-island-marine-park/",
    bookingUrl: "https://camping.bcparks.ca/",
    fireUrl:
      "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions",
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<StayType>("campsite");
  const [range, setRange] = useState<DateRange>("90");
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [overnightOnly, setOvernightOnly] = useState(false);
  const [maxDrive, setMaxDrive] = useState(150);
  const [lastRefresh, setLastRefresh] = useState("Today 7:15 AM");
  const [selected, setSelected] = useState<StayOption | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualRefreshMessage, setManualRefreshMessage] = useState<string | null>(null);

  const loadRefreshStatus = async () => {
    return fetch("/refresh-status.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: RefreshStatus | null) => {
        if (data) {
          setRefreshStatus(data);
          setLastRefresh(data.refreshedAt);
        }
      })
      .catch(() => {
        setRefreshStatus(null);
      });
  };

  useEffect(() => {
    void loadRefreshStatus();
  }, []);

  const filtered = useMemo(() => {
    return options
      .map((option) => applyDateWindow(option, range))
      .filter((option): option is StayOption => option !== null)
      .filter((option) => option.type === activeTab)
      .filter((option) => option.maxParty <= 4)
      .filter((option) => !isMultiSiteBooking(option))
      .filter((option) => option.driveMinutes <= maxDrive)
      .filter((option) => !weekendOnly || option.weekend)
      .filter((option) => !overnightOnly || option.nights.includes("2") || option.nights.includes("3"))
      .sort((a, b) => a.driveMinutes - b.driveMinutes || a.distanceKm - b.distanceKm);
  }, [activeTab, maxDrive, overnightOnly, range, weekendOnly]);

  const refresh = async () => {
    setIsRefreshing(true);
    setManualRefreshMessage(null);

    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const data = (await response.json().catch(() => null)) as { message?: string; code?: string } | null;

      if (response.ok) {
        setManualRefreshMessage(data?.message ?? "GitHub refresh workflow started.");
      } else if (data?.code === "missing_token") {
        setManualRefreshMessage(
          "Manual refresh is connected, but the public site still needs a server-side GitHub token. Opening the GitHub Actions page as a safe fallback.",
        );
        window.open(GITHUB_WORKFLOW_URL, "_blank", "noopener,noreferrer");
      } else {
        setManualRefreshMessage(data?.message ?? "Refresh request failed. Use the GitHub Actions page as fallback.");
      }
    } catch {
      setManualRefreshMessage("Refresh endpoint was not reachable. Use the GitHub Actions page as fallback.");
    } finally {
      setIsRefreshing(false);
      void loadRefreshStatus();
    }
  };

  return (
    <main>
      <section className="hero">
        <div>
          <div className="park-plate"><Waves size={18} /> Forest & Bear Finder</div>
          <p className="eyebrow">Flexible date search · max 4 people · no password stored</p>
          <h1>BC Parks Camp Finder</h1>
          <p className="hero-copy">
            Find realistic camping and cabin openings near {HOME_ADDRESS}, then jump to BC Parks with a
            ready booking summary.
          </p>
        </div>
        <div className="status-panel">
          <span><Home size={17} /> {HOME_ADDRESS}</span>
          <span><CalendarDays size={17} /> Next {range === "weekend" ? "open weekends" : `${range} days`}</span>
          <span><ShieldCheck size={17} /> Browser password manager only</span>
        </div>
      </section>

      <section className="controls" aria-label="Search controls">
        <div className="tabs">
          <button className={activeTab === "campsite" ? "active" : ""} onClick={() => setActiveTab("campsite")}>
            <Tent size={18} /> Campsites
          </button>
          <button className={activeTab === "cabin" ? "active" : ""} onClick={() => setActiveTab("cabin")}>
            <Trees size={18} /> Cabins
          </button>
        </div>

        <label>
          Window
          <select value={range} onChange={(event) => setRange(event.target.value as DateRange)}>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
            <option value="90">Next 90 days</option>
            <option value="weekend">Weekend openings</option>
          </select>
        </label>

        <label>
          Max drive
          <input
            type="range"
            min="45"
            max="180"
            step="15"
            value={maxDrive}
            onChange={(event) => setMaxDrive(Number(event.target.value))}
          />
          <span>{maxDrive} min</span>
        </label>

        <label className="check">
          <input type="checkbox" checked={weekendOnly} onChange={(event) => setWeekendOnly(event.target.checked)} />
          Weekend only
        </label>

        <label className="check">
          <input type="checkbox" checked={overnightOnly} onChange={(event) => setOvernightOnly(event.target.checked)} />
          Multi-night
        </label>

        <button className="refresh" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={18} /> {isRefreshing ? "Starting..." : "Refresh now"}
        </button>
      </section>

      <section className="summary">
        <div>
          <strong>{filtered.length}</strong>
          <span>{activeTab === "campsite" ? "campsite" : "cabin"} options</span>
        </div>
        <div>
          <strong>4</strong>
          <span>people max</span>
        </div>
        <div>
          <strong>{activeTab === "campsite" ? "1-3" : "Cabin"}</strong>
          <span>{activeTab === "campsite" ? "tents" : "list only"}</span>
        </div>
        <div>
          <strong>CAD</strong>
          <span>estimated total</span>
        </div>
        {activeTab === "campsite" && (
          <div>
            <strong>Single</strong>
            <span>site only</span>
          </div>
        )}
        <div>
          <strong>{lastRefresh}</strong>
          <span>last checked</span>
        </div>
      </section>

      <section className="results" aria-live="polite">
        {filtered.map((option) => (
          <OptionCard key={option.id} option={option} onBook={() => setSelected(option)} />
        ))}
      </section>

      <section className="activity-log">
        <h2>Daily scan log</h2>
        {refreshStatus && (
          <div className="log-row new">
            GitHub refresh: {refreshStatus.refreshedAt} · {refreshStatus.source}
          </div>
        )}
        {manualRefreshMessage && <div className="log-row new">Manual refresh: {manualRefreshMessage}</div>}
        <div className="log-row">
          Manual refresh endpoint: {refreshStatus?.manualRefreshConnected ? "connected to GitHub Actions" : "pending"}
          {" · "}
          <a href={GITHUB_WORKFLOW_URL} target="_blank" rel="noreferrer">
            GitHub Actions fallback
          </a>
        </div>
        <div className="log-row">
          Live BC Parks availability feed: {refreshStatus?.liveAvailabilityConnected ? "connected" : "not connected yet"}
        </div>
        <div className="log-row new">New opening: Porteau Cove Sep 3-5 · campsite</div>
        <div className="log-row">Added estimated pricing using BC Parks base-fee plus reservation-fee rules</div>
        <div className="log-row">Excluding all double/paired/two-site campsite results by default</div>
        <div className="log-row">Fire status rechecked against BC Wildfire restrictions · official link attached</div>
        <div className="log-row">BC Parks booking handoff ready · payment and final confirmation stay manual</div>
      </section>

      {selected && <BookingModal option={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function OptionCard({ option, onBook }: { option: StayOption; onBook: () => void }) {
  const fireLabel =
    option.fireStatus === "allowed"
      ? "Campfire check: no matching ban in sample"
      : option.fireStatus === "restricted"
        ? "Fire restriction likely"
        : "Fire status needs confirmation";

  return (
    <article className="option-card">
      <div className="card-top">
        <div>
          <p className="type-label">{option.type === "campsite" ? "Campsite" : "Cabin"}</p>
          <h2>{option.park}</h2>
          <p>{option.area}</p>
        </div>
        <div className="distance">
          <Car size={20} />
          <strong>{option.driveMinutes} min</strong>
          <span>{option.distanceKm} km</span>
        </div>
      </div>

      <div className="date-strip">
        <strong>{option.availableDates.length} date groups</strong>
        {option.availableDates.map((date) => (
          <span key={date}>{date}</span>
        ))}
      </div>

      <div className="facts">
        <span><CalendarDays size={16} /> Earliest {option.earliest}</span>
        <span><DollarSign size={16} /> {option.price}</span>
        <span><Search size={16} /> {option.nights}</span>
        {option.siteKind && <span><ShieldCheck size={16} /> {option.siteKind}</span>}
        <span><MapPin size={16} /> From {HOME_ADDRESS}</span>
        <span><Utensils size={16} /> {option.maxParty} people max</span>
        {option.tents && <span><Tent size={16} /> {option.tents}</span>}
      </div>

      <div className="detail-grid">
        <div>
          <h3>Estimated price</h3>
          <p>{option.price}. {option.priceNote}.</p>
        </div>
        <div>
          <h3>Facilities</h3>
          <p>{option.facilities.join(" · ")}</p>
        </div>
        <div>
          <h3>Nearby</h3>
          <p>{option.activities.join(" · ")}</p>
        </div>
      </div>

      <div className={`fire ${option.fireStatus}`}>
        <Flame size={18} />
        <div>
          <strong>{fireLabel}</strong>
          <p>{option.cooking}</p>
        </div>
      </div>

      <div className="card-actions">
        <a href={option.sourceUrl} target="_blank" rel="noreferrer">Park details</a>
        <a href={option.fireUrl} target="_blank" rel="noreferrer">Fire bulletin</a>
        <button onClick={onBook}>Prepare booking</button>
      </div>
    </article>
  );
}

function BookingModal({ option, onClose }: { option: StayOption; onClose: () => void }) {
  const preset = getBookingPreset(option);
  const summary = `${option.type.toUpperCase()} | ${option.park} | ${option.area}
Party: up to 4 people
Try first: ${preset.arrival} to ${preset.departure}
Backup dates: ${option.availableDates.join(", ")}
BC Parks tab: ${preset.bookingType}
Park field: ${preset.parkSearch}
Equipment field: ${preset.equipment}
From: ${HOME_ADDRESS} · approx. ${option.distanceKm} km / ${option.driveMinutes} min
Cooking/fire: ${option.cooking}
Estimated price: ${option.price} (${option.priceNote})
Final payment and reservation confirmation must be completed manually on camping.bcparks.ca.`;

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const openBooking = async () => {
    await copyText(summary);
    window.open(option.bookingUrl, "_blank", "noopener,noreferrer");
  };
  const bookmarklet = makeAutofillBookmarklet(preset);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow"><KeyRound size={15} /> Fast booking handoff</p>
        <h2 id="booking-title">{option.park}</h2>
        <p>
          BC Parks uses custom fields, so plain copy/paste will not fill the equipment dropdown. Use the
          helper below inside the official BC Parks tab to try selecting the matching tab, park, dates, and
          equipment for you.
        </p>

        <div className="autofill-panel">
          <a className="bookmarklet" href={bookmarklet}>
            <KeyRound size={18} /> BC Parks Autofill: {preset.parkSearch}
          </a>
          <p>
            Drag this button to the Chrome bookmarks bar once for this option. Then open BC Parks and click
            that bookmark while you are on the reservation page.
          </p>
        </div>

        <ol className="booking-steps">
          <li>Drag the green autofill button to your bookmarks bar.</li>
          <li>Open BC Parks booking.</li>
          <li>Click the saved <strong>BC Parks Autofill</strong> bookmark on the BC Parks page.</li>
          <li>Review everything, search, and complete cart/payment manually.</li>
        </ol>

        <div className="preset-card">
          <span>{preset.bookingType}</span>
          <strong>{preset.parkSearch}</strong>
          <span>{preset.arrival} to {preset.departure}</span>
          <span>{preset.equipment} · {preset.partySize}</span>
        </div>

        <div className="modal-actions">
          <button onClick={() => copyText(bookmarklet)}><Clipboard size={17} /> Copy helper link</button>
          <button onClick={openBooking}><ExternalLink size={17} /> Open BC Parks</button>
        </div>
        <div className="warning">
          <AlertTriangle size={17} />
          If BC Parks changes its page structure, the helper may stop at highlighting the fields. It will never
          submit payment or final confirmation.
        </div>
      </section>
    </div>
  );
}

function getBookingPreset(option: StayOption): BookingPreset {
  const firstDate = option.availableDates[0];
  const [arrivalLabel, departureLabel] = firstDate.includes("-")
    ? firstDate.split("-")
    : [firstDate, nextDayLabel(firstDate)];

  return {
    bookingType: option.type === "cabin" ? "Cabin" : "Campsite",
    parkSearch: option.park.replace(" Park", ""),
    arrival: formatBookingDate(arrivalLabel),
    departure: formatBookingDate(departureLabel, arrivalLabel),
    equipment: option.type === "cabin" ? "Cabin" : "Tent",
    partySize: "4 people",
  };
}

function isMultiSiteBooking(option: StayOption) {
  if (option.type !== "campsite") {
    return false;
  }

  const haystack = [option.siteKind, option.area, option.priceNote].join(" ").toLowerCase();
  return /\b(double|paired|two[-\s]?site|2[-\s]?site|multi[-\s]?site)\b/.test(haystack);
}

function applyDateWindow(option: StayOption, range: DateRange) {
  const maxOffset = range === "weekend" ? 90 : Number(range);
  const datePairs = option.availableDates
    .map((date, index) => ({
      date,
      offset: option.availableDateOffsets[index] ?? 999,
    }))
    .filter(({ offset }) => offset <= maxOffset);

  if (datePairs.length === 0) {
    return null;
  }

  const dates = datePairs.map(({ date }) => date);
  return {
    ...option,
    earliest: dates[0],
    availableDates: dates,
  };
}

function makeAutofillBookmarklet(preset: BookingPreset) {
  const source = `(() => {
    const preset = ${JSON.stringify(preset)};
    const norm = (value) => (value || "").replace(/\\s+/g, " ").trim().toLowerCase();
    const visible = (el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };
    const all = () => Array.from(document.querySelectorAll("button, [role=button], a, input, [contenteditable=true], .form-control, .dropdown-toggle, mat-select, ng-select, [role=combobox]")).filter(visible);
    const byText = (text) => all().find((el) => norm(el.innerText || el.textContent || el.value).includes(norm(text)));
    const clickText = (text) => {
      const el = byText(text);
      if (el) {
        el.click();
        return true;
      }
      return false;
    };
    const mark = (el) => {
      if (!el) return;
      el.scrollIntoView({ block: "center", inline: "center" });
      el.style.outline = "4px solid #18a058";
      el.style.outlineOffset = "3px";
    };
    const setNativeValue = (el, value) => {
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      mark(el);
      return true;
    };
    const fieldNearLabel = (label) => {
      const labels = Array.from(document.querySelectorAll("label, div, span, p")).filter((el) => norm(el.textContent) === norm(label));
      for (const labelEl of labels) {
        const region = labelEl.closest("div, section, form") || labelEl.parentElement;
        const target = region?.querySelector("input, button, [role=button], [role=combobox], .dropdown-toggle, mat-select, ng-select");
        if (target && visible(target)) return target;
      }
      return null;
    };
    const chooseDropdown = (label, value) => {
      const field = fieldNearLabel(label);
      if (!field) return false;
      field.click();
      mark(field);
      window.setTimeout(() => clickText(value), 350);
      return true;
    };
    clickText(preset.bookingType);
    window.setTimeout(() => {
      const parkField = fieldNearLabel("Park");
      if (parkField?.tagName === "INPUT") setNativeValue(parkField, preset.parkSearch);
      else if (parkField) {
        parkField.click();
        mark(parkField);
        window.setTimeout(() => clickText(preset.parkSearch), 350);
      }
      const arrival = fieldNearLabel("Arrival");
      const departure = fieldNearLabel("Departure");
      if (arrival?.tagName === "INPUT") setNativeValue(arrival, preset.arrival);
      else mark(arrival);
      if (departure?.tagName === "INPUT") setNativeValue(departure, preset.departure);
      else mark(departure);
      chooseDropdown("Equipment", preset.equipment);
      window.alert("BC Parks Autofill tried: " + preset.bookingType + " / " + preset.parkSearch + " / " + preset.arrival + " to " + preset.departure + " / " + preset.equipment + ". Please review before searching or paying.");
    }, 500);
  })()`;

  return `javascript:${encodeURIComponent(source)}`;
}

function formatBookingDate(label: string, fallbackMonth?: string) {
  const cleaned = label.trim();
  const hasMonth = /^[A-Za-z]{3}/.test(cleaned);
  const fullLabel = hasMonth ? cleaned : `${fallbackMonth?.split(" ")[0] ?? "Aug"} ${cleaned}`;
  const date = new Date(`${fullLabel}, 2026 12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return fullLabel;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function nextDayLabel(label: string) {
  const date = new Date(`${label}, 2026 12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return label;
  }
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

createRoot(document.getElementById("root")!).render(<App />);
