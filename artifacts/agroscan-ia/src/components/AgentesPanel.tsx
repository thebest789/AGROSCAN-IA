import { useState } from "react";
import type { PlantAnalysisResult } from "@workspace/api-client-react";

type Caso = {
  ejecucionId: string;
  comprobante: string;
  estado: string;
  preguntas: string[];
  investigacion: { resumen: string };
  plan: {
    resumen: string;
    cuidados: Array<{
      accion: string;
      fundamento: string;
      fuentes: string[];
    }>;
  } | null;
  revision: { resumen: string } | null;
  eventos: Array<{ id: string; agente: string; accion: string }>;
  fuentes: Array<{ id: string; titulo: string; url: string }>;
};

type Evaluacion = {
  nota: number;
  maximo: number;
  criterios: Array<{
    id: string;
    nombre: string;
    puntaje: number;
    maximo: number;
    fundamento: string;
  }>;
  correcciones: Array<{ destinatario: string; tarea: string }>;
};

async function solicitar<T>(ruta: string, datos: unknown): Promise<T> {
  const respuesta = await fetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const contenido = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(contenido.error ?? "No se pudo completar la solicitud.");
  }
  return contenido as T;
}

export default function AgentesPanel({
  resultados,
}: {
  resultados: PlantAnalysisResult[];
}) {
  const [contexto, setContexto] = useState("");
  const [caso, setCaso] = useState<Caso | null>(null);
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");

  async function ejecutar() {
    setOcupado("Los agentes estan revisando el caso...");
    setError("");
    setCaso(null);
    setEvaluacion(null);
    try {
      const datos = await solicitar<Caso>("/api/agents/case", {
        resultados,
        contexto,
      });
      setCaso(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fallo el analisis.");
    } finally {
      setOcupado("");
    }
  }

  async function evaluar() {
    if (!caso) return;
    setOcupado("El evaluador esta revisando las evidencias...");
    setError("");
    setEvaluacion(null);
    try {
      setEvaluacion(await solicitar<Evaluacion>("/api/agents/evaluate", {
        ejecucionId: caso.ejecucionId,
        comprobante: caso.comprobante,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fallo la evaluacion.");
    } finally {
      setOcupado("");
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-sage p-5">
      <h3 className="font-display text-2xl">Asistencia multiagente</h3>
      <label className="block text-sm">
        Describe la planta, sintomas, riego y lugar donde se encuentra.
        <textarea
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          maxLength={4000}
          disabled={Boolean(ocupado)}
          className="mt-2 block w-full rounded-lg border p-3 text-forest"
          rows={4}
        />
      </label>
      <button
        type="button"
        disabled={Boolean(ocupado) || contexto.trim().length < 10}
        onClick={ejecutar}
        className="rounded-lg bg-leaf px-4 py-3 text-cream disabled:opacity-50"
      >
        <span>Consultar agentes</span>
      </button>
      {ocupado && <p role="status">{ocupado}</p>}
      {error && <p role="alert" className="text-terracotta">{error}</p>}
      {caso && (
        <div className="space-y-4">
          <p><strong>Estado:</strong> {caso.estado}</p>
          <p><strong>Investigador:</strong> {caso.investigacion.resumen}</p>
          {caso.plan && (
            <div>
              <p><strong>Planificador:</strong> {caso.plan.resumen}</p>
              <ul className="list-disc space-y-2 pl-5">
                {caso.plan.cuidados.map((c, i) => (
                  <li key={i}>
                    <strong>{c.accion}</strong>
                    <p>{c.fundamento}</p>
                    <small>Fuentes: {c.fuentes.join(", ")}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {caso.revision && (
            <p><strong>Revisor:</strong> {caso.revision.resumen}</p>
          )}
          {caso.preguntas.length > 0 && (
            <div>
              <strong>Preguntas para completar el caso</strong>
              <ul className="list-disc pl-5">
                {caso.preguntas.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <p>Agrega tus respuestas a la descripcion y consulta nuevamente.</p>
            </div>
          )}
          <details>
            <summary>Registro de colaboracion</summary>
            <ul>
              {caso.eventos.map((e) => (
                <li key={e.id}>{e.agente}: {e.accion}</li>
              ))}
            </ul>
          </details>
          <details>
            <summary>Fuentes documentales</summary>
            {caso.fuentes.map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                className="block underline">
                {f.id}: {f.titulo}
              </a>
            ))}
          </details>
          <button type="button" onClick={evaluar}
            disabled={Boolean(ocupado)}
            className="rounded-lg border px-4 py-3 disabled:opacity-50">
            <span>Evaluar caso y proyecto</span>
          </button>
        </div>
      )}
      {evaluacion && (
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">
            Evaluacion automatizada: {evaluacion.nota}/{evaluacion.maximo}
          </h3>
          {evaluacion.criterios.map((c) => (
            <div key={c.id}>
              <strong>{c.nombre}: {c.puntaje}/{c.maximo}</strong>
              <p>{c.fundamento}</p>
            </div>
          ))}
          {evaluacion.correcciones.map((c, i) => (
            <p key={i}><strong>Pendiente ({c.destinatario}):</strong> {c.tarea}</p>
          ))}
          <p className="text-sm">
            La nota depende de las evidencias disponibles y no confirma
            la exactitud del diagnostico.
          </p>
        </div>
      )}
    </section>
  );
}

