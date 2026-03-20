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
* **Imagem Base Oficial:** Foi escolhida a imagem oficial `node:20-alpine`. Por ser baseada no Alpine Linux, ela entrega apenas o essencial para rodar a aplicação, resultando em uma imagem final muito mais leve e com uma superfície de ataque consideravelmente menor.

* **Atualização Proativa de Segurança (Shift-Left):** Para mitigar vulnerabilidades (CVEs) inerentes à imagem base antes mesmo da execução da aplicação, foi adicionada a instrução `RUN apk upgrade --no-cache && npm install -g npm@latest`. Isso garante que pacotes do sistema operacional (como `zlib`) e o cliente global do NPM estejam sempre em suas versões mais seguras e corrigidas.

* **Usuário Não-Root:** Por padrão, os containers executam como `root`, o que representa um risco crítico de segurança. Utilizei a instrução `USER node` (usuário nativo da imagem) para garantir que a aplicação rode sem privilégios administrativos.

* **Build Determinístico e Limpo:** Optei por usar a flag moderna `npm ci --omit=dev`. Isso não apenas impede a instalação de ferramentas de desenvolvimento no artefato final, mas também garante que o build respeite estritamente as versões mapeadas no `package-lock.json`, prevenindo "atualizações fantasmas".

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


## Parte 4 – Pipeline CI/CD (GitHub Actions)

A automação foi implementada utilizando o **GitHub Actions** (`.github/workflows/ci.yml`). O pipeline foi desenhado com foco no *Shift-Left Security* e na automatização completa do ciclo de vida do artefato, dividindo-se em três *Jobs* principais.

### Estrutura do Pipeline e Decisões Técnicas:

1. **Validação de Histórico (Commit Lint):**
   * O pipeline inicia validando se as mensagens de commit seguem o padrão **Conventional Commits** (ex: `feat:`, `fix:`, `chore:`). Isso garante um histórico de repositório limpo, semântico e prepara o terreno para o versionamento automatizado.

2. **Build e Quality Gate (Segurança):**
   * **Linting de Dockerfile:** Utilização do `Hadolint` para analisar o `Dockerfile` contra violações de boas práticas antes mesmo do build iniciar.
   
   * **Build Imutável:** A imagem Docker é construída utilizando o hash do commit (`${{ github.sha }}`) como *tag temporária*. Isso garante a rastreabilidade exata do código que gerou a imagem.
   
   * **Scan de Vulnerabilidades (Trivy):** A imagem recém-construída é analisada pelo Aqua Trivy. O pipeline atua como um *Quality Gate* rigoroso (`exit-code: 1`), falhando imediatamente e bloqueando a promoção da imagem caso sejam detectadas vulnerabilidades de severidade `HIGH` ou `CRITICAL` no SO (Alpine) ou nas dependências (Node.js).

3. **Versionamento Automatizado e Promoção (Semantic Release):**
   * Condicionado à branch `main` e à aprovação no scan de segurança, este job calcula a próxima versão semântica com base nas mensagens de commit.
   
   * O bot cria automaticamente a Tag no repositório (ex: `v1.0.0`) e gera um *Release Notes* detalhado.
   
   * **A Estratégia de Tagging:** Em um cenário de produção (configurado de forma simulada neste desafio), essa tag semântica atua como o "selo de aprovação". A imagem temporária (aprovada pelo Trivy) seria "retagueada" com a versão oficial (ex: `devops-challenge-app:v1.0.0`) e enviada para o *Container Registry*. Isso separa claramente imagens de "rascunho" das imagens validadas e prontas para deploy.

### Possíveis melhorias em um cenário real
* **Autenticação e Push:** Realizar a configuração dos steps finais do pipeline para realizar o login em um Container Registry (ex: AWS ECR, Docker Registry) e efetivar o `docker push` da imagem com a tag final de release.

* **Testes Automatizados:** Inclusão de um passo executando `npm test` para validar a integridade lógica da aplicação e a cobertura de código (*Code Coverage*) integrado ao SonarQube.

