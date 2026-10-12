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

## Executar el linter

```bash
uv run ruff check .
```

## Executar el formatador

```bash
uv run ruff format .
```