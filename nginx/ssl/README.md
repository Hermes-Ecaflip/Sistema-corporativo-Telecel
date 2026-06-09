# Certificados SSL

Coloque aqui os certificados de produção (não versionados no Git por segurança):

- `fullchain.pem` — certificado completo (cert + cadeia)
- `privkey.pem` — chave privada

## Gerar com Let's Encrypt

Veja o passo a passo em `DEPLOY.md` (seção 5).

## Para desenvolvimento (certificado autoassinado)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/C=BR/ST=DF/L=Brasilia/O=TELECEL/CN=localhost"
```
