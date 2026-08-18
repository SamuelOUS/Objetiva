import { Router } from "express";

import { 

    crearCategoriaController,
     obtenerCategoriasController, 
     obtenerCategoriaPorIdController,
     actualizarCategoriaController,
     eliminarCategoriaController,
     consultarCategoriasQueryController

    } 
    
from "../controllers/categoria.controller.js";

const router = Router();

router.get("/", obtenerCategoriasController);
router.get("/:id", obtenerCategoriaPorIdController);
router.post("/", crearCategoriaController);
router.put("/:id", actualizarCategoriaController);
router.delete("/:id", eliminarCategoriaController);
(router.query as any)("/", consultarCategoriasQueryController);

export default router;