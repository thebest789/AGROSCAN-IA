import { Router } from "express";
import { consultarGemini } from "../agents/gemini.js";

const router = Router();

router.post("/agents/check", async (req, res): Promise<void> => {
  try {
    const respuesta = await consultarGemini(
      "Eres un asistente de AgroScan IA. Responde en español y de forma breve.",
      "Confirma que la conexión del servidor con Gemini funciona.",
    );

    res.json({ ok: true, respuesta });
  } catch (error) {
    req.log.error({ err: error }, "Error de conexion con Gemini");
    res.status(502).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : "No se pudo conectar con Gemini.",
    });
  }
});

router.get("/agents/status", (_req, res) => {
  const caracteres = process.env.AGENTS_SIGNING_KEY?.trim().length ?? 0;

  res.set("Cache-Control", "no-store");
  res.json({
    entorno: process.env.VERCEL_ENV ?? "local",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    firmaCaracteres: caracteres,
    firmaConfigurada: caracteres >= 32,
  });
});

export default router;

