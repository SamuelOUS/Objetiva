import { Router } from "express";
import { crearTareaController } from "../controllers/tarea.controller.js";

const router = Router();

router.post("/", crearTareaController);

export default router;