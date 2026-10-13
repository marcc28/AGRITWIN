FROM python:3.13-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --only-binary=:all: uv

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project


FROM python:3.13-slim-bookworm AS runtime

WORKDIR /app

RUN useradd --create-home appuser

COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv

COPY --chown=appuser:appuser api/ ./api/
COPY --chown=appuser:appuser db/ ./db/
COPY --chown=appuser:appuser models/ ./models/
COPY --chown=appuser:appuser services/ ./services/
COPY --chown=appuser:appuser templates/ ./templates/
COPY --chown=appuser:appuser main.py ./

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]