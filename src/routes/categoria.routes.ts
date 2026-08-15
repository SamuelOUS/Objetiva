import { Router } from "express";
import { crearCategoriaController, obtenerCategoriasController } from "../controllers/categoria.controller.js";

const router = Router();

router.post("/", crearCategoriaController);
router.get("/", obtenerCategoriasController);


export default router;