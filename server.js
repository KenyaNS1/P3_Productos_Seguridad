require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

if (!API_KEY || !API_KEY.trim()) {
  throw new Error("Falta configurar API_KEY en el archivo .env o en Render.");
}

const ORIGENES = (process.env.ORIGEN_PERMITIDO || "")
  .split(",")
  .map(origen => origen.trim())
  .filter(Boolean);

// Solo los orígenes indicados pueden leer la API desde un navegador.
// Postman no aplica CORS: por eso POST, PUT y DELETE también requieren token.
app.use(cors({ origin: ORIGENES }));
app.use(express.json());

// Como en P2, los cambios se pierden al reiniciar el servidor.
let productos = [
  { id: 1, nombre: "Teclado", precio: 350, stock: 10 },
  { id: 2, nombre: "Mouse", precio: 180, stock: 25 }
];
let siguienteId = 3;

function validar(datos) {
  const errores = [];
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return ["El cuerpo debe ser un objeto JSON"];
  }
  if (typeof datos.nombre !== "string" || !datos.nombre.trim()) {
    errores.push("nombre es obligatorio y debe ser texto no vacio");
  }
  if (typeof datos.precio !== "number" || !Number.isFinite(datos.precio) || datos.precio < 0) {
    errores.push("precio debe ser un numero mayor o igual a cero");
  }
  if (!Number.isInteger(datos.stock) || datos.stock < 0) {
    errores.push("stock debe ser un entero mayor o igual a cero");
  }
  return errores;
}

function requiereToken(req, res, next) {
  if (req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({ error: "Token inválido o ausente" });
  }
  next();
}

app.get("/", (req, res) => {
  res.status(200).json({ mensaje: "API de productos funcionando en la nube" });
});

// Reto opcional de la actividad P3: comprobar estado del servidor.
app.get("/api/salud", (req, res) => res.status(200).json({ estado: "ok" }));

// GET: rutas públicas.
app.get("/api/productos", (req, res) => {
  const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim().toLowerCase() : "";
  const resultado = buscar
    ? productos.filter(p => p.nombre.toLowerCase().includes(buscar))
    : productos;
  res.status(200).json(resultado);
});

app.get("/api/productos/:id", (req, res) => {
  const producto = productos.find(p => p.id === Number(req.params.id));
  if (!producto) {
    return res.status(404).json({ error: `No existe el producto ${req.params.id}` });
  }
  res.status(200).json(producto);
});

// POST, PUT y DELETE protegidos con x-api-key.
app.post("/api/productos", requiereToken, (req, res) => {
  const errores = validar(req.body);
  if (errores.length) return res.status(400).json({ errores });

  const nuevo = {
    id: siguienteId++,
    nombre: req.body.nombre.trim(),
    precio: req.body.precio,
    stock: req.body.stock
  };
  productos.push(nuevo);
  res.status(201).json(nuevo);
});

app.put("/api/productos/:id", requiereToken, (req, res) => {
  const id = Number(req.params.id);
  const indice = productos.findIndex(p => p.id === id);
  if (indice === -1) {
    return res.status(404).json({ error: `No existe el producto ${req.params.id}` });
  }

  const errores = validar(req.body);
  if (errores.length) return res.status(400).json({ errores });

  const actualizado = {
    id,
    nombre: req.body.nombre.trim(),
    precio: req.body.precio,
    stock: req.body.stock
  };
  productos[indice] = actualizado;
  res.status(200).json(actualizado);
});

app.delete("/api/productos/:id", requiereToken, (req, res) => {
  const id = Number(req.params.id);
  if (!productos.some(p => p.id === id)) {
    return res.status(404).json({ error: `No existe el producto ${req.params.id}` });
  }
  productos = productos.filter(p => p.id !== id);
  res.status(204).send();
});

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Render necesita escuchar en el puerto asignado por PORT.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
