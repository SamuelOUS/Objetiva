import { Router } from "express";

import { 
    
    crearTareaController,
    obtenerTareasController,
    obtenerTareaPorIdController,
    actualizarTareaController,
    eliminarTareaController
} 

from "../controllers/tarea.controller.js";

const router = Router();

router.post("/", crearTareaController);
router.get("/", obtenerTareasController);
router.get("/:id", obtenerTareaPorIdController);
router.put("/:id", actualizarTareaController);
router.delete("/:id", eliminarTareaController);

export default router;