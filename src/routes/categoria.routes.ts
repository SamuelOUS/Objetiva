import { Router } from "express";

import { 
    
    crearCategoriaController,
     obtenerCategoriasController, 
     obtenerCategoriaPorIdController,
     actualizarCategoriaController

    } from "../controllers/categoria.controller.js";

const router = Router();

router.get("/", obtenerCategoriasController);
router.get("/:id", obtenerCategoriaPorIdController);
router.post("/", crearCategoriaController);
router.put("/:id", actualizarCategoriaController);


export default router;