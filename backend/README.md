## Executar el backend

1. Instal·lar `uv`:

   ```bash
   pip install uv
   ```

2. Instal·lar les dependències del projecte:

   ```bash
   uv sync
   ```

3. Iniciar el servidor backend:

   ```bash
   uv run uvicorn main:app --reload
   ```

## Límits d'ús

Configura aquests valors al fitxer `backend/.env`:

```env
AI_LIMIT_USAGE=20/minute
FORUM_RATE_LIMIT=10/minute
```

`AI_LIMIT_USAGE` limita per usuari les consultes de recomanacions i les peticions
de regeneració. `FORUM_RATE_LIMIT` limita per adreça IP la creació d'anuncis.
Quan se supera un límit, l'API retorna `429 Too Many Requests` i una capçalera
`Retry-After`.

## Executar el linter

```bash
uv run ruff check .
```

## Executar el formatador

```bash
uv run ruff format .
```
