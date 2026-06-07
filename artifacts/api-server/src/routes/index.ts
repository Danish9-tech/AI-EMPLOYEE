import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assistantsRouter from "./assistants";
import knowledgeRouter from "./knowledge";
import chatRouter from "./chat";
import leadsRouter from "./leads";
import appointmentsRouter from "./appointments";
import dashboardRouter from "./dashboard";
import subscriptionRouter from "./subscription";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assistantsRouter);
router.use(knowledgeRouter);
router.use(chatRouter);
router.use(leadsRouter);
router.use(appointmentsRouter);
router.use(dashboardRouter);
router.use(subscriptionRouter);
router.use(whatsappRouter);

export default router;
