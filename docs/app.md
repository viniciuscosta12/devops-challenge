## 1. Aplicação
A aplicação foi desenvolvida em **Node.js** utilizando o framework **Express** pela sua leveza e simplicidade. 

**Funcionalidades:**
* Expõe um endpoint na raiz (`/`) com uma mensagem de boas-vindas para evitar erros 404 de navegação direta.
* Expõe o endpoint `/health` exigido, retornando o status HTTP 200 e um payload JSON estrito.
* Consome a variável de ambiente `APP_ENV` (com fallback para "Não definido"), garantindo que a aplicação seja *stateless* e configurável via ambiente, seguindo os princípios do *Twelve-Factor App*.