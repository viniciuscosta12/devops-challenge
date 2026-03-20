const express = require('express');
const app = express();
const port = 8080;

app.get('/', (req, res) => {
  res.send('Aplicação rodando com sucesso!');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: "ok",
    version: "1.0.0",
    environment: process.env.APP_ENV || "Não definido"
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});