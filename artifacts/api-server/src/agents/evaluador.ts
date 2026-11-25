import { z } from "zod";
import { consultarGemini } from "./gemini.js";
import { rubrica, instruccionesEvaluador } from "./rubrica.js";

const criterioSchema = z.object({
  id: z.string(),
  puntaje: z.number().int().min(0),
  fundamento: z.string().min(1),
  evidencias: z.array(z.string()),
});

const evaluacionSchema = z.object({
  criterios: z.array(criterioSchema).length(5),
  correcciones: z.array(z.object({
    destinatario: z.preprocess(
      (valor) =>
        typeof valor === "string" &&
        ["equipo técnico", "equipo tecnico"].includes(valor.trim().toLowerCase())
          ? "responsable_proyecto"
          : valor,
      z.enum([
      "investigador",
      "planificador",
      "revisor",
      "responsable_proyecto",
    ]),
    ),
    tarea: z.string().min(1),
  })),
});

export type EvidenciaEvaluacion = {
  id: string;
  descripcion: string;
  origen: "herramienta" | "declaracion_usuario";
};

export async function evaluarTrabajo(
  trabajo: unknown,
  evidencias: EvidenciaEvaluacion[],
) {
  const texto = await consultarGemini(
    instruccionesEvaluador + `
Responde exclusivamente un objeto JSON con:
{
  "criterios": [
    {
      "id": "id del criterio",
      "puntaje": 0,
      "fundamento": "justificacion",
      "evidencias": ["id de evidencia suministrada"]
    }
  ],
  "correcciones": [
    {
      "destinatario": "investigador",
      "tarea": "correccion concreta"
    }
  ]
}
Incluye exactamente una entrada por criterio.
Si no hay evidencia para un criterio, asigna cero y pide la evidencia.
No incluyas una nota total: el servidor la calculara.
`,
    JSON.stringify({ rubrica, trabajo, evidencias }),
  );

  const limpio = texto.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const resultado = evaluacionSchema.parse(JSON.parse(limpio));
  const ids = new Set(resultado.criterios.map((c) => c.id));
  const evidenciasValidas = new Set(evidencias.map((e) => e.id));

  if (ids.size !== rubrica.length) {
    throw new Error("El evaluador devolvio criterios repetidos.");
  }

  const criterios = rubrica.map((regla) => {
    const criterio = resultado.criterios.find((c) => c.id === regla.id);

    if (!criterio || criterio.puntaje > regla.maximo) {
      throw new Error("El evaluador devolvio puntajes invalidos.");
    }

    if (criterio.evidencias.some((id) => !evidenciasValidas.has(id))) {
      throw new Error("El evaluador cito evidencia inexistente.");
    }

    if (criterio.puntaje > 0 && criterio.evidencias.length === 0) {
      throw new Error("El evaluador asigno puntos sin evidencia.");
    }

    return { ...criterio, nombre: regla.nombre, maximo: regla.maximo };
  });

  return {
    nota: criterios.reduce((suma, criterio) => suma + criterio.puntaje, 0),
    maximo: 20,
    criterios,
    correcciones: resultado.correcciones,
  };
}

