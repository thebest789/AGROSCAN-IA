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

export default router;
