import { guardarCaso } from "../agents/registro.js";
import { Router } from "express";
import { z } from "zod";
import { coordinarCaso } from "../agents/coordinador.js";
import { resultadoPlantaSchema } from "../agents/investigador.js";
import { fuentesAgricolas } from "../agents/fuentes.js";

const router = Router();

const entradaSchema = z.object({
  resultados: z.array(resultadoPlantaSchema).min(1).max(5),
  contexto: z.string().trim().min(10).max(4000),
});

router.post("/agents/case", async (req, res): Promise<void> => {
  const entrada = entradaSchema.safeParse(req.body);

  if (!entrada.success) {
    res.status(400).json({
      error: "Envia resultados y una descripcion del contexto de la planta.",
    });
    return;
  }

  try {
    const resultado = await coordinarCaso(
      entrada.data.resultados,
      entrada.data.contexto,
      fuentesAgricolas,
    );

    const comprobante = guardarCaso(resultado);
    res.json({
      ...resultado,
      comprobante,
      procedencia:
        "Resultados recibidos del cliente; esta ruta no repite la consulta a PlantNet.",
      fuentes: fuentesAgricolas.map(({ id, titulo, url }) => ({
        id, titulo, url,
      })),
    });
  } catch (error) {
    req.log.error({ err: error }, "Error en coordinacion de agentes");
    res.status(502).json({
      error: error instanceof Error
        ? error.message
        : "No se pudo completar el trabajo de los agentes.",
    });
  }
});

export default router;


