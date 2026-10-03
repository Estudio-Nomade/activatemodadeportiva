export type PhotonAddress = {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  province?: string;
  label: string;
  lat?: number;
  lon?: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    locality?: string;
    district?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

type PhotonResponse = { features?: PhotonFeature[] };

function pickCity(p: NonNullable<PhotonFeature["properties"]>): string {
  return (
    p.city ||
    p.town ||
    p.village ||
    p.municipality ||
    p.locality ||
    p.district ||
    p.county ||
    ""
  );
}

function featureToAddress(f: PhotonFeature): PhotonAddress | null {
  const p = f.properties;
  if (!p) return null;

  const street = (p.street || "").trim();
  const number = (p.housenumber || "").trim();
  const named = (p.name || "").trim();
  // street+number preferred; fall back to place name (city/POI)
  const line1 = [street || named, number].filter(Boolean).join(" ").trim();
  const city = pickCity(p).trim();
  const postalCode = (p.postcode || "").trim();
  const province = (p.state || "").trim();

  if (!line1 && !city) return null;

  const parts = [
    line1 || undefined,
    city && city !== line1 ? city : undefined,
    province || undefined,
    postalCode ? `CP ${postalCode}` : undefined,
  ].filter(Boolean);

  const coords = f.geometry?.coordinates;
  return {
    line1: line1 || city,
    city: city || line1,
    postalCode,
    province: province || undefined,
    label: parts.join(", "),
    lon: coords?.[0],
    lat: coords?.[1],
  };
}

function isArgentina(p: NonNullable<PhotonFeature["properties"]>): boolean {
  const cc = (p.countrycode || "").toLowerCase();
  if (cc === "ar") return true;
  if (cc && cc !== "ar") return false;
  const country = (p.country || "").toLowerCase();
  if (!country) return true; // keep ambiguous local hits
  return country.includes("argent");
}

/**
 * Photon (Komoot) free geocoder — no API key.
 * Keep query simple: some multi-token street+city strings return HTTP 400 on public endpoint.
 */
export async function searchPhotonAddresses(
  query: string,
  opts?: { signal?: AbortSignal; limit?: number },
): Promise<PhotonAddress[]> {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 3) return [];

  // Prefer short, stable queries; append Argentina bias as text (not bbox — bbox can 400)
  const searchQ = /argentin/i.test(q) ? q : `${q}, Argentina`;

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", searchQ);
  // Photon public API only supports: default, de, en, fr — NOT es
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", String(opts?.limit ?? 8));
  // Bias toward BA metro without hard filter
  url.searchParams.set("lat", "-34.6037");
  url.searchParams.set("lon", "-58.3816");

  const res = await fetch(url.toString(), {
    signal: opts?.signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "ActivateModaDeportiva/1.0 (e-commerce checkout; contact@local)",
    },
  });

  if (!res.ok) {
    // Retry once without ", Argentina" suffix on 4xx
    if (res.status >= 400 && res.status < 500 && searchQ !== q) {
      const url2 = new URL("https://photon.komoot.io/api/");
      url2.searchParams.set("q", q);
      url2.searchParams.set("lang", "en");
      url2.searchParams.set("limit", String(opts?.limit ?? 8));
      url2.searchParams.set("lat", "-34.6037");
      url2.searchParams.set("lon", "-58.3816");
      const res2 = await fetch(url2.toString(), {
        signal: opts?.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "ActivateModaDeportiva/1.0 (e-commerce checkout; contact@local)",
        },
      });
      if (!res2.ok) throw new Error(`Photon ${res2.status}`);
      return parsePhoton(await res2.json());
    }
    throw new Error(`Photon ${res.status}`);
  }

  return parsePhoton(await res.json());
}

function parsePhoton(data: PhotonResponse): PhotonAddress[] {
  const out: PhotonAddress[] = [];
  const seen = new Set<string>();

  for (const f of data.features ?? []) {
    const p = f.properties;
    if (!p || !isArgentina(p)) continue;
    const addr = featureToAddress(f);
    if (!addr) continue;
    const key = addr.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }

  return out;
}
