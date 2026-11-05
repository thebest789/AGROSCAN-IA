import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import plantAnalysisRouter from "./plant-analysis.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plantAnalysisRouter);

export default router;