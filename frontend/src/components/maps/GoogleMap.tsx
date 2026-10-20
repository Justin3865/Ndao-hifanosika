"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __gmapsPromise?: Promise<void>;
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsPromise) return window.__gmapsPromise;

  window.__gmapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Chargement de Google Maps impossible"));
    document.head.appendChild(script);
  });

  return window.__gmapsPromise;
}

/** Altitude (m) d'un point via l'API Elevation (à activer dans Google Cloud). */
export async function fetchElevation(latitude: number, longitude: number): Promise<number | null> {
  if (!API_KEY) return null;

  try {
    await loadGoogleMaps();
    const service = new window.google.maps.ElevationService();
    const result = await service.getElevationForLocations({ locations: [{ lat: latitude, lng: longitude }] });
    const value = result?.results?.[0]?.elevation;
    return typeof value === "number" ? Math.round(value) : null;
  } catch {
    return null;
  }
}

export const MAPS_ENABLED = Boolean(API_KEY);

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  radius?: number;
  shape?: "circle" | "square" | "triangle";
  /** Texte brut affiché dans la bulle d'information */
  info?: string;
}

export interface MapLine {
  id: string;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  label?: string;
  color?: string;
}

/** Trajet à tracer entre deux points (itinéraire routier si l'API Directions est activée). */
export interface MapRoute {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color?: string;
}

export interface RouteInfo {
  distanceKm: number;
  /** null quand seule la ligne droite est disponible */
  durationMin: number | null;
  /** true si le trajet suit les routes (Directions API) */
  road: boolean;
}

interface Props {
  markers: MapMarker[];
  lines?: MapLine[];
  route?: MapRoute | null;
  onRouteInfo?: (info: RouteInfo | null) => void;
  height?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (latitude: number, longitude: number) => void;
  /** Recadre à chaque changement de la liste de marqueurs (sinon une seule fois) */
  refit?: boolean;
  className?: string;
}

// Madagascar
const DEFAULT_CENTER = { lat: -19.0, lng: 46.9 };

