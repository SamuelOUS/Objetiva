import app from "../src/app.js";
import "dotenv/config";

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Objetiva API ejecutándose en http://localhost:${PORT}`);
});