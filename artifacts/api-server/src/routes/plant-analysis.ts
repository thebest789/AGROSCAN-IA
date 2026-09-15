import { Router, type IRouter } from "express";
import {
  AnalyzePlantBody,
  AnalyzePlantResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PLANTNET_ENDPOINT =
  "https://my-api.plantnet.org/v2/diseases/identify";

type PlantNetImage = {
  url?: string;
  organ?: string;
  author?: string;
  license_name?: string;
  license?: string;
};

type PlantNetDisease = {
  scientific_name?: string;
  common_names?: string[];
  eppo_code?: string;
  eppoCode?: string;
};

type PlantNetResult = {
  score?: number;
  disease?: PlantNetDisease;
  images?: PlantNetImage[];
};

function decodeDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,([\s\S]+)$/i);
  if (!match) {
    return null;
  }

  try {
    return {
      mimeType: match[1].toLowerCase(),
      bytes: Buffer.from(match[2], "base64"),
    };
  } catch {
    return null;
  }
}

function getDisplayName(disease: PlantNetDisease | undefined): string {
  return disease?.common_names?.[0] ?? disease?.scientific_name ?? "Resultado sin nombre";
}

function normalizeResults(payload: unknown) {
  const results = Array.isArray(payload) ? payload : [];
  return results.slice(0, 5).map((item: PlantNetResult) => {
    const image = item.images?.[0];
    const score = typeof item.score === "number" ? item.score : 0;
    return {
      name: getDisplayName(item.disease),
      eppoCode: item.disease?.eppo_code ?? item.disease?.eppoCode ?? null,
      matchPercentage: Math.round(score * 1000) / 10,
      imageUrl: image?.url ?? null,
      imageAuthor: image?.author ?? null,
      imageLicense: image?.license_name ?? image?.license ?? null,
    };
  });
}

router.post("/plant-analysis", async (req, res): Promise<void> => {
  const parsed = AnalyzePlantBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid plant analysis input");
    res.status(400).json({ error: "Selecciona una imagen JPG o PNG para analizar." });
    return;
  }

  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    req.log.error("PLANTNET_API_KEY is not configured");
    res.status(503).json({
      error: "La conexión con Pl@ntNet aún no está configurada. Añade PLANTNET_API_KEY en los secretos del proyecto.",
    });
    return;
  }

  const decoded = decodeDataUrl(parsed.data.imageData);
  if (!decoded || decoded.bytes.length === 0) {
    res.status(400).json({ error: "La imagen no tiene un formato válido." });
    return;
  }

  const formData = new FormData();
  const imageBuffer = new ArrayBuffer(decoded.bytes.byteLength);
  new Uint8Array(imageBuffer).set(decoded.bytes);
  formData.append(
    "images",
    new Blob([imageBuffer], { type: decoded.mimeType }),
    parsed.data.fileName ?? "plant-image",
  );
  formData.append("organs", parsed.data.organ ?? "auto");

  const url = new URL(PLANTNET_ENDPOINT);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("lang", "es");
  url.searchParams.set("include-related-images", "true");
  url.searchParams.set("nb-results", "5");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const responseText = await response.text();
      req.log.error(
        { status: response.status, responseText: responseText.slice(0, 300) },
        "Pl@ntNet request failed",
      );
      res.status(502).json({
        error: "No se pudo completar el análisis con Pl@ntNet. Inténtalo de nuevo.",
      });
      return;
    }

    const payload: unknown = await response.json();
    const normalized = normalizeResults(payload);
    res.json(AnalyzePlantResponse.parse(normalized));
  } catch (error) {
    req.log.error({ err: error }, "Pl@ntNet request error");
    res.status(502).json({
      error: "No se pudo conectar con Pl@ntNet. Revisa tu conexión e inténtalo de nuevo.",
    });
  }
});

export default router;