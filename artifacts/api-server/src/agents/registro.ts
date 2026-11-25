import { createHmac, timingSafeEqual } from "node:crypto";
import type { coordinarCaso } from "./coordinador.js";

type Caso = Awaited<ReturnType<typeof coordinarCaso>>;

type ComprobanteCaso = {
  version: 1;
  emitidoEn: number;
  venceEn: number;
  caso: Caso;
};

const DURACION = 15 * 60 * 1000;
const MAXIMO = 262144;

function claveFirma(): string {
  const clave = process.env.AGENTS_SIGNING_KEY?.trim();

  if (!clave || clave.length < 32) {
    throw new Error(
      "Falta configurar AGENTS_SIGNING_KEY con al menos 32 caracteres.",
    );
  }

  return clave;
}

function firmar(contenido: string): Buffer {
  return createHmac("sha256", claveFirma())
    .update("agroscan-caso-v1.")
    .update(contenido)
    .digest();
}

export function guardarCaso(caso: Caso): string {
  const ahora = Date.now();

  const datos: ComprobanteCaso = {
    version: 1,
    emitidoEn: ahora,
    venceEn: ahora + DURACION,
    caso,
  };

  const contenido = Buffer.from(
    JSON.stringify(datos),
    "utf8",
  ).toString("base64url");

  const firma = firmar(contenido).toString("base64url");
  const comprobante = contenido + "." + firma;

  if (comprobante.length > MAXIMO) {
    throw new Error("El caso supera el tamaño permitido.");
  }

  return comprobante;
}

export function obtenerCaso(
  id: string,
  comprobante: string,
): Caso | undefined {
  try {
    if (!comprobante || comprobante.length > MAXIMO) {
      return undefined;
    }

    const partes = comprobante.split(".");
    if (partes.length !== 2) return undefined;

    const [contenido, firmaTexto] = partes;

    if (
      !/^[A-Za-z0-9_-]+$/.test(contenido) ||
      !/^[A-Za-z0-9_-]{43}$/.test(firmaTexto)
    ) {
      return undefined;
    }

    const firmaRecibida = Buffer.from(firmaTexto, "base64url");
    const firmaEsperada = firmar(contenido);

    if (
      firmaRecibida.length !== firmaEsperada.length ||
      !timingSafeEqual(firmaRecibida, firmaEsperada)
    ) {
      return undefined;
    }

    const datos = JSON.parse(
      Buffer.from(contenido, "base64url").toString("utf8"),
    ) as ComprobanteCaso;

    const ahora = Date.now();

    if (
      datos.version !== 1 ||
      !Number.isSafeInteger(datos.emitidoEn) ||
      !Number.isSafeInteger(datos.venceEn) ||
      datos.venceEn !== datos.emitidoEn + DURACION ||
      datos.emitidoEn > ahora + 30000 ||
      datos.venceEn <= ahora ||
      datos.caso?.ejecucionId !== id
    ) {
      return undefined;
    }

    return datos.caso;
  } catch {
    return undefined;
  }
}
