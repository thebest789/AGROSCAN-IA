import evaluacionRouter from "./evaluacion.js";
import multiagentesRouter from "./multiagentes.js";
import agentsRouter from "./agents.js";
import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import plantAnalysisRouter from "./plant-analysis.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plantAnalysisRouter);

router.use(agentsRouter);

router.use(multiagentesRouter);

router.use(evaluacionRouter);
export default router;


