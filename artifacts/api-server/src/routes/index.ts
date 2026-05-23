import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import objectsRouter from "./objects";
import entriesRouter from "./entries";
import statsRouter from "./stats";
import scheduleRouter from "./schedule";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employeesRouter);
router.use(objectsRouter);
router.use(entriesRouter);
router.use(statsRouter);
router.use(scheduleRouter);

export default router;
