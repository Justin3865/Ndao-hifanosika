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

function loadGoogleMaps(): Promise<void> {
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

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  radius?: number;
  /** Texte brut affiché dans la bulle d'information */
  info?: string;
}

interface Props {
  markers: MapMarker[];
  height?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

// Madagascar
const DEFAULT_CENTER = { lat: -19.0, lng: 46.9 };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

export function GoogleMap({ markers, height = 420, selectedId, onSelect, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // Création de la carte
  useEffect(() => {
    if (!API_KEY) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "water", stylers: [{ color: "#bfdbfe" }] },
          ],
        });

        infoRef.current = new window.google.maps.InfoWindow();
        setReady(true);
      })
      .catch((err) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, []);

  // Synchronisation des marqueurs
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const google = window.google;
    const existing = markerRefs.current;
    const seen = new Set<string>();

    markers.forEach((item) => {
      seen.add(item.id);

      const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: item.radius ?? 9,
        fillColor: item.color,
        fillOpacity: 0.85,
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
          const html = `<div style="font-family:system-ui;max-width:220px"><strong>${escapeHtml(item.title)}</strong>${
            item.info ? `<div style="margin-top:4px;color:#4b5563;font-size:12px">${escapeHtml(item.info)}</div>` : ""
          }</div>`;
          infoRef.current.setContent(html);
          infoRef.current.open({ map: mapRef.current, anchor: marker });
          onSelect?.(item.id);
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

    // Cadrage automatique une seule fois
    if (!fittedRef.current && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.latitude, lng: m.longitude }));
      mapRef.current.fitBounds(bounds, 60);

      if (markers.length === 1) mapRef.current.setZoom(9);
      fittedRef.current = true;
    }
  }, [markers, ready, onSelect]);

  // Centrage sur l'élément sélectionné
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
        style={{ minHeight: height }}
      >
        <p className="font-semibold text-amber-900">Carte Google Maps non configurée</p>
        <p className="mt-2 max-w-md text-sm text-amber-800">
          Ajoutez <code className="rounded bg-amber-100 px-1.5 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          dans <code className="rounded bg-amber-100 px-1.5 py-0.5">frontend/.env.local</code> puis redémarrez
          le serveur.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 ${className ?? ""}`}
        style={{ minHeight: height }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{ height }}
    />
  );
}
