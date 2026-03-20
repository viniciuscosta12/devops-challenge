# Desafio Técnico DevOps

Este repositório contém a solução para o desafio técnico focado em fundamentos de DevOps, englobando containerização, infraestrutura como código (IaC), Kubernetes, CI/CD e boas práticas de segurança.

## 1. Aplicação
A aplicação foi desenvolvida em **Node.js** utilizando o framework **Express** pela sua leveza e simplicidade. 

**Funcionalidades:**
* Expõe um endpoint na raiz (`/`) com uma mensagem de boas-vindas para evitar erros 404 de navegação direta.
* Expõe o endpoint `/health` exigido, retornando o status HTTP 200 e um payload JSON estrito.
* Consome a variável de ambiente `APP_ENV` (com fallback para "Não definido"), garantindo que a aplicação seja *stateless* e configurável via ambiente, seguindo os princípios do *Twelve-Factor App*.


### Como executar o projeto

### Pré-requisitos
* Node.js v20+ (para execução local direta)
* Docker

#### Opção 1: Executando localmente (Node.js)
1. Acesse a pasta da aplicação: 
```bash
cd app
```
2. Instale as dependências: 
```bash
npm install
```
3. Execute passando a variável de ambiente: 
```bash
APP_ENV=dev-npm npm start
```
4. Teste o health check em outro terminal: 
```bash   
curl http://localhost:8080/health
```

#### Opção 2: Executando via Docker
1. Na raiz do projeto, construa a imagem da aplicação:
```bash
docker build -t devops-challenge-app ./app
```
2. Execute o container mapeando a porta e injetando a variável de ambiente:
```bash
docker run -p 8080:8080 -e APP_ENV=dev-container devops-challenge-app
```
3. Teste a resposta da aplicação: 
```bash
curl http://localhost:8080/health
```

### Decisões técnicas tomadas

**Aplicação:**
* A API foi desenvolvida em **Node.js com Express** devido à sua leveza, rápida inicialização e facilidade para expor o endpoint `/health` exigido.
* Foi incluída uma rota raiz (`/`) com uma mensagem simples de boas-vindas para evitar erros 404 caso a aplicação seja acessada diretamente no navegador.
* A aplicação consome a variável `APP_ENV` dinamicamente, mantendo-se *stateless* e configurável via ambiente, alinhada aos princípios do *Twelve-Factor App*.


### Possíveis melhorias em um cenário real

* **Gestão avançada de vulnerabilidades no Node.js:** Em vez de depender do `npm audit fix` (que muitas vezes falha ou quebra dependências), poderia ser implementado o uso do bloco `overrides` no `package.json` para forçar a resolução de subdependências com vulnerabilidades críticas assim que fossem detectadas por ferramentas de scan (como Trivy ou Snyk).


## Parte 2 – Containerização (Docker)

### Decisões tomadas na construção da imagem:
* **Imagem Base Oficial e Enxuta:** Foi escolhida a imagem oficial `node:20-alpine`. Por ser baseada no Alpine Linux, ela entrega apenas o essencial para rodar a aplicação, resultando em uma imagem final muito mais leve e com uma superfície de ataque consideravelmente menor.
* **Usuário Não-Root:** Por padrão, os containers executam como `root`, o que representa um risco crítico de segurança. Utilizei a instrução `USER node` (usuário nativo da imagem) para garantir que a aplicação rode sem privilégios administrativos.
* **Build Determinístico:** Optei por usar `npm ci --only=production` ao invés de `npm install`. Isso garante que o build respeite estritamente as versões do `package-lock.json`, prevenindo que atualizações fantasmas quebrem a aplicação no pipeline.
* **Otimização de Cache:** A cópia dos arquivos `package*.json` foi isolada em um passo anterior à cópia do código-fonte (`server.js`). Dessa forma, tiramos máximo proveito do cache do Docker: se apenas o código mudar, a camada de instalação das dependências não precisará ser recriada, acelerando o tempo de build no CI/CD.

