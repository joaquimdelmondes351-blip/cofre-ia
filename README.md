# COFRE IA

Estrutura inicial do projeto, organizada em **Clean Architecture**, pronta para desenvolvimento de funcionalidades.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- React Router DOM
- Firebase (App, Auth, Firestore)
- Zustand (estado global)
- React Hook Form + Zod (formulários e validação)
- Framer Motion (animações)
- Recharts (gráficos)
- Lucide React (ícones)

## Arquitetura

```
src/
├── app/              # Bootstrap da aplicação: providers e rotas
├── core/
│   ├── domain/       # Entidades, contratos (interfaces) e use cases — regra de negócio pura
│   ├── data/         # Implementações concretas dos contratos (Firebase, etc.)
│   └── infra/        # Configuração de infraestrutura (Firebase SDK, env)
├── presentation/     # Camada de UI: pages, layouts, components, hooks
├── store/            # Estado global (Zustand)
└── shared/           # Types, schemas (Zod), utils e constantes compartilhadas
```

**Regra de dependência:** `presentation` e `data` dependem de `domain`; `domain` não depende de nada externo (nem React, nem Firebase).

## Como rodar

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Firebase
npm run dev
```

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run preview` — preview do build
- `npm run lint` — checagem de lint
