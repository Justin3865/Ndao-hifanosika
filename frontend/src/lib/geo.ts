type Point = {
  lat?: number;
  lng?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance en kilomètres entre deux points GPS (formule de Haversine). */
export function haversineKm(
  a: number | Point,
  b: number | Point,
  c?: number,
  d?: number
): number {
  let lat1: number, lon1: number, lat2: number, lon2: number;

  if (typeof a === "number" && typeof b === "number") {
    lat1 = a;
    lon1 = b;
    lat2 = c as number;
    lon2 = d as number;
  } else {
    const p1 = a as Point;
    const p2 = b as Point;
    lat1 = (p1.lat ?? p1.latitude) as number;
    lon1 = (p1.lng ?? p1.lon ?? p1.longitude) as number;
    lat2 = (p2.lat ?? p2.latitude) as number;
    lon2 = (p2.lng ?? p2.lon ?? p2.longitude) as number;
  }

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/** « 12,4 km » ou « 350 m » */
export function fmtKm(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${(Math.round(km * 10) / 10).toLocaleString("fr-FR")} km`;
}

/** Itinéraire Google Maps (application GPS du téléphone ou navigateur) vers une destination. */
export function directionsUrl(
  to: { latitude: number; longitude: number },
  from?: { latitude: number; longitude: number } | null
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${to.latitude},${to.longitude}`,
    travelmode: "driving",
  });

  if (from) params.set("origin", `${from.latitude},${from.longitude}`);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