### Possíveis melhorias em um cenário real
* **Gestão de Vulnerabilidades:** Em cenários onde ferramentas como Trivy ou Snyk apontam vulnerabilidades críticas, eu evitaria o uso cego do comando `npm audit fix` (que pode atualizar pacotes indesejados e quebrar a aplicação). A melhoria seria implementar o bloco `overrides` no `package.json` para forçar a resolução de subdependências específicas, mantendo a segurança sem impacto no projeto.

* **Multi-stage Builds:** Caso a aplicação escalasse e passasse a utilizar compiladores (como TypeScript), a construção da imagem Docker seria dividida em múltiplos estágios (build e run), garantindo que apenas os artefatos finais fossem levados para o ambiente de produção.

* **Healthcheck no Dockerfile:** Adição da instrução `HEALTHCHECK` para que o próprio daemon do Docker consiga validar a integridade da aplicação antes de rotear tráfego para o container.

## Parte 3 – Kubernetes

Os manifestos foram estruturados na pasta `k8s/` focando em resiliência, limites de recursos e boas práticas de isolamento de configuração.

### Como testar localmente (usando Kind)

**Pré-requisitos:** Ter o [kubectl](https://kubernetes.io/docs/reference/kubectl/kubectl/) e o [kind](https://kind.sigs.k8s.io/docs/user/quick-start/) (Kubernetes in Docker) instalados e o Docker rodando.


1. **Crie o cluster local:**
```bash
   kind create cluster --name devops-challenge
```

2. **Push da imagem Docker para o cluster:**
Como a imagem não está em um registry público, é necessário enviá-la do Docker local para o repositório interno do Kind:
```bash
kind load docker-image devops-challenge-app:latest --name devops-challenge
```

3. **Aplique os manifestos:**
Navegue até a raiz do projeto e execute:
```bash
kubectl apply -f k8s/
```
4. **Verifique a saúde dos Pods e inicie o Port-Forward:**
```bash
kubectl get pods -w  # Aguarde o status Running e Ready (1/1)
```

5. **Conecte a porta 8080 da sua máquina à porta 80 do Service no cluster**
```bash
kubectl port-forward svc/app-service 8080:80
```

6. **Valide a aplicação (em outro terminal):**
```bash
curl http://localhost:8080/health
```

### Decisões técnicas tomadas:
* **Isolamento de Configuração:** A variável `APP_ENV` não foi fixada (hardcoded) no Deployment. Utilizei um ConfigMap (`app-config`) para injetá-la no container. Isso permite promover a mesma imagem entre ambientes (Dev, Hml, Prod) alterando apenas a configuração, sem precisar refazer o build.

* **Gestão de Segredos:** Atendendo à premissa do desafio, nenhum segredo em texto plano (ou Base64) foi colocado nos manifestos. Em um cenário real, eles seriam injetados no cluster de forma segura.

* **Probes de Saúde:**

   * **ReadinessProbe:** Testa o endpoint /health. O Service do Kubernetes só roteia tráfego para o pod se ele estiver pronto para responder, evitando indisponibilidade durante o startup.

   * **LivenessProbe:** Monitora a saúde contínua. Se a API travar, o Kubernetes reinicia automaticamente o container (auto-healing).

* **Gestão de Recursos:** Foram configurados requests (garantia mínima de CPU/RAM para agendamento no Node) e limits (teto máximo para evitar que a aplicação consuma recursos excessivos e afete outras aplicações do cluster).

* **Exposição:** Utilizado um Service do tipo `ClusterIP` (fechado internamente) atrelado a um `Ingress`, preparando a arquitetura para atuar como API Gateway/Load Balancer de camada 7.

* **ImagePullPolicy:** Definida como `IfNotPresent` para garantir que o cluster utilize a imagem recém-construída localmente durante o desenvolvimento.

### Possíveis melhorias em um cenário real

* **Gerenciamento de Segredos (ESO):** Integração com o External Secrets Operator (ESO) para buscar credenciais dinamicamente de cofres seguros, como AWS Secrets Manager ou HashiCorp Vault.

* **Autoscaling:** Implementação de um Horizontal Pod Autoscaler (HPA) baseado em métricas de CPU e Memória para escalar a aplicação conforme a demanda.

* **Helm / Kustomize:** Empacotamento desses manifestos para facilitar a parametrização, versionamento e o deploy contínuo utilizando ferramentas de GitOps, como o ArgoCD.]