const SHAPES: Record<string, string> = {
  square: "M -1 -1 L 1 -1 L 1 1 L -1 1 z",
  triangle: "M 0 -1.2 L 1 1 L -1 1 z",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

function straightKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function GoogleMap({ markers, lines = [], route = null, onRouteInfo, height = 420, selectedId, onSelect, onMapClick, refit, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());
  const lineRefs = useRef<any[]>([]);
  const routeRefs = useRef<any[]>([]);
  const routeInfoRef = useRef(onRouteInfo);
  const fittedRef = useRef(false);
  const clickRef = useRef(onMapClick);
  const selectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  clickRef.current = onMapClick;
  selectRef.current = onSelect;
  routeInfoRef.current = onRouteInfo;

  useEffect(() => {
    if (!API_KEY) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 5,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });

        mapRef.current.addListener("click", (event: any) => {
          clickRef.current?.(event.latLng.lat(), event.latLng.lng());
        });

        infoRef.current = new window.google.maps.InfoWindow();
        setReady(true);
      })
      .catch((err) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // Marqueurs
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const google = window.google;
    const existing = markerRefs.current;
    const seen = new Set<string>();

    markers.forEach((item) => {
      seen.add(item.id);

      const icon = {
        path: item.shape && SHAPES[item.shape] ? SHAPES[item.shape] : google.maps.SymbolPath.CIRCLE,
        scale: item.radius ?? 9,
        fillColor: item.color,
        fillOpacity: 0.9,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      };

      let marker = existing.get(item.id);

      if (!marker) {
        marker = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: item.latitude, lng: item.longitude },
          title: item.title,
          icon,
        });

        marker.addListener("click", () => {
          const html = `<div style="font-family:system-ui;max-width:230px"><strong>${escapeHtml(item.title)}</strong>${
            item.info ? `<div style="margin-top:4px;color:#4b5563;font-size:12px">${escapeHtml(item.info)}</div>` : ""
          }</div>`;
          infoRef.current.setContent(html);
          infoRef.current.open({ map: mapRef.current, anchor: marker });
          selectRef.current?.(item.id);
        });

        existing.set(item.id, marker);
      } else {
        marker.setPosition({ lat: item.latitude, lng: item.longitude });
        marker.setIcon(icon);
        marker.setTitle(item.title);
      }
    });

    existing.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.setMap(null);
        existing.delete(id);
      }
    });

    if ((refit || !fittedRef.current) && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.latitude, lng: m.longitude }));
      mapRef.current.fitBounds(bounds, 70);

      if (markers.length === 1) mapRef.current.setZoom(12);
      fittedRef.current = true;
    }
  }, [markers, ready, refit]);

  // Lignes (distance agent -> ménage)
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const google = window.google;

    lineRefs.current.forEach((item) => item.setMap(null));
    lineRefs.current = [];

    lines.forEach((line) => {
      const path = [
        { lat: line.from.latitude, lng: line.from.longitude },
        { lat: line.to.latitude, lng: line.to.longitude },
      ];

      const polyline = new google.maps.Polyline({
        map: mapRef.current,
        path,
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: line.color ?? "#1d4ed8", scale: 3 },
            offset: "0",
            repeat: "14px",
          },
        ],
      });

      lineRefs.current.push(polyline);

      if (line.label) {
        const mid = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: (path[0].lat + path[1].lat) / 2, lng: (path[0].lng + path[1].lng) / 2 },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
          label: { text: line.label, color: "#1e3a8a", fontSize: "12px", fontWeight: "700" },
          clickable: false,
        });
        lineRefs.current.push(mid);
      }
    });
  }, [lines, ready]);

  // Trajet (itinéraire routier, sinon ligne droite)
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const google = window.google;
    let cancelled = false;

    routeRefs.current.forEach((item) => item.setMap(null));
    routeRefs.current = [];

    if (!route) {
      routeInfoRef.current?.(null);
      return;
    }

    const color = route.color ?? "#1d4ed8";

    const drawStraight = () => {
      if (cancelled) return;

      routeRefs.current.push(
        new google.maps.Polyline({
          map: mapRef.current,
          path: [route.from, route.to],
          strokeColor: color,
          strokeOpacity: 0.85,
          strokeWeight: 4,
        }),
      );

      routeInfoRef.current?.({
        distanceKm: Math.round(straightKm(route.from, route.to) * 10) / 10,
        durationMin: null,
        road: false,
      });
    };

    try {
      new google.maps.DirectionsService().route(
        { origin: route.from, destination: route.to, travelMode: google.maps.TravelMode.DRIVING },
        (result: any, status: string) => {
          if (cancelled) return;

          if (status !== "OK" || !result?.routes?.[0]) {
            drawStraight();
            return;
          }

          const best = result.routes[0];

          routeRefs.current.push(
            new google.maps.Polyline({
              map: mapRef.current,
              path: best.overview_path,
              strokeColor: color,
              strokeOpacity: 0.9,
              strokeWeight: 5,
            }),
          );

          const legs: any[] = best.legs ?? [];
          const meters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
          const seconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);

          routeInfoRef.current?.({
            distanceKm: Math.round(meters / 100) / 10,
            durationMin: seconds ? Math.round(seconds / 60) : null,
            road: true,
          });
        },
      );
    } catch {
      drawStraight();
    }

    return () => {
      cancelled = true;
    };
  }, [route, ready]);

  useEffect(() => {
    if (!ready || !selectedId) return;

    const marker = markerRefs.current.get(selectedId);
    if (marker) {
      mapRef.current.panTo(marker.getPosition());
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom(), 11));
    }
  }, [selectedId, ready]);

  if (!API_KEY) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center ${className ?? ""}`}
        style={{ minHeight: Math.min(height, 260) }}
      >
        <p className="font-semibold text-amber-900">Carte Google Maps non configurée</p>
        <p className="mt-2 max-w-md text-sm text-amber-800">
          Ajoutez <code className="rounded bg-amber-100 px-1.5 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> dans{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5">frontend/.env.local</code> puis redémarrez le serveur.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 ${className ?? ""}`} style={{ minHeight: 200 }}>
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl ${className ?? ""}`} style={{ height }} />;
}