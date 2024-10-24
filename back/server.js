const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Requiere SSL para CockroachDB
});

// Ruta para actualizar el valor de activa de la tabla de conexiones a true de la conexion con el nombre dado (para indicar que el usuario esta conectado)
app.put("/activate-connection/:name", async (req, res) => {
  const name = req.params.name;
  try {
    const result = await pool.query("UPDATE conexiones_db.conexiones SET activa = true WHERE nombre = $1;", [name]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json({ message: "Connection activated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para actualizar el valor de activa de la tabla de conexiones a false de la conexion con el nombre dado (para indicar que el usuario se ha desconectado)
app.put("/deactivate-connection/:name", async (req, res) => {
  const name = req.params.name;
  try {
    const result = await pool.query("UPDATE conexiones_db.conexiones SET activa = false WHERE nombre = $1;", [name]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json({ message: "Connection deactivated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para desactivar todas las conexiones
app.put("/deactivate-all-connections", async (req, res) => {
  try {
    const result = await pool.query("UPDATE conexiones_db.conexiones SET activa = false;");
    res.json({ message: "All connections deactivated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Ruta para obtener todos los usuarios
app.get("/get-sql-users", async (req, res) => {
  try {
    const result = await pool.query("SELECT usename AS username FROM pg_catalog.pg_user;");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para obtener todas las bases de datos
app.get("/get-databases", async (req, res) => {
  try {
    const result = await pool.query("SELECT datname FROM pg_database;");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para obtener el objeto de cada conexion en la tabla conexiones
app.get("/get-connections", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM conexiones_db.conexiones;");
    console.log("Query result:", result.rows); // Mensaje de depuración
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No connections found" });
    }
    const connections = result.rows.map(row => ({
      nombre: row.nombre,
      usuario: row.usuario,
      password: row.password,
      database: row.database,
      activa: row.activa
    }));
    res.json(connections);
  } catch (err) {
    console.error("Error executing query:", err); // Mensaje de depuración
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para verificar que una conexion con un nombre dado existe
app.get("/check-connection-existence/:name", async (req, res) => {
  const name = req.params.name;
  try {
    const result = await pool.query("SELECT * FROM conexiones_db.conexiones WHERE nombre = $1;", [name]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json({ message: "Connection found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para eliminar una conexión
app.delete("/delete-connection/:name", async (req, res) => {
  const name = req.params.name;
  try {
    console.log(`Attempting to delete connection with name: ${name}`); // Debug message
    const result = await pool.query("DELETE FROM conexiones_db.conexiones WHERE nombre = $1;", [name]);
    console.log(`Delete query result:`, result); // Debug message
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    res.json({ message: "Connection deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para agregar una nueva conexión
app.post("/create-connection", async (req, res) => {
  const { connectionName, user, password, database } = req.body;
  try {
    const formData = req.body;
    const { connectionName, user, password, database } = formData;
    await pool.query("INSERT INTO conexiones_db.conexiones (nombre, usuario, password, database, activa) VALUES ($1, $2, $3, $4, false);", [connectionName, user, password, database]);
    res.json({ message: "Connection added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Query para ver en que tabla estoy
app.get("/current-db", async (req, res) => {
  try {
    const result = await pool.query("SHOW DATABASE;");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para modificar el nombre de una conexión
app.put("/update-connection-name", async (req, res) => {
  const { oldName, newName } = req.body;
  try {
    const result = await pool.query("UPDATE conexiones_db.conexiones SET nombre = $1 WHERE nombre = $2;", [newName, oldName]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Connection not found" });
    }
    res.json({ message: "Connection name updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