* **Deploy Contínuo (GitOps):** Integrar o pipeline para atualizar automaticamente o manifesto do Kubernetes (`k8s/deployment.yaml`) com a nova tag da imagem, acionando a sincronização no cluster via ArgoCD ou FluxCD.


## Parte 5 – Infraestrutura como Código (Terraform)

Para garantir que a infraestrutura que suporta a aplicação seja versionada, auditável e reprodutível, utilizei o **Terraform** para a declaração dos recursos Cloud.

O código foi organizado na pasta `iac/` seguindo as melhores práticas de modularização, separando a lógica em múltiplos ficheiros (`main.tf`, `variables.tf`, `outputs.tf`).

### Como executar o Terraform (Guia de Uso)

Embora o provisionamento real não seja um requisito deste desafio, o código está estruturado e pronto para ser executado. Caso deseje aplicar esta infraestrutura na sua conta AWS, siga os passos abaixo:

**Pré-requisitos:** Ter o [Terraform](https://developer.hashicorp.com/terraform/downloads) instalado e as credenciais da AWS configuradas na sua máquina (via `aws configure` ou variáveis de ambiente `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`).

1. **Acesse o diretório do Terraform:**
```bash
   cd terraform/
```

2. **Inicialize o diretório:**
Este comando baixa o provedor da AWS e inicializa o ambiente de trabalho.
```bash
terraform init
```

3. **Valide a sintaxe do código:**
Garante que os arquivos `.tf` estão bem formatados e semanticamente corretos.
```bash
terraform validate
```

4. **Gere um plano de execução:**
O Terraform vai ler o seu código, conectar na AWS e mostrar exatamente o que será criado, alterado ou destruído, sem aplicar nada ainda.
```bash
terraform plan
```

5. **Aplique a infraestrutura:**
Se o plano estiver correto, execute o comando abaixo para provisionar os recursos. O Terraform pedirá uma confirmação (`yes`) antes de prosseguir.
```bash
terraform apply
```
Após a conclusão, os valores definidos no arquivo `outputs.tf` serão impressos no terminal.

6. **Destrua a infraestrutura:**
Para evitar custos indesejados após os testes, remova todos os recursos criados por este módulo.
```bash
terraform destroy
```

### Estrutura e Decisões Técnicas:
* **Provedor e Recurso:** O exemplo provisiona um **Bucket S3 na AWS** (`aws_s3_bucket`), um recurso fundamental para o armazenamento de artefatos, backups ou ficheiros estáticos da aplicação.

* **Segurança *Default*:** Foi implementado o recurso `aws_s3_bucket_public_access_block` atrelado ao bucket. Esta é uma medida de segurança que garante que o bucket nasce com o acesso público totalmente bloqueado, prevenindo qualquer vazamento acidental de dados.

* **Variáveis (`variables.tf`):** A região da cloud, o nome do bucket e as tags foram parametrizados. Isto permite que o mesmo código seja reutilizado para provisionar infraestruturas idênticas em ambientes distintos (ex: injetando um `hml.tfvars` ou `prod.tfvars`).

* **Governança (Tags):** Utilização da função `merge()` no HCL para combinar `common_tags` globais (como `Environment` e `ManagedBy`) com tags específicas do recurso. Isto facilita a auditoria de custos e a organização dos recursos na Cloud.

* **Outputs (`outputs.tf`):** O código exporta o `ID` e o `ARN` do bucket criado, informações que poderiam ser consumidas por outros módulos do Terraform ou passadas para o pipeline de CI/CD.

### Possíveis melhorias em um cenário real:
* **Remote State:** Configurar um bloco `backend "s3"` (com `DynamoDB` para *State Locking*) para armazenar o ficheiro `.tfstate` de forma segura e centralizada, permitindo o trabalho em equipe.

* **Integração CI/CD:** Adicionar um fluxo no GitHub Actions (`terraform plan` e `terraform apply`) focado na pasta `iac/`, utilizando ferramentas como o `TFSec` para varrer o código em busca de falhas de segurança antes do provisionamento.