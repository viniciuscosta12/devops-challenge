const express = require('express');
const app = express();
const port = 8080;

// Rota raiz apenas para não retornar 404
app.get('/', (req, res) => {
  res.send('Aplicação rodando com sucesso!');
});

// Rota de health check exigida no desafio
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