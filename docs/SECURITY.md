# Diretrizes de Segurança (DevSecOps)

Este documento descreve a estratégia e as boas práticas de segurança adotadas para proteger a infraestrutura, a aplicação e os dados deste projeto em um ambiente de produção real.

## 1. Como gerenciar segredos em produção
O gerenciamento seguro de credenciais (senhas de banco de dados, chaves de API, tokens) é crítico. Em um ambiente produtivo, segredos jamais devem ser armazenados em texto plano em arquivos de configuração ou manifestos do Kubernetes.

* **Cofres de Senhas (Secret Managers):** A abordagem recomendada é centralizar os segredos em serviços de gerenciamento dedicados, como **AWS Secrets Manager**, 
**HashiCorp Vault** ou **Azure Key Vault**.

* **Integração com Kubernetes:** Para injetar esses segredos nos Pods de forma segura, utilizaríamos o **External Secrets Operator (ESO)** ou o **CSI Secret Store Provider**. Eles buscam os segredos no cofre em tempo real e os sincronizam como `Secrets` nativos do Kubernetes diretamente na memória (`tmpfs`), sem gravar em disco.

## 2. Como evitar exposição de credenciais
A prevenção contra o vazamento de dados sensíveis começa no ambiente de desenvolvimento e se estende pelo pipeline de CI/CD.

* **Proteção no Repositório:** O uso rigoroso do arquivo `.gitignore` previne o commit de arquivos de ambiente (ex: `.env`, `terraform.tfvars`).
* **Scan de Código (Pre-commit / CI):** Ferramentas como **Gitleaks** ou **TruffleHog** devem ser integradas ao pipeline de CI ou como *pre-commit hooks* locais para varrer o código em busca de chaves ou tokens esquecidos acidentalmente.
* **Autenticação OIDC no CI/CD:** Em vez de configurar chaves de acesso estáticas de longa duração (como `AWS_ACCESS_KEY_ID`) no GitHub Actions, a melhor prática atual é usar **OpenID Connect (OIDC)**. O pipeline assume uma *Role* temporária na nuvem apenas durante a execução do job, invalidando a credencial logo em seguida.

## 3. Como melhorar a segurança da imagem Docker
A segurança da imagem containerizada segue o princípio de "Shift-Left", mitigando vulnerabilidades antes da execução. Várias destas práticas já foram aplicadas neste projeto:

* **Imagens Enxutas:** Utilização de imagens oficiais baseadas no Alpine (ex: `node:20-alpine`) e, idealmente, a adoção de imagens **Distroless**, que não possuem shell (`/bin/sh`) e minimizam drasticamente a superfície de ataque.
* **Usuário Não-Root:** Execução do processo da aplicação através de um usuário sem privilégios administrativos (instrução `USER node` no Dockerfile), impedindo o escalonamento de privilégios caso o container seja comprometido.
* **Atualização Proativa:** Inclusão de rotinas para atualização de pacotes do SO na construção da imagem (ex: `apk upgrade`) e uso do Node com dependências limpas de desenvolvimento (`npm ci --omit=dev`).
* **Quality Gates no Pipeline:** Como implementado no nosso CI, a utilização do **Trivy** com bloqueio (`exit-code: 1`) garante que nenhuma imagem contendo CVEs críticos ou altos seja promovida para o *Container Registry*.

## 4. Boas práticas de acesso em ambientes Cloud
A arquitetura na nuvem deve ser projetada assumindo que as redes são hostis, seguindo o conceito de *Zero Trust*.

* **Princípio do Menor Privilégio (PoLP):** Usuários, aplicações e serviços (IAM Roles) devem ter apenas as permissões estritamente necessárias para executar suas funções.
* **MFA Obrigatório:** Exigência de Autenticação Multifator (MFA) para todos os acessos humanos ao console da provedora Cloud e aos repositórios de código.
* **Isolamento de Rede (VPC):** Os *Worker Nodes* do Kubernetes e os Bancos de Dados devem ficar isolados em sub-redes privadas, sem IP público. A comunicação com o mundo externo deve ocorrer exclusivamente através de Load Balancers / API Gateways em sub-redes públicas, preferencialmente protegidos por um **WAF (Web Application Firewall)**.
* **Acesso Público Bloqueado por Padrão:** Como demonstrado na parte de Terraform deste projeto (`aws_s3_bucket_public_access_block`), recursos de armazenamento não devem ter permissões públicas configuradas, prevenindo o vazamento de dados de clientes.