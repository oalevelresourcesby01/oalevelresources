import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import configRouter from "./config";
import announcementsRouter from "./announcements";
import driveRouter from "./drive";
import resourcesRouter from "./resources";
import searchRouter from "./search";
import aiRouter from "./ai";
import knowledgeRouter from "./knowledge";
import foldersRouter from "./folders";
import logsRouter from "./logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(configRouter);
router.use(announcementsRouter);
router.use(driveRouter);
router.use(resourcesRouter);
router.use(searchRouter);
router.use(aiRouter);
router.use(knowledgeRouter);
router.use(foldersRouter);
router.use(logsRouter);

export default router;
