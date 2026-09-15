import { Router, type IRouter } from "express";
import healthRouter from "./health";
import plantAnalysisRouter from "./plant-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plantAnalysisRouter);

export default router;
