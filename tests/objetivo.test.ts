import { describe, it, expect } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { EstadoObjetivo } from "../src/generated/prisma/enums.js";

import { queryRequest } from "./helpers/queryRequest.js";

/*-------------------------------------------------------------------------------------- */

describe("POST /objetivos", () => {

/*-------------------------------------------------------------------------------------- */

  it("debería crear un objetivo correctamente", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const response = await request(app)
      .post("/objetivos")
      .send({
        titulo: "Objetivo de prueba",
        descripcion: "Descripción del objetivo",
        fechaInicio: "2026-08-18",
        fechaFin: "2026-09-30",
        categoriaId: categoria.id,
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("id");
    expect(response.body.titulo).toBe("Objetivo de prueba");
    expect(response.body.descripcion).toBe(
      "Descripción del objetivo"
    );
    expect(response.body.categoriaId).toBe(categoria.id);
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si falta el título", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const response = await request(app)
      .post("/objetivos")
      .send({
        descripcion: "Descripción",
        fechaInicio: "2026-08-18",
        categoriaId: categoria.id,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

 /*-------------------------------------------------------------------------------------- */ 

  it("debería devolver 400 si la fecha de inicio no es válida", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const response = await request(app)
      .post("/objetivos")
      .send({
        titulo: "Objetivo inválido",
        descripcion: "Descripción",
        fechaInicio: "fecha-invalida",
        categoriaId: categoria.id,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la fecha de fin no es válida", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const response = await request(app)
      .post("/objetivos")
      .send({
        titulo: "Objetivo inválido",
        descripcion: "Descripción",
        fechaInicio: "2026-08-18",
        fechaFin: "fecha-invalida",
        categoriaId: categoria.id,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si categoriaId no es válido", async () => {

    const response = await request(app)
      .post("/objetivos")
      .send({
        titulo: "Objetivo inválido",
        descripcion: "Descripción",
        fechaInicio: "2026-08-18",
        categoriaId: -1,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

});

/*-------------------------------------------------------------------------------------- */

describe("GET /objetivos", () => {

/*-------------------------------------------------------------------------------------- */    

  it("debería obtener todos los objetivos", async () => {

    const response = await request(app)
      .get("/objetivos");

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

});

/*-------------------------------------------------------------------------------------- */

describe("GET /objetivos/:id", () => {

/*-------------------------------------------------------------------------------------- */    

  it("debería obtener un objetivo por ID", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo para consultar",
        descripcion: "Descripción",
        fechaInicio: new Date("2026-08-18"),
        fechaFin: new Date("2026-09-30"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .get(`/objetivos/${objetivo.id}`);

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(objetivo.id);
    expect(response.body.titulo).toBe(
      "Objetivo para consultar"
    );
  });

/*-------------------------------------------------------------------------------------- */  

  it("debería devolver 404 si el objetivo no existe", async () => {

    const response = await request(app)
      .get("/objetivos/999999");

    expect(response.status).toBe(404);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */  

  it("debería devolver 400 si el ID no es válido", async () => {

    const response = await request(app)
      .get("/objetivos/abc");

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

});

/*-------------------------------------------------------------------------------------- */

describe("PUT /objetivos/:id", () => {

/*-------------------------------------------------------------------------------------- */

  it("debería actualizar un objetivo correctamente", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo original",
        descripcion: "Descripción original",
        fechaInicio: new Date("2026-08-18"),
        fechaFin: new Date("2026-09-30"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put(`/objetivos/${objetivo.id}`)
      .send({
        titulo: "Objetivo actualizado",
        descripcion: "Descripción actualizada",
        fechaInicio: "2026-08-20",
        fechaFin: "2026-10-01",
        categoriaId: categoria.id,
      });

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(objetivo.id);
    expect(response.body.titulo).toBe(
      "Objetivo actualizado"
    );
    expect(response.body.descripcion).toBe(
      "Descripción actualizada"
    );
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 404 si el objetivo no existe", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const response = await request(app)
      .put("/objetivos/999999")
      .send({
        titulo: "Objetivo actualizado",
        categoriaId: categoria.id,
      });

    expect(response.status).toBe(404);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {

    const response = await request(app)
      .put("/objetivos/abc")
      .send({
        titulo: "Objetivo actualizado",
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */  

  it("debería devolver 400 si el título no es un texto", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo original",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put(`/objetivos/${objetivo.id}`)
      .send({
        titulo: 123,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */  

  it("debería devolver 400 si la descripción no es un texto", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo original",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put(`/objetivos/${objetivo.id}`)
      .send({
        descripcion: 123,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la fecha de inicio no es válida", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo original",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put(`/objetivos/${objetivo.id}`)
      .send({
        fechaInicio: "fecha-invalida",
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */  

  it("debería devolver 400 si la fecha de fin no es válida", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo original",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put(`/objetivos/${objetivo.id}`)
      .send({
        fechaFin: "fecha-invalida",
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */  

  it("debería devolver 400 si la categoría no existe", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo original",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put(`/objetivos/${objetivo.id}`)
      .send({
        categoriaId: 999999,
      });

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

});

/*-------------------------------------------------------------------------------------- */

describe("DELETE /objetivos/:id", () => {

/*-------------------------------------------------------------------------------------- */    

  it("debería eliminar un objetivo correctamente", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo para eliminar",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .delete(`/objetivos/${objetivo.id}`);

    expect(response.status).toBe(204);
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 404 si el objetivo no existe", async () => {

    const response = await request(app)
      .delete("/objetivos/999999");

    expect(response.status).toBe(404);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {

    const response = await request(app)
      .delete("/objetivos/abc");

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

});

/*-------------------------------------------------------------------------------------- */

describe("QUERY /objetivos", () => {

/*-------------------------------------------------------------------------------------- */    

  it("debería consultar todos los objetivos", async () => {

    const response = await queryRequest(
      app,
      "/objetivos"
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

/*-------------------------------------------------------------------------------------- */

  it("debería filtrar objetivos por estado", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo completado",
        descripcion: "Objetivo para QUERY",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
        estado: EstadoObjetivo.COMPLETADO,
      },
    });

    const response = await queryRequest(
      app,
      "/objetivos",
      {
        estado: "COMPLETADO",
      }
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (item: any) => item.id === objetivo.id
      )
    ).toBe(true);
  });

/*-------------------------------------------------------------------------------------- */

  it("debería filtrar objetivos por categoriaId", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo de categoría",
        descripcion: "Objetivo para QUERY",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await queryRequest(
      app,
      "/objetivos",
      {
        categoriaId: categoria.id,
      }
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (item: any) => item.id === objetivo.id
      )
    ).toBe(true);
  });

/*-------------------------------------------------------------------------------------- */

  it("debería filtrar por estado y categoriaId", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: "Objetivo combinado",
        descripcion: "Objetivo para QUERY",
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
        estado: EstadoObjetivo.EN_PROGRESO,
      },
    });

    const response = await queryRequest(
      app,
      "/objetivos",
      {
        estado: "EN_PROGRESO",
        categoriaId: categoria.id,
      }
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (item: any) => item.id === objetivo.id
      )
    ).toBe(true);
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el estado no es válido", async () => {

    const response = await queryRequest(
      app,
      "/objetivos",
      {
        estado: "ESTADO_INEXISTENTE",
      }
    );

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si categoriaId no es válido", async () => {

    const response = await queryRequest(
      app,
      "/objetivos",
      {
        categoriaId: -1,
      }
    );

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

/*-------------------------------------------------------------------------------------- */

  it("debería devolver 400 si categoriaId no es un entero", async () => {

    const response = await queryRequest(
      app,
      "/objetivos",
      {
        categoriaId: "abc",
      }
    );

    expect(response.status).toBe(400);

    expect(response.body).toHaveProperty("error");
  });

});