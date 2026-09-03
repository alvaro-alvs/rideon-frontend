This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Autenticacao

O frontend encaminha registro e login pelo BFF em `/api/auth/*`. O token JWT
retornado no login fica em um cookie `HttpOnly`, sem uso de `localStorage` ou
`sessionStorage`. O acesso a `/dashboard` exige esse cookie.

Configure a URL da API no ambiente do servidor:

```bash
cp .env.example .env.local
```

O valor local padrao e `API_URL=http://localhost:8080`. A API deve disponibilizar:

- `POST /api/v1/auth/register`, com `{ "email": "...", "password": "..." }` e resposta contendo `id`.
- `POST /api/v1/auth/login`, com `{ "email": "...", "password": "..." }` e resposta contendo `access_token`.

O `proxy.ts` faz uma verificacao otimista da presenca do cookie. A validacao
criptografica do JWT, refresh token e recuperacao de senha dependem de endpoints
adicionais da API e ainda nao fazem parte deste fluxo.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
