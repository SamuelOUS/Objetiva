import {Router} from "express";

import {
    
    crearObjetivoController,
    obtenerObjetivosController,
    obtenerObjetivoPorIdController,
    actualizarObjetivoController,
    eliminarObjetivoController,
    consultarObjetivosQueryController

} 

from "../controllers/objetivo.controller.js";


const router = Router();

router.post("/", crearObjetivoController);
router.get("/", obtenerObjetivosController);
router.get("/:id", obtenerObjetivoPorIdController);
router.put("/:id", actualizarObjetivoController);
router.delete("/:id", eliminarObjetivoController);
(router.query as any)("/", consultarObjetivosQueryController);

export default router;