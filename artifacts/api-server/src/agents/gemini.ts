type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function consultarGemini(
  instrucciones: string,
  mensaje: string,
): Promise<string> {
  const clave = process.env.GEMINI_API_KEY;
  const modelo = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

  if (!clave) {
    throw new Error("Falta configurar GEMINI_API_KEY.");
  }

  const agente =
    instrucciones.match(/agente\s+([a-z]+)/i)?.[1] ?? "conexion";

  const inicio = Date.now();
  console.info("[Gemini] Iniciando: " + agente);

  try {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": clave,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: instrucciones }],
          },
          contents: [{
            role: "user",
            parts: [{ text: mensaje }],
          }],
          generationConfig: {
            maxOutputTokens: 1500,
          },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );

    if (!respuesta.ok) {
      throw new Error("Gemini respondio con estado " + respuesta.status);
    }

    const datos = await respuesta.json() as GeminiResponse;
    const texto = datos.candidates?.[0]?.content?.parts
      ?.map((parte) => parte.text ?? "")
      .join("")
      .trim();

    if (!texto) {
      throw new Error("Gemini no devolvio texto.");
    }

    console.info(
      "[Gemini] Terminado: " + agente +
      " en " + Math.round((Date.now() - inicio) / 1000) + " segundos",
    );

    return texto;
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "Error desconocido";
    throw new Error("Fallo en " + agente + ": " + detalle);
  }
}
