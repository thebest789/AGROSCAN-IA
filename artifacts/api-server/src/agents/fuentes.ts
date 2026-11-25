import type { FuenteAgricola } from "./planificador.js";

export const fuentesAgricolas: FuenteAgricola[] = [
  {
    id: "UC_IPM_INTERIOR",
    titulo: "University of California IPM: Houseplant Problems",
    url: "https://ipm.ucanr.edu/home-and-landscape/houseplant-problems/",
    contenido:
      "Resumen documental en español. Alcance: plantas de interior. " +
      "La mala salud puede estar relacionada con riego inadecuado, " +
      "fertilizacion, enfermedades radiculares, poca luz u otras " +
      "condiciones ambientales. Revisar regularmente signos de plagas " +
      "y daños. El amarillamiento y marchitamiento pueden tener varias " +
      "causas; estos sintomas por si solos no confirman una enfermedad. " +
      "Conocer los requisitos de cultivo de la especie antes de " +
      "proponer cambios. Esta fuente no confirma las enfermedades " +
      "sugeridas por PlantNet para un caso concreto.",
  },
  {
    id: "UW_CUIDADOS_INTERIOR",
    titulo: "University of Wisconsin Extension: Houseplant Care",
    url: "https://hort.extension.wisc.edu/articles/houseplant-care/",
    contenido:
      "Resumen documental en español. Alcance: plantas de interior " +
      "en maceta. Las necesidades de agua dependen de la especie, " +
      "las condiciones de cultivo y su etapa de crecimiento. " +
      "Comprobar la humedad del sustrato y las necesidades de la " +
      "especie antes de regar; no establecer una frecuencia universal. " +
      "Comprobar que la maceta tenga buen drenaje. Retirar el agua " +
      "sobrante del plato, salvo especies que requieran condiciones " +
      "diferentes. El exceso de agua puede dañar las raices. " +
      "Ajustar la ubicacion a las necesidades de luz y temperatura " +
      "de la especie. Esta fuente ofrece cuidados generales, no " +
      "tratamientos especificos para virus, hongos o plagas.",
  },
];
