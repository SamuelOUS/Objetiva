import app from "../src/app.ts";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Objetiva API ejecutándose en http://localhost:${PORT}`);
});