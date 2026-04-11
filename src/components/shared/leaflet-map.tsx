"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

// TypeScript: make Leaflet available as a loosely-typed global.
// We avoid an `any` spread by typing it as `unknown` and narrowing with
// small local interfaces where we actually use it.
declare global {
  interface Window {
    L?: LeafletLike;
  }
}

// Minimal subset of the Leaflet API we need at runtime.
interface LeafletLatLng {
  lat: number;
  lng: number;
}
interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (html: string) => LeafletMarker;
  openPopup: () => LeafletMarker;
  setLatLng: (latlng: [number, number]) => LeafletMarker;
  remove: () => void;
}
interface LeafletTileLayer {
  addTo: (map: LeafletMap) => LeafletTileLayer;
}
interface LeafletCircle {
  addTo: (map: LeafletMap) => LeafletCircle;
  remove: () => void;
}
interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: [number, number][], options?: Record<string, unknown>) => LeafletMap;
  remove: () => void;
  removeLayer: (layer: unknown) => LeafletMap;
  on: (event: string, handler: (e: { latlng: LeafletLatLng }) => void) => void;
}
interface LeafletIcon {
  options?: Record<string, unknown>;
}
interface LeafletLike {
  map: (el: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => LeafletTileLayer;
  marker: (latlng: [number, number], options?: { icon?: LeafletIcon }) => LeafletMarker;
  circle: (latlng: [number, number], options?: Record<string, unknown>) => LeafletCircle;
  divIcon: (options: Record<string, unknown>) => LeafletIcon;
  latLngBounds: (latlngs: [number, number][]) => unknown;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description?: string;
  color?: string; // e.g., "#3b82f6"
}

interface LeafletMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

// Load Leaflet JS + CSS from unpkg once, cache the promise on window.
let leafletLoadingPromise: Promise<LeafletLike> | null = null;

function loadLeaflet(): Promise<LeafletLike> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only load in the browser"));
  }
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadingPromise) return leafletLoadingPromise;

  leafletLoadingPromise = new Promise<LeafletLike>((resolve, reject) => {
    // Inject CSS
    if (!document.querySelector('link[data-leaflet="1"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    // Inject JS
    const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet="1"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet failed to load"));
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.setAttribute("data-leaflet", "1");
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet global not found after load"));
    };
    script.onerror = () => reject(new Error("Failed to load Leaflet script"));
    document.head.appendChild(script);
  });
  return leafletLoadingPromise;
}

export function LeafletMap({
  markers,
  center,
  zoom = 11,
  height = "420px",
  className = "",
  onMapClick,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");

  // Compute default center from markers if not provided
  const defaultCenter: [number, number] =
    center ??
    (markers.length > 0
      ? [
          markers.reduce((s, m) => s + m.lat, 0) / markers.length,
          markers.reduce((s, m) => s + m.lng, 0) / markers.length,
        ]
      : [30.0444, 31.2357]); // fallback: Cairo

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          center: defaultCenter,
          zoom,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        if (onMapClick) {
          map.on("click", (e) => onMapClick(e.latlng.lat, e.latlng.lng));
        }
        mapRef.current = map;
        setStatus("ready");
      })
      .catch((err: Error) => {
        setStatus("error");
        setError(err.message);
      });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers when map is ready or markers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !window.L) return;
    const L = window.L;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (markers.length === 0) return;

    markers.forEach((m) => {
      const color = m.color ?? "#3b82f6";
      const icon = L.divIcon({
        className: "custom-pin",
        html: `
          <div style="position:relative; width:26px; height:34px;">
            <div style="
              position:absolute; top:0; left:0;
              width:26px; height:26px; border-radius:50%;
              background:${color};
              border:3px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            "></div>
            <div style="
              position:absolute; top:22px; left:9px;
              width:0; height:0;
              border-left:4px solid transparent;
              border-right:4px solid transparent;
              border-top:10px solid ${color};
            "></div>
          </div>
        `,
        iconSize: [26, 34],
        iconAnchor: [13, 34],
        popupAnchor: [0, -32],
      });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif; min-width:140px;">
          <div style="font-weight:600; font-size:13px; color:#111827;">${escapeHtml(m.label)}</div>
          ${m.description ? `<div style="font-size:11px; color:#6b7280; margin-top:2px;">${escapeHtml(m.description)}</div>` : ""}
          <div style="font-size:10px; color:#9ca3af; margin-top:4px; font-family:monospace;">
            ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      markersRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = markers.map((m) => [m.lat, m.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    }
  }, [markers, status]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 rounded-lg gap-2 z-10">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading OpenStreetMap…</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 rounded-lg gap-2 z-10 p-4 text-center">
          <MapPin className="h-6 w-6 text-red-500" />
          <p className="text-sm font-medium text-red-700">Could not load map</p>
          <p className="text-xs text-red-600">{error}</p>
          <p className="text-xs text-red-500">Check your internet connection.</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden border border-slate-200"
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
