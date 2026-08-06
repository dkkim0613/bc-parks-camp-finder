"use client";

import { useMemo, useState } from "react";
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
import { captureBookmarklet } from "@/lib/bcparks-capture";
import type { BookingPreset, DateRange, RefreshStatus, StayOption, StayType } from "./types";

const HOME_ADDRESS = "1015 Howie Ave";

export type CapturedRowRecord = {
  id: string;
  name: string;
  category: string;
  level: string;
  availability: string;
  available: number;
  start_date: string;
  end_date: string;
  nights: string;
  equipment: string;
  captured_at: string;
};

export default function CampFinder({
  stays,
  initialRefreshStatus,
  initialCaptured,
}: {
  stays: StayOption[];
  initialRefreshStatus: RefreshStatus | null;
  initialCaptured: CapturedRowRecord[];
}) {
  const [activeTab, setActiveTab] = useState<StayType>("campsite");
  const [range, setRange] = useState<DateRange>("90");
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [overnightOnly, setOvernightOnly] = useState(false);
  const [maxDrive, setMaxDrive] = useState(150);
  const [selected, setSelected] = useState<StayOption | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(initialRefreshStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualRefreshMessage, setManualRefreshMessage] = useState<string | null>(null);
  const [captured, setCaptured] = useState<CapturedRowRecord[]>(initialCaptured);

  const lastRefresh = refreshStatus?.refreshedAt ?? "Not refreshed yet";

  const filtered = useMemo(() => {
    return stays
      .map((option) => applyDateWindow(option, range))
      .filter((option): option is StayOption => option !== null)
      .filter((option) => option.type === activeTab)
      .filter((option) => option.maxParty <= 4)
      .filter((option) => !isMultiSiteBooking(option))
      .filter((option) => option.driveMinutes <= maxDrive)
      .filter((option) => !weekendOnly || option.weekend)
      .filter(
        (option) => !overnightOnly || option.nights.includes("2") || option.nights.includes("3")
      )
      .sort((a, b) => a.driveMinutes - b.driveMinutes || a.distanceKm - b.distanceKm);
  }, [activeTab, maxDrive, overnightOnly, range, stays, weekendOnly]);

  const refresh = async () => {
    setIsRefreshing(true);
    setManualRefreshMessage(null);

    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        status?: RefreshStatus;
      } | null;

      if (response.ok) {
        setManualRefreshMessage(data?.message ?? "Dashboard metadata refreshed.");
        if (data?.status) setRefreshStatus(data.status);
      } else {
        setManualRefreshMessage(data?.message ?? "Refresh request failed.");
      }
    } catch {
      setManualRefreshMessage("Refresh endpoint was not reachable.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main>
      <section className="hero">
        <div>
          <div className="park-plate">
            <Waves size={18} /> Forest &amp; Bear Finder
          </div>
          <p className="eyebrow">Flexible date search · max 4 people · no password stored</p>
          <h1>BC Parks Camp Finder</h1>
          <p className="hero-copy">
            Find realistic camping and cabin openings near {HOME_ADDRESS}, then jump to BC Parks with
            a ready booking summary.
          </p>
        </div>
        <div className="status-panel">
          <span>
            <Home size={17} /> {HOME_ADDRESS}
          </span>
          <span>
            <CalendarDays size={17} /> Next{" "}
            {range === "weekend" ? "open weekends" : `${range} days`}
          </span>
          <span>
            <ShieldCheck size={17} /> Browser password manager only
          </span>
        </div>
      </section>

      <section className="controls" aria-label="Search controls">
        <div className="tabs">
          <button
            className={activeTab === "campsite" ? "active" : ""}
            onClick={() => setActiveTab("campsite")}
          >
            <Tent size={18} /> Campsites
          </button>
          <button
            className={activeTab === "cabin" ? "active" : ""}
            onClick={() => setActiveTab("cabin")}
          >
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
          <input
            type="checkbox"
            checked={weekendOnly}
            onChange={(event) => setWeekendOnly(event.target.checked)}
          />
          Weekend only
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={overnightOnly}
            onChange={(event) => setOvernightOnly(event.target.checked)}
          />
          Multi-night
        </label>

        <button className="refresh" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={18} /> {isRefreshing ? "Refreshing..." : "Refresh now"}
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

      <CapturePanel captured={captured} onCaptured={setCaptured} />

      <section className="activity-log">
        <h2>Daily scan log</h2>
        {refreshStatus && (
          <div className="log-row new">
            Last refresh: {refreshStatus.refreshedAt} · {refreshStatus.source}
          </div>
        )}
        {manualRefreshMessage && (
          <div className="log-row new">Manual refresh: {manualRefreshMessage}</div>
        )}
        <div className="log-row">
          Scheduled refresh: Cloudflare Cron Trigger at midnight America/Vancouver
        </div>
        <div className="log-row">
          Live BC Parks availability feed:{" "}
          {refreshStatus?.liveAvailabilityConnected ? "connected" : "not connected yet"}
        </div>
        {refreshStatus?.note && <div className="log-row">{refreshStatus.note}</div>}
        <div className="log-row">
          Added estimated pricing using BC Parks base-fee plus reservation-fee rules
        </div>
        <div className="log-row">
          Excluding all double/paired/two-site campsite results by default
        </div>
        <div className="log-row">
          Fire status rechecked against BC Wildfire restrictions · official link attached
        </div>
        <div className="log-row">
          BC Parks booking handoff ready · payment and final confirmation stay manual
        </div>
      </section>

      {selected && <BookingModal option={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

/**
 * Half-automated capture of real BC Parks availability.
 *
 * camping.bcparks.ca sits behind an Azure WAF bot challenge, so nothing here
 * fetches that site. The user runs their own search in their own logged-in tab
 * and clicks the bookmarklet, which reads the results already on screen and
 * copies them; pasting that JSON below stores it.
 */
function CapturePanel({
  captured,
  onCaptured,
}: {
  captured: CapturedRowRecord[];
  onCaptured: (rows: CapturedRowRecord[]) => void;
}) {
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bookmarklet = captureBookmarklet();

  const submit = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(pasted);
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? (response.ok ? "Saved." : "Could not save that capture."));

      if (response.ok) {
        setPasted("");
        const refreshed = await fetch("/api/capture", { cache: "no-store" });
        const body = (await refreshed.json().catch(() => null)) as {
          rows?: CapturedRowRecord[];
        } | null;
        if (body?.rows) onCaptured(body.rows);
      }
    } catch {
      setMessage("That did not parse as JSON. Copy the whole bookmarklet output and paste it again.");
    } finally {
      setIsSaving(false);
    }
  };

  const availableRows = captured.filter((row) => row.available);

  return (
    <section className="activity-log">
      <h2>Capture real BC Parks availability</h2>
      <p>
        Live scraping is blocked by BC Parks&apos; bot protection, so this reads the results page you
        already have open instead. Nothing here contacts BC Parks on its own.
      </p>

      <div className="autofill-panel">
        <a className="bookmarklet" href={bookmarklet}>
          <KeyRound size={18} /> BC Parks Capture
        </a>
        <p>Drag this to your bookmarks bar once.</p>
      </div>

      <ol className="booking-steps">
        <li>Search on camping.bcparks.ca as usual and switch the results to List view.</li>
        <li>Click the saved <strong>BC Parks Capture</strong> bookmark — it copies what is on screen.</li>
        <li>Paste it below and save. Drill into a region or park and repeat for finer detail.</li>
      </ol>

      <textarea
        className="capture-input"
        value={pasted}
        onChange={(event) => setPasted(event.target.value)}
        placeholder="Paste the captured JSON here"
        rows={4}
      />
      <div className="modal-actions">
        <button onClick={submit} disabled={isSaving || !pasted.trim()}>
          <Clipboard size={17} /> {isSaving ? "Saving..." : "Save capture"}
        </button>
      </div>
      {message && <div className="log-row new">{message}</div>}

      {captured.length > 0 && (
        <>
          <div className="log-row new">
            {availableRows.length} available of {captured.length} captured row(s)
          </div>
          <div className="capture-results">
            {captured.map((row) => (
              <div key={row.id} className={`log-row ${row.available ? "new" : ""}`}>
                {row.available ? "○" : "×"} {row.name}
                {row.category ? ` · ${row.category}` : ""}
                {row.start_date ? ` · ${row.start_date}` : ""}
                {row.end_date ? ` → ${row.end_date}` : ""}
                {row.level ? ` · from ${row.level}` : ""}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
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
        <span>
          <CalendarDays size={16} /> Earliest {option.earliest}
        </span>
        <span>
          <DollarSign size={16} /> {option.price}
        </span>
        <span>
          <Search size={16} /> {option.nights}
        </span>
        {option.siteKind && (
          <span>
            <ShieldCheck size={16} /> {option.siteKind}
          </span>
        )}
        <span>
          <MapPin size={16} /> From {HOME_ADDRESS}
        </span>
        <span>
          <Utensils size={16} /> {option.maxParty} people max
        </span>
        {option.tents && (
          <span>
            <Tent size={16} /> {option.tents}
          </span>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <h3>Estimated price</h3>
          <p>
            {option.price}. {option.priceNote}.
          </p>
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
        <a href={option.sourceUrl} target="_blank" rel="noreferrer">
          Park details
        </a>
        <a href={option.fireUrl} target="_blank" rel="noreferrer">
          Fire bulletin
        </a>
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
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">
          <KeyRound size={15} /> Fast booking handoff
        </p>
        <h2 id="booking-title">{option.park}</h2>
        <p>
          BC Parks uses custom fields, so plain copy/paste will not fill the equipment dropdown. Use
          the helper below inside the official BC Parks tab to try selecting the matching tab, park,
          dates, and equipment for you.
        </p>

        <div className="autofill-panel">
          <a className="bookmarklet" href={bookmarklet}>
            <KeyRound size={18} /> BC Parks Autofill: {preset.parkSearch}
          </a>
          <p>
            Drag this button to the Chrome bookmarks bar once for this option. Then open BC Parks and
            click that bookmark while you are on the reservation page.
          </p>
        </div>

        <ol className="booking-steps">
          <li>Drag the green autofill button to your bookmarks bar.</li>
          <li>Open BC Parks booking.</li>
          <li>
            Click the saved <strong>BC Parks Autofill</strong> bookmark on the BC Parks page.
          </li>
          <li>Review everything, search, and complete cart/payment manually.</li>
        </ol>

        <div className="preset-card">
          <span>{preset.bookingType}</span>
          <strong>{preset.parkSearch}</strong>
          <span>
            {preset.arrival} to {preset.departure}
          </span>
          <span>
            {preset.equipment} · {preset.partySize}
          </span>
        </div>

        <div className="modal-actions">
          <button onClick={() => copyText(bookmarklet)}>
            <Clipboard size={17} /> Copy helper link
          </button>
          <button onClick={openBooking}>
            <ExternalLink size={17} /> Open BC Parks
          </button>
        </div>
        <div className="warning">
          <AlertTriangle size={17} />
          If BC Parks changes its page structure, the helper may stop at highlighting the fields. It
          will never submit payment or final confirmation.
        </div>
      </section>
    </div>
  );
}

function getBookingPreset(option: StayOption): BookingPreset {
  const firstDate = option.availableDates[0] ?? "";
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
