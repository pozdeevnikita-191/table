import { Router, type IRouter } from "express";
import healthRouter from "./health";
import employeesRouter from "./employees";
import objectsRouter from "./objects";
import entriesRouter from "./entries";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(employeesRouter);
router.use(objectsRouter);
router.use(entriesRouter);
router.use(statsRouter);

export default router;
