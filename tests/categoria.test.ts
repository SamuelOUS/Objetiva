import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { queryRequest } from "./helpers/queryRequest.js";
import * as categoriaService from "../src/services/categoria.service.js";

/*-------------------------------------------------------------------------------------- */

describe("POST /categorias", () => {

  /*-------------------------------------------------------------------------------------- */

  it("debería crear una categoría correctamente", async () => {
    const response = await request(app)
      .post("/categorias")
      .send({
        nombre: "Categoría de prueba",
        descripcion: "Categoría creada mediante test",
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("id");
    expect(response.body.nombre).toBe("Categoría de prueba");
    expect(response.body.descripcion).toBe(
      "Categoría creada mediante test"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si no se proporciona el nombre", async () => {
    const response = await request(app)
      .post("/categorias")
      .send({
        descripcion: "Categoría sin nombre",
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el nombre no es texto", async () => {
    const response = await request(app)
      .post("/categorias")
      .send({
        nombre: 123,
        descripcion: "Nombre inválido",
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El nombre es obligatorio"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 500 si ocurre un error interno", async () => {
    const spy = vi
      .spyOn(categoriaService, "crearCategoria")
      .mockRejectedValue(new Error("Error de prueba"));

    const response = await request(app)
      .post("/categorias")
      .send({
        nombre: "Categoría error",
        descripcion: "Prueba de error interno",
      });

    expect(response.status).toBe(500);

    expect(response.body.error).toBe(
      "Error interno del servidor"
    );

    spy.mockRestore();
  });
});

/*-------------------------------------------------------------------------------------- */

describe("GET /categorias", () => {

  /*-------------------------------------------------------------------------------------- */

  it("debería obtener todas las categorías", async () => {
    const response = await request(app)
      .get("/categorias");

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 500 si ocurre un error interno", async () => {
    const spy = vi
      .spyOn(categoriaService, "obtenerCategorias")
      .mockRejectedValue(new Error("Error de prueba"));

    const response = await request(app)
      .get("/categorias");

    expect(response.status).toBe(500);

    expect(response.body.error).toBe(
      "Error interno del servidor"
    );

    spy.mockRestore();
  });
});

/*-------------------------------------------------------------------------------------- */

describe("GET /categorias/:id", () => {

  /*-------------------------------------------------------------------------------------- */

  it("debería obtener una categoría por ID", async () => {
    const categoria = await request(app)
      .post("/categorias")
      .send({
        nombre: "Categoría para buscar",
        descripcion: "Prueba de GET por ID",
      });

    expect(categoria.status).toBe(201);

    const id = categoria.body.id;

    const response = await request(app)
      .get(`/categorias/${id}`);

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(id);
    expect(response.body.nombre).toBe("Categoría para buscar");
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 404 si la categoría no existe", async () => {
    const response = await request(app)
      .get("/categorias/999999");

    expect(response.status).toBe(404);

    expect(response.body).toHaveProperty("error");
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {
    const response = await request(app)
      .get("/categorias/abc");

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un número entero positivo"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID es negativo", async () => {
    const response = await request(app)
      .get("/categorias/-1");

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un número entero positivo"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 500 si ocurre un error interno", async () => {
    const spy = vi
      .spyOn(categoriaService, "obtenerCategoriaPorId")
      .mockRejectedValue(new Error("Error de prueba"));

    const response = await request(app)
      .get("/categorias/1");

    expect(response.status).toBe(500);

    expect(response.body.error).toBe(
      "Error interno del servidor"
    );

    spy.mockRestore();
  });
});

/*-------------------------------------------------------------------------------------- */

describe("PUT /categorias/:id", () => {

  /*-------------------------------------------------------------------------------------- */

  it("debería actualizar una categoría correctamente", async () => {
    const categoria = await request(app)
      .post("/categorias")
      .send({
        nombre: "Categoría original",
        descripcion: "Descripción original",
      });

    expect(categoria.status).toBe(201);

    const id = categoria.body.id;

    const response = await request(app)
      .put(`/categorias/${id}`)
      .send({
        nombre: "Categoría actualizada",
        descripcion: "Descripción actualizada",
      });

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(id);
    expect(response.body.nombre).toBe("Categoría actualizada");
    expect(response.body.descripcion).toBe(
      "Descripción actualizada"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 404 si la categoría no existe", async () => {
    const response = await request(app)
      .put("/categorias/999999")
      .send({
        nombre: "Categoría actualizada",
        descripcion: "Descripción actualizada",
      });

    expect(response.status).toBe(404);

    expect(response.body).toHaveProperty("error");
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {
    const response = await request(app)
      .put("/categorias/abc")
      .send({
        nombre: "Categoría actualizada",
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un número entero positivo"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el nombre no es texto", async () => {
    const response = await request(app)
      .put("/categorias/1")
      .send({
        nombre: 123,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El nombre debe ser un texto"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la descripción no es texto", async () => {
    const response = await request(app)
      .put("/categorias/1")
      .send({
        descripcion: 123,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "La descripción debe ser un texto"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 500 si ocurre un error interno", async () => {
    const spy = vi
      .spyOn(categoriaService, "actualizarCategoria")
      .mockRejectedValue(new Error("Error de prueba"));

    const response = await request(app)
      .put("/categorias/1")
      .send({
        nombre: "Categoría actualizada",
      });

    expect(response.status).toBe(500);

    expect(response.body.error).toBe(
      "Error interno del servidor"
    );

    spy.mockRestore();
  });
});

/*-------------------------------------------------------------------------------------- */

describe("DELETE /categorias/:id", () => {

  /*-------------------------------------------------------------------------------------- */

  it("debería eliminar una categoría correctamente", async () => {
    const categoria = await request(app)
      .post("/categorias")
      .send({
        nombre: "Categoría para eliminar",
        descripcion: "Se eliminará en el test",
      });

    expect(categoria.status).toBe(201);

    const id = categoria.body.id;

    const response = await request(app)
      .delete(`/categorias/${id}`);

    expect(response.status).toBe(204);
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 409 si la categoría tiene objetivos asociados", async () => {
    const categoria = await request(app)
      .post("/categorias")
      .send({
        nombre: "Categoría con objetivo",
        descripcion: "No se puede eliminar",
      });

    expect(categoria.status).toBe(201);

    const categoriaId = categoria.body.id;

    const objetivo = await request(app)
      .post("/objetivos")
      .send({
        titulo: "Objetivo asociado",
        descripcion: "Objetivo para probar la relación",
        fechaInicio: "2026-08-18",
        fechaFin: "2026-09-30",
        categoriaId,
      });

    expect(objetivo.status).toBe(201);

    const response = await request(app)
      .delete(`/categorias/${categoriaId}`);

    expect(response.status).toBe(409);

    expect(response.body).toHaveProperty("error");
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {
    const response = await request(app)
      .delete("/categorias/abc");

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un número entero positivo"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 404 si la categoría no existe", async () => {
    const response = await request(app)
      .delete("/categorias/999999");

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      "Categoría no encontrada"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 500 si ocurre un error interno", async () => {
    const spy = vi
      .spyOn(categoriaService, "eliminarCategoria")
      .mockRejectedValue(new Error("Error de prueba"));

    const response = await request(app)
      .delete("/categorias/1");

    expect(response.status).toBe(500);

    expect(response.body.error).toBe(
      "Error interno del servidor"
    );

    spy.mockRestore();
  });
});

/*-------------------------------------------------------------------------------------- */

describe("QUERY /categorias", () => {

  /*-------------------------------------------------------------------------------------- */

  it("debería consultar todas las categorías", async () => {
    const response = await queryRequest(app, "/categorias");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería consultar categorías filtrando por nombre", async () => {
    await request(app)
      .post("/categorias")
      .send({
        nombre: "Tecnología",
        descripcion: "Categoría de tecnología",
      });

    await request(app)
      .post("/categorias")
      .send({
        nombre: "Deportes",
        descripcion: "Categoría de deportes",
      });

    const response = await queryRequest(app, "/categorias", {
      nombre: "tecno",
    });

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (categoria: any) => categoria.nombre === "Tecnología"
      )
    ).toBe(true);

    expect(
      response.body.some(
        (categoria: any) => categoria.nombre === "Deportes"
      )
    ).toBe(false);
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si nombre no es texto", async () => {
    const response = await queryRequest(
      app,
      "/categorias",
      {
        nombre: 123,
      }
    );

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El nombre debe ser un texto"
    );
  });

  /*-------------------------------------------------------------------------------------- */

  it("debería devolver 500 si ocurre un error interno", async () => {
    const spy = vi
      .spyOn(categoriaService, "consultarCategoriasQuery")
      .mockRejectedValue(new Error("Error de prueba"));

    const response = await queryRequest(
      app,
      "/categorias",
      {
        nombre: "prueba",
      }
    );

    expect(response.status).toBe(500);

    expect(response.body.error).toBe(
      "Error interno del servidor"
    );

    spy.mockRestore();
  });
});