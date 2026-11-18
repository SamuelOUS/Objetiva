import json
import os
import time
from pathlib import Path
from urllib.request import urlopen

base = os.environ["BASE_URL"].rstrip("/")
endpoint = os.environ.get("ENDPOINT", "/demo/flujo")
output = Path(".gate-run/preflight.json")

attempts = []
consecutive_successes = 0


def valid_flow(body):
    if not isinstance(body, list) or len(body) != 1:
        return False

    item = body[0]

    return (
        isinstance(item, dict)
        and isinstance(item.get("localTask"), dict)
        and item["localTask"].get("id") is not None
        and isinstance(item.get("dependencyTask"), dict)
        and item["dependencyTask"].get("id") is not None
        and item.get("degraded") is False
    )


for number in range(1, 5):
    started = time.monotonic()

    try:
        with urlopen(base + endpoint, timeout=30) as response:
            body = json.loads(response.read())

        elapsed = time.monotonic() - started

        # Margen respecto al timeout de 10 segundos del probe.
        ready = valid_flow(body) and elapsed < 8

        attempts.append({
            "attempt": number,
            "duration_seconds": elapsed,
            "ready": ready,
        })

        consecutive_successes = (
            consecutive_successes + 1 if ready else 0
        )

        print(
            f"Preflight {number}: "
            f"{elapsed:.2f}s, ready={ready}",
            flush=True,
        )

    except Exception as error:
        consecutive_successes = 0

        attempts.append({
            "attempt": number,
            "duration_seconds": time.monotonic() - started,
            "ready": False,
            "error": str(error),
        })

        print(
            f"Preflight {number}: {type(error).__name__}",
            flush=True,
        )

    if consecutive_successes >= 2:
        break

    if number < 4:
        time.sleep(3)

report = {
    "ready": consecutive_successes >= 2,
    "attempts": attempts,
}

output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    json.dumps(report, indent=2),
    encoding="utf-8",
)

if not report["ready"]:
    raise SystemExit(
        "El flujo no alcanzó readiness; no se ejecutará el caos"
    )