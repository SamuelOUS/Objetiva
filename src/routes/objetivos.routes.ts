import {Router} from "express";

import {
    
    crearObjetivoController,
    obtenerObjetivosController,
    obtenerObjetivoPorIdController,
    actualizarObjetivoController

} 

from "../controllers/objetivo.controller.js";


const router = Router();

router.post("/", crearObjetivoController);
router.get("/", obtenerObjetivosController);
router.get("/:id", obtenerObjetivoPorIdController);
router.put("/:id", actualizarObjetivoController);


export default router;