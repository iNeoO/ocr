# Monitoring

## Grafana dashboard

Import the dashboard at:

- `monitoring/grafana/dashboards/ocr-observability.json`

## Prometheus scrape notes

The backend metrics are exposed on:

- `http://<backend-host>:4010/metrics`

RabbitMQ queue-level metrics require scraping the detailed Prometheus endpoint.
The default `/metrics` endpoint is aggregated and is not enough for per-queue panels.

Recommended RabbitMQ scrape target:

```yaml
- job_name: rabbitmq-queues
  metrics_path: /metrics/detailed
  params:
    family:
      - queue_coarse_metrics
      - queue_consumer_count
  static_configs:
    - targets:
        - rabbitmq:15692
```

This follows RabbitMQ's recommended split between aggregated metrics on `/metrics`
and per-object metrics on `/metrics/detailed`.
