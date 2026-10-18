"use client";

// Farm settings (design.md S-FARM plus the PondScale feed price field). The
// action re-checks the session and validates lat −90..90, lon −180..180 and a
// feed price above zero on the server (docs/00-global.md §2).

import { useState } from "react";
import { saveSettings } from "@/lib/actions/settings";
import type { FormState } from "@/lib/auth";
import { AlertIcon, PinIcon } from "./icons";

const inputCls =
  "mt-1 h-12 w-full rounded-input border border-border bg-surface px-3 text-base outline-none focus:border-accent";
const labelCls = "block text-sm font-medium text-text";
const helperCls = "mt-1 text-sm text-muted";

export function SettingsForm({
  farm,
  feedPriceNaira,
}: {
  farm: { name: string; lat: number; lon: number };
  feedPriceNaira: string;
}) {
  const [name, setName] = useState(farm.name);
  const [lat, setLat] = useState(String(farm.lat));
  const [lon, setLon] = useState(String(farm.lon));
  const [price, setPrice] = useState(feedPriceNaira);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  function useMyLocation() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser cannot share a location — type the coordinates instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(4));
        setLon(position.coords.longitude.toFixed(4));
        setSaved(false);
      },
      () => setError("Could not read your location — type the coordinates instead."),
      { timeout: 10_000 },
    );
  }

  return (
    <form
      className="space-y-4 rounded-card border border-border bg-surface p-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData();
        data.set("name", name);
        data.set("lat", lat);
        data.set("lon", lon);
        data.set("feedPriceNaira", price);
        setPending(true);
        setError(null);
        setSaved(false);
        void saveSettings(null, data)
          .then((result: FormState) => {
            if (result?.error) setError(result.error);
            else if (result?.saved) setSaved(true);
          })
          .catch(() => setError("Could not save just now — try again."))
          .finally(() => setPending(false));
      }}
    >
      <div>
        <label htmlFor="farm-name" className={labelCls}>
          Farm name
        </label>
        <input
          id="farm-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          required
          maxLength={60}
          className={inputCls}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="farm-lat" className={labelCls}>
            Latitude
          </label>
          <input
            id="farm-lat"
            value={lat}
            onChange={(event) => {
              setLat(event.target.value);
              setSaved(false);
            }}
            inputMode="decimal"
            required
            aria-describedby="coords-help"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="farm-lon" className={labelCls}>
            Longitude
          </label>
          <input
            id="farm-lon"
            value={lon}
            onChange={(event) => {
              setLon(event.target.value);
              setSaved(false);
            }}
            inputMode="decimal"
            required
            aria-describedby="coords-help"
            className={inputCls}
          />
        </div>
      </div>
      <p id="coords-help" className={helperCls}>
        Latitude −90 to 90, longitude −180 to 180. The weather forecast follows these numbers.
      </p>
      <button
        type="button"
        onClick={useMyLocation}
        className="flex h-12 items-center gap-2 rounded-input border border-border px-4 font-medium"
      >
        <PinIcon className="h-4 w-4" />
        Use my location
      </button>

      <div>
        <label htmlFor="feed-price" className={labelCls}>
          Feed price per kg (₦)
        </label>
        <input
          id="feed-price"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
            setSaved(false);
          }}
          inputMode="decimal"
          required
          aria-describedby="feed-help"
          className={inputCls}
        />
        <p id="feed-help" className={helperCls}>
          What one kilogram of feed costs on this farm. Used for feed cost per kg of fish grown.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-input border border-danger bg-danger-bg p-3 text-sm font-medium text-danger"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {saved ? (
        <p
          role="status"
          className="rounded-input border border-success bg-success-bg p-3 text-sm font-medium text-success"
        >
          <span aria-hidden="true">✓</span> Saved. New checks will use this feed price.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-input bg-accent px-4 font-medium text-white disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
