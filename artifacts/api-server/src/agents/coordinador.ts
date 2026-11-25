import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  investigarCaso,
  resultadoPlantaSchema,
} from "./investigador.js";
import {
  planificarCuidados,
  type FuenteAgricola,
} from "./planificador.js";
import { revisarCaso } from "./revisor.js";

type ResultadoPlanta = z.infer<typeof resultadoPlantaSchema>;

type Evento = {
  id: string;
  agente: string;
  accion: string;
  fecha: string;
  resultado: unknown;
};

export async function coordinarCaso(
  resultados: ResultadoPlanta[],
  contexto: string,
  fuentes: FuenteAgricola[],
) {
  const ejecucionId = randomUUID();
  const eventos: Evento[] = [];

  function registrar(
    agente: string,
    accion: string,
    resultado: unknown,
  ) {
    eventos.push({
      id: ejecucionId + "-" + (eventos.length + 1),
      agente,
      accion,
      fecha: new Date().toISOString(),
      resultado,
    });
  }

  let investigacion = await investigarCaso(resultados, contexto);
  registrar("investigador", "interpretar", investigacion);



  let plan = await planificarCuidados(investigacion, fuentes, contexto);
  registrar("planificador", "planificar", plan);

  let revision = await revisarCaso(investigacion, plan, fuentes, contexto);
  registrar("revisor", "revisar", revision);

  for (let ronda = 1; ronda <= 2 && revision.decision === "corregir"; ronda++) {
    const tareasInvestigador = revision.correcciones
      .filter((c) => c.destinatario === "investigador")
      .map((c) => c.tarea)
      .join("\n");

    const tareasPlanificador = revision.correcciones
      .filter((c) => c.destinatario === "planificador")
      .map((c) => c.tarea)
      .join("\n");

    if (tareasInvestigador) {
      investigacion = await investigarCaso(
        resultados, contexto, tareasInvestigador,
      );
      registrar("investigador", "corregir_ronda_" + ronda, investigacion);


    }

    plan = await planificarCuidados(
      investigacion, fuentes, contexto, tareasPlanificador,
    );
    registrar("planificador", "corregir_ronda_" + ronda, plan);

    revision = await revisarCaso(investigacion, plan, fuentes, contexto);
    registrar("revisor", "revisar_ronda_" + ronda, revision);
  }

  const cierreSinDiagnostico =
    investigacion.decision === "concluir_sin_diagnostico" &&
    plan.decision === "concluir_sin_diagnostico" &&
    revision.decision === "aprobar";

  const estado = cierreSinDiagnostico
    ? "cerrado_sin_diagnostico"
    : (
    investigacion.decision === "pedir_informacion" ||
    plan.decision === "pedir_informacion"
  )
    ? "pedir_informacion"
    : plan.decision === "faltan_fuentes"
      ? "faltan_fuentes"
      : revision.decision === "aprobar"
    ? "aprobado"
    : revision.decision === "corregir"
      ? "requiere_revision"
      : revision.decision;

  return {
    ejecucionId,
    estado,
    preguntas: cierreSinDiagnostico ? [] : [...new Set([
      ...investigacion.preguntas,
      ...plan.preguntas,
      ...revision.preguntas,
    ])],
    investigacion,
    plan,
    revision,
    eventos,
  };
}


