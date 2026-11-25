import { Router } from "express";
import { z } from "zod";
import { evaluarTrabajo } from "../agents/evaluador.js";
import { obtenerCaso } from "../agents/registro.js";
import { fuentesAgricolas } from "../agents/fuentes.js";

const router = Router();
const entradaSchema = z.object({ ejecucionId: z.string().uuid(), comprobante: z.string().min(1).max(262144) });

router.post("/agents/evaluate", async (req, res): Promise<void> => {
  const entrada = entradaSchema.safeParse(req.body);
  if (!entrada.success) {
    res.status(400).json({ error: "Identificador de ejecucion invalido." });
    return;
  }

  const caso = obtenerCaso(entrada.data.ejecucionId, entrada.data.comprobante);
  if (!caso) {
    res.status(404).json({ error: "Ejecuta el caso nuevamente: no esta guardado o expiro." });
    return;
  }

  if (
    !["aprobado", "cerrado_sin_diagnostico"].includes(caso.estado) ||
    !caso.plan ||
    !caso.revision ||
    caso.revision.decision !== "aprobar"
  ) {
    res.status(409).json({
      estado: "pendiente",
      error: "Evaluacion pendiente: completa la informacion solicitada y resuelve las observaciones de los agentes. Luego consulta nuevamente antes de pedir la nota final.",
      preguntas: caso.preguntas,
    });
    return;
  }

  try {
    const evidencias = [
      ...caso.eventos.map((e) => ({
        id: e.id,
        descripcion: JSON.stringify(e),
        origen: "herramienta" as const,
      })),
      ...fuentesAgricolas.map((f) => ({
        id: f.id,
        descripcion: JSON.stringify(f),
        origen: "herramienta" as const,
      })),
    ];

    const evaluacion = await evaluarTrabajo({
      caso,
      alcance: "Prueba local. Los resultados recibidos pueden ser simulados. Los registros demuestran ejecucion, no exactitud del diagnostico. No se aportan pruebas del despliegue publico ni del repositorio: no darlos por verificados.",
    }, evidencias);

    res.json({ ejecucionId: caso.ejecucionId, ...evaluacion });
  } catch (error) {
    req.log.error({ err: error }, "Error del evaluador");
    res.status(502).json({
      error: error instanceof Error ? error.message : "Fallo la evaluacion.",
    });
  }
});

export default router;



