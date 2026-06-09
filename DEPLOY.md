# TELECEL System — Guia de Deploy (VPS Ubuntu)

Passo a passo para colocar o TELECEL System em produção numa VPS Ubuntu 22.04+, com Docker, Nginx e SSL gratuito (Let's Encrypt).

---

## 1. Pré-requisitos no servidor

```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo apt install -y docker-compose-plugin

# (Opcional) rodar docker sem sudo
sudo usermod -aG docker $USER
# Saia e entre de novo na sessão SSH para aplicar
```

---

## 2. Clonar o projeto

```bash
git clone https://github.com/Hermes-Ecaflip/telecel-system.git
cd telecel-system
```

---

## 3. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Preencha com valores **fortes e únicos** de produção:

```env
NODE_ENV=production
DATABASE_URL=postgresql://telecel:SENHA_FORTE@postgres:5432/telecel
JWT_SECRET=<gerar com: openssl rand -base64 48>
JWT_REFRESH_SECRET=<gerar outro: openssl rand -base64 48>
REDIS_HOST=redis
REDIS_PORT=6379
# AWS S3, SMTP, etc. conforme necessário
```

---

## 4. Subir a aplicação

```bash
docker compose up -d --build

# Aplicar migrations e popular dados iniciais
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Verifique se tudo subiu:

```bash
docker compose ps
docker compose logs -f backend
```

---

## 5. Configurar domínio + SSL (Let's Encrypt)

Aponte o DNS do seu domínio (registro A) para o IP da VPS. Depois:

```bash
# Instalar o Certbot
sudo apt install -y certbot

# Gerar o certificado (com o Nginx temporariamente parado, ou via webroot)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d seudominio.com.br -d www.seudominio.com.br

# Copiar os certificados para a pasta que o Nginx espera
sudo cp /etc/letsencrypt/live/seudominio.com.br/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/seudominio.com.br/privkey.pem   nginx/ssl/

# Reiniciar o Nginx
docker compose restart nginx
```

### Renovação automática

```bash
# Testar a renovação
sudo certbot renew --dry-run

# O cron do certbot já cuida da renovação; após renovar, recarregue o nginx:
echo "0 3 * * * docker compose -f /caminho/telecel-system/docker-compose.yml restart nginx" | sudo crontab -
```

---

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 7. Manutenção

| Tarefa | Comando |
|--------|---------|
| Ver logs | `docker compose logs -f backend` |
| Reiniciar | `docker compose restart` |
| Atualizar código | `git pull && docker compose up -d --build` |
| Backup do banco | `docker compose exec postgres pg_dump -U telecel telecel > backup_$(date +%F).sql` |
| Restaurar backup | `cat backup.sql \| docker compose exec -T postgres psql -U telecel telecel` |
| Aplicar migrations | `docker compose exec backend npx prisma migrate deploy` |

---

## 8. Checklist de produção

- [ ] `.env` com segredos fortes e `NODE_ENV=production`
- [ ] Senhas do seed alteradas (ou seed não executado em produção real)
- [ ] SSL ativo e renovação automática configurada
- [ ] Firewall (ufw) habilitado
- [ ] Backups automáticos do PostgreSQL agendados
- [ ] Monitoramento (Grafana/Prometheus) opcional habilitado via `--profile monitoring`

---

GRUPO TELECEL · Parceiro credenciado TIM
