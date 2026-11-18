# Ingeniería del Caos — Objetiva

## Arquitectura

k6 → canary `/demo/flujo` → stable `/tareas`.

Se reutilizan Objetiva, Prisma, Render y GitHub Actions.
AWS, Azure y Kubernetes anteriores no se reconstruyen.

## Experimentos y resultados

Responsable individual: SamuelOUS.

| Fallo | Métrica | Ronda 0 | Ronda 1 | Protección |
|---|---|---:|---:|---|
| Latencia saliente: 1.500 ms | p95 ≤1.000 ms | 1.968,69 ms | 906,44 ms | Timeout y caché |
| Dependencia: 503 sintético | Error ≤1% | 100% | 0% | Caché |
| Pool: cuatro permisos ocupados | Error ≤1% | 100% | 0% | Admisión inmediata y caché |

Las seis ejecuciones seleccionadas mantuvieron carga válida
y recuperación confirmada. La reducción del p95 fue de 53,96%.

## Método

- k6: 5 solicitudes/s durante 360 segundos; 30 VUs preasignados.
- Inyección: 120 segundos; análisis de los 90 segundos centrales.
- Chaos Toolkit más interruptor propio autenticado.
- Aborto ante fallo del generador, administración inaccesible
  o cambio inesperado del experimento.
- Reversión mediante TTL, finally y rollback.
- Caché aceptada: antigüedad máxima de cinco minutos.

El alcance se limita al adaptador experimental del canary.
El agotamiento ocupa permisos reales; no satura CPU ni memoria.

## Reproducción

Instalar `chaos/requirements.txt` y k6.
Configurar BASE_URL, ENDPOINT, ROUND y FAULT_TOKEN.

Ejecutar desde la raíz:

`chaos run --rollback-strategy always chaos/latency.json`

También están disponibles `dependency.json` y `resources.json`.

Ronda 0: RESILIENCE_ENABLED=false.
Ronda 1: RESILIENCE_ENABLED=true.

No ejecutar experimentos simultáneamente.

## Evidencia

- `evidence/`: resultados, muestras, eventos y journals.
- `reports/dashboard.html`: comparación histórica.
- `reports/comparison.json`: resultados consolidados.
- `.github/workflows/chaos-gate.yml`: puerta de calidad.

Generar el tablero con `python build_dashboard.py`.

## Limitaciones

El flujo medido es Render→Render: no cumple tres proveedores distintos.
La correlación usa x-trace-id; faltan trazas distribuidas completas.
La caché mantiene disponibilidad, pero no garantiza datos frescos.
Los baselines varían y solo se ejecutó una pareja válida por fallo.

## Uso de IA

Se utilizó ChatGPT para apoyar código, análisis y documentación.
Los resultados proceden de ejecuciones reales del estudiante.