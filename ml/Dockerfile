FROM python:3.11-slim
WORKDIR /app
COPY ml/requirements.txt ml/requirements.txt
RUN pip install --no-cache-dir -r ml/requirements.txt
COPY ml/ ml/
ENV PYTHONPATH=/app
CMD ["uvicorn", "ml.inference.server:app", "--host", "0.0.0.0", "--port", "8100"]
