import { describe, it, expect } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

import { queryRequest } from "./helpers/queryRequest.js";

/*------------------------------------------------------------------------------------- */

describe("POST /tareas", () => {

/*------------------------------------------------------------------------------------- */    

  it("debería crear una tarea correctamente", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        descripcion: "Objetivo para pruebas",
        fechaInicio: new Date("2026-08-18"),
        fechaFin: new Date("2026-09-30"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: "Tarea de prueba",
        descripcion: "Descripción de la tarea",
        fechaLimite: "2026-09-01",
        objetivoId: objetivo.id,
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("id");
    expect(response.body.titulo).toBe("Tarea de prueba");
    expect(response.body.descripcion).toBe(
      "Descripción de la tarea"
    );
    expect(response.body.objetivoId).toBe(objetivo.id);
  });

/*------------------------------------------------------------------------------------- */

  it("debería crear una tarea sin descripción ni fecha límite", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: "Tarea simple",
        objetivoId: objetivo.id,
      });

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("id");
    expect(response.body.titulo).toBe("Tarea simple");
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si falta el título", async () => {

    const response = await request(app)
      .post("/tareas")
      .send({
        descripcion: "Descripción",
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El título es obligatorio"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el título no es texto", async () => {

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: 123,
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El título debe ser un texto"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la descripción no es texto", async () => {

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: "Tarea",
        descripcion: 123,
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "La descripción debe ser un texto"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la fecha límite no es válida", async () => {

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: "Tarea",
        fechaLimite: "fecha-invalida",
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "La fecha límite no es válida"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si objetivoId no es válido", async () => {

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: "Tarea",
        objetivoId: -1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El objetivoId debe ser un entero positivo"
    );
  });

/*------------------------------------------------------------------------------------- */
  
  it("debería devolver 404 si el objetivo no existe", async () => {

    const response = await request(app)
      .post("/tareas")
      .send({
        titulo: "Tarea",
        objetivoId: 999999,
      });

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      "El objetivo indicado no existe"
    );
  });

});

/*------------------------------------------------------------------------------------- */

describe("GET /tareas", () => {

/*------------------------------------------------------------------------------------- */

  it("debería obtener todas las tareas", async () => {

    const response = await request(app)
      .get("/tareas");

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

});

/*------------------------------------------------------------------------------------- */

describe("GET /tareas/:id", () => {

/*------------------------------------------------------------------------------------- */

  it("debería obtener una tarea por ID", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea para consultar",
        descripcion: "Descripción",
        fechaLimite: new Date("2026-09-01"),
        objetivoId: objetivo.id,
      },
    });

    const response = await request(app)
      .get(`/tareas/${tarea.id}`);

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(tarea.id);
    expect(response.body.titulo).toBe(
      "Tarea para consultar"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 404 si la tarea no existe", async () => {

    const response = await request(app)
      .get("/tareas/999999");

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      "Tarea no encontrada"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {

    const response = await request(app)
      .get("/tareas/abc");

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un entero positivo"
    );
  });

});

/*------------------------------------------------------------------------------------- */

describe("PUT /tareas/:id", () => {

/*------------------------------------------------------------------------------------- */

  it("debería actualizar una tarea correctamente", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea original",
        descripcion: "Descripción original",
        fechaLimite: new Date("2026-09-01"),
        objetivoId: objetivo.id,
      },
    });

    const response = await request(app)
      .put(`/tareas/${tarea.id}`)
      .send({
        titulo: "Tarea actualizada",
        descripcion: "Descripción actualizada",
        fechaLimite: "2026-10-01",
        completada: true,
        objetivoId: objetivo.id,
      });

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(tarea.id);
    expect(response.body.titulo).toBe(
      "Tarea actualizada"
    );
    expect(response.body.descripcion).toBe(
      "Descripción actualizada"
    );
    expect(response.body.completada).toBe(true);
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {

    const response = await request(app)
      .put("/tareas/abc")
      .send({
        titulo: "Tarea",
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un entero positivo"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si falta el título", async () => {

    const response = await request(app)
      .put("/tareas/1")
      .send({
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El título es obligatorio"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el título no es texto", async () => {

    const response = await request(app)
      .put("/tareas/1")
      .send({
        titulo: 123,
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El título debe ser un texto"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la descripción no es texto", async () => {

    const response = await request(app)
      .put("/tareas/1")
      .send({
        titulo: "Tarea",
        descripcion: 123,
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "La descripción debe ser un texto"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si completada no es booleano", async () => {

    const response = await request(app)
      .put("/tareas/1")
      .send({
        titulo: "Tarea",
        completada: "true",
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Completada debe ser un booleano"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si la fecha límite no es válida", async () => {

    const response = await request(app)
      .put("/tareas/1")
      .send({
        titulo: "Tarea",
        fechaLimite: "fecha-invalida",
        objetivoId: 1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "La fecha límite no es válida"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si objetivoId no es válido", async () => {

    const response = await request(app)
      .put("/tareas/1")
      .send({
        titulo: "Tarea",
        objetivoId: -1,
      });

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El objetivoId debe ser un entero positivo"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 404 si la tarea no existe", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const response = await request(app)
      .put("/tareas/999999")
      .send({
        titulo: "Tarea",
        objetivoId: objetivo.id,
      });

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      "Tarea no encontrada"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 404 si el objetivo no existe", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea original",
        objetivoId: objetivo.id,
      },
    });

    const response = await request(app)
      .put(`/tareas/${tarea.id}`)
      .send({
        titulo: "Tarea actualizada",
        objetivoId: 999999,
      });

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      "El objetivo indicado no existe"
    );
  });

});

/*------------------------------------------------------------------------------------- */

describe("DELETE /tareas/:id", () => {

/*------------------------------------------------------------------------------------- */

  it("debería eliminar una tarea correctamente", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea para eliminar",
        objetivoId: objetivo.id,
      },
    });

    const response = await request(app)
      .delete(`/tareas/${tarea.id}`);

    expect(response.status).toBe(204);
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 404 si la tarea no existe", async () => {

    const response = await request(app)
      .delete("/tareas/999999");

    expect(response.status).toBe(404);

    expect(response.body.error).toBe(
      "Tarea no encontrada"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si el ID no es válido", async () => {

    const response = await request(app)
      .delete("/tareas/abc");

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El ID debe ser un entero positivo"
    );
  });

});

/*------------------------------------------------------------------------------------- */

describe("QUERY /tareas", () => {

/*------------------------------------------------------------------------------------- */

  it("debería consultar todas las tareas", async () => {

    const response = await queryRequest(
      app,
      "/tareas"
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

/*------------------------------------------------------------------------------------- */

  it("debería filtrar tareas por completada", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea completada",
        objetivoId: objetivo.id,
        completada: true,
      },
    });

    const response = await queryRequest(
      app,
      "/tareas",
      {
        completada: true,
      }
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (item: any) => item.id === tarea.id
      )
    ).toBe(true);
  });

/*------------------------------------------------------------------------------------- */

  it("debería filtrar tareas por objetivoId", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea del objetivo",
        objetivoId: objetivo.id,
      },
    });

    const response = await queryRequest(
      app,
      "/tareas",
      {
        objetivoId: objetivo.id,
      }
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (item: any) => item.id === tarea.id
      )
    ).toBe(true);
  });

/*------------------------------------------------------------------------------------- */

  it("debería filtrar por completada y objetivoId", async () => {

    const categoria = await prisma.categoria.create({
      data: {
        nombre: `Categoria Test ${Date.now()}`,
        descripcion: "Categoria para pruebas",
      },
    });

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: `Objetivo Test ${Date.now()}`,
        fechaInicio: new Date("2026-08-18"),
        categoriaId: categoria.id,
      },
    });

    const tarea = await prisma.tarea.create({
      data: {
        titulo: "Tarea combinada",
        objetivoId: objetivo.id,
        completada: true,
      },
    });

    const response = await queryRequest(
      app,
      "/tareas",
      {
        completada: true,
        objetivoId: objetivo.id,
      }
    );

    expect(response.status).toBe(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(
      response.body.some(
        (item: any) => item.id === tarea.id
      )
    ).toBe(true);
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si completada no es booleano", async () => {

    const response = await queryRequest(
      app,
      "/tareas",
      {
        completada: "true",
      }
    );

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "Completada debe ser un booleano"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si objetivoId no es válido", async () => {

    const response = await queryRequest(
      app,
      "/tareas",
      {
        objetivoId: -1,
      }
    );

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El objetivoId debe ser un entero positivo"
    );
  });

/*------------------------------------------------------------------------------------- */

  it("debería devolver 400 si objetivoId no es un entero", async () => {

    const response = await queryRequest(
      app,
      "/tareas",
      {
        objetivoId: "abc",
      }
    );

    expect(response.status).toBe(400);

    expect(response.body.error).toBe(
      "El objetivoId debe ser un entero positivo"
    );
  });

});