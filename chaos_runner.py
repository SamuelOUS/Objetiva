import hashlib
import json
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

RESULT = None
OWNED = None


def endpoint():
    return os.environ.get("ENDPOINT", "/demo/flujo")


def request(path, method="GET", body=None):
    base = os.environ["BASE_URL"].rstrip("/")
    headers = {"Content-Type": "application/json"}

    if path == "/admin/fault":
        headers["x-admin-token"] = os.environ["FAULT_TOKEN"]

    req = Request(
        base + path,
        method=method,
        headers=headers,
        data=None if body is None else json.dumps(body).encode(),
    )

    with urlopen(req, timeout=10) as response:
        return json.loads(response.read())


def healthy():
    body = request(endpoint())

    if not isinstance(body, list):
        return False

    if endpoint() == "/demo/flujo":
        if len(body) != 1 or not isinstance(body[0], dict):
            return False

        item = body[0]

        return (
            isinstance(item.get("traceId"), str)
            and isinstance(item.get("localTask"), dict)
            and item["localTask"].get("id") is not None
            and isinstance(item.get("dependencyTask"), dict)
            and item["dependencyTask"].get("id") is not None
            and item.get("degraded") is False
        )

    return True


def rollback():
    global OWNED

    if OWNED is None:
        return

    state = request("/admin/fault")

    if state.get("experimentId") == OWNED:
        request("/admin/fault", "DELETE")

    state = request("/admin/fault")

    if state.get("expiresAt"):
        raise RuntimeError(
            "Existe un fallo activo al terminar. "
            "No se borrará un experimento ajeno."
        )

    OWNED = None


def hypothesis(p95_limit_ms=500):
    if RESULT is None:
        return healthy()

    if RESULT.get("status") != "complete":
        return False

    return bool(
        RESULT["valid_load"]
        and RESULT["recovered"]
        and RESULT["injection"]["error_rate"] == 0
        and RESULT["injection"]["p95_ms"] <= p95_limit_ms
    )


def point_time(point):
    return datetime.fromisoformat(
        point["data"]["time"].replace("Z", "+00:00")
    ).timestamp()


def metrics(path, start, end):
    latency, errors = [], []
    dropped = 0

    with path.open(encoding="utf-8") as stream:
        for line in stream:
            point = json.loads(line)

            if point.get("type") != "Point":
                continue

            if point["metric"] == "dropped_iterations":
                dropped += point["data"]["value"]

            if start <= point_time(point) < end:
                if point["metric"] == "request_latency_ms":
                    latency.append(point["data"]["value"])

                if point["metric"] == "functional_errors":
                    errors.append(point["data"]["value"])

    latency.sort()

    if not latency or not errors:
        raise RuntimeError("Faltan muestras en la ventana")

    index = (len(latency) - 1) * 0.95
    low = int(index)
    high = min(low + 1, len(latency) - 1)

    p95 = (
        latency[low]
        + (latency[high] - latency[low]) * (index - low)
    )

    return {
        "p95_ms": p95,
        "error_rate": sum(errors) / len(errors),
        "samples": len(latency),
        "dropped_iterations": dropped,
    }


def run_fault(
    latency_ms=1500,
    duration_seconds=120,
    inject_after_seconds=120,
    error_rate=0,
    resource_slots=0,
):
    global RESULT, OWNED
    RESULT = {"status": "running"}

    if not 30 < duration_seconds <= 120:
        raise ValueError("La duración debe estar entre 11 y 120 segundos")

    if inject_after_seconds <= 60:
        raise ValueError("Falta ventana saludable después del calentamiento")

    round_value = os.environ.get("ROUND", "0")

    if round_value not in ("0", "1"):
        raise ValueError("ROUND debe ser 0 o 1")

    root = Path.cwd()
    profile_path = root / "load/profile.json"
    profile_bytes = profile_path.read_bytes()
    profile = json.loads(profile_bytes)

    if (
        inject_after_seconds + duration_seconds + 10
        >= profile["durationSeconds"]
    ):
        raise ValueError(
            "El perfil no deja suficiente ventana de recuperación"
        )

    state = request("/admin/fault")

    if "expiresAt" not in state:
        raise RuntimeError("El servicio tiene un interruptor antiguo")

    if state.get("expiresAt"):
        raise RuntimeError("Ya hay un experimento activo")

    if state.get("location") != "outgoing":
        raise RuntimeError("Render requiere FAULT_LOCATION=outgoing")

    if not healthy():
        raise RuntimeError("El flujo no está saludable")

    experiment_name = (
        "resources" if resource_slots > 0 else
        "dependency" if error_rate > 0 else "latency"
    )
    run_id = f"{experiment_name}-{time.time_ns()}"
    folder = root / "evidence" / run_id
    folder.mkdir(parents=True)

    (folder / "profile.json").write_bytes(profile_bytes)
    (folder / "flow.js").write_bytes(
        (root / "load/flow.js").read_bytes()
    )

    k6_version = subprocess.check_output(
        ["k6", "version"],
        text=True,
    ).strip()

    manifest = {
        "run_id": run_id,
        "round": round_value,
        "base_url": os.environ["BASE_URL"],
        "endpoint": endpoint(),
        "profile": profile,
        "profile_sha256": hashlib.sha256(profile_bytes).hexdigest(),
        "k6_version": k6_version,
        "deployment_revision": os.environ.get(
            "DEPLOYMENT_REVISION",
            "not-recorded",
        ),
        "latency_ms": latency_ms,
        "error_rate": error_rate,
        "resource_slots": resource_slots,
        "duration_seconds": duration_seconds,
        "measurement_seconds": duration_seconds - 30,
    }

    (folder / "manifest.json").write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8",
    )

    env = dict(
        os.environ,
        EXPERIMENT=(
            "resource-exhaustion" if resource_slots > 0 else
            "dependency-unavailable" if error_rate > 0 else
            "outgoing-latency"
        ),
        ROUND=round_value,
        ENDPOINT=endpoint(),
    )

    # El generador no necesita el secreto de administración.
    env.pop("FAULT_TOKEN", None)
    proc = None

    def event(name, **data):
        with (folder / "events.jsonl").open(
            "a",
            encoding="utf-8",
        ) as file:
            file.write(
                json.dumps({
                    "event": name,
                    "timestamp": time.time(),
                    **data,
                }) + "\n"
            )

    def wait_until(deadline):
        remaining = max(0, deadline - time.time())
        stop = time.monotonic() + remaining

        while time.monotonic() < stop:
            if proc.poll() is not None:
                raise RuntimeError(
                    "k6 terminó antes de completar el experimento"
                )

            time.sleep(
                min(0.2, max(0, stop - time.monotonic()))
            )

    try:
        with (folder / "k6.log").open(
            "w",
            encoding="utf-8",
        ) as log:
            proc = subprocess.Popen(
                [
                    "k6",
                    "run",
                    "--out",
                    f'json={folder / "samples.jsonl"}',
                    "load/flow.js",
                ],
                env=env,
                stdout=log,
                stderr=subprocess.STDOUT,
            )

            first = None
            deadline = time.monotonic() + 45

            while first is None:
                if (
                    proc.poll() is not None
                    or time.monotonic() > deadline
                ):
                    raise RuntimeError(
                        "No inició la carga; consultar k6.log"
                    )

                samples = folder / "samples.jsonl"

                if samples.exists():
                    with samples.open(encoding="utf-8") as stream:
                        for line in stream:
                            try:
                                point = json.loads(line)
                            except json.JSONDecodeError:
                                continue

                            if (
                                point.get("type") == "Point"
                                and point["metric"]
                                == "request_latency_ms"
                            ):
                                first = point_time(point)
                                break

                time.sleep(0.1)

            event("load.started", first_sample=first)
            wait_until(first + inject_after_seconds)

            # Guardar propiedad antes del POST por si se pierde la respuesta.
            OWNED = run_id

            sent_at = time.time()
            sent_monotonic = time.monotonic()

            result = request(
                "/admin/fault",
                "POST",
                {
                    "experimentId": run_id,
                    "errorRate": error_rate,
                    "resourceSlots": resource_slots,
                    "latencyMs": latency_ms,
                    "durationSeconds": duration_seconds,
                },
            )

            acknowledged_at = time.time()
            acknowledged_monotonic = time.monotonic()
            control_rtt = acknowledged_monotonic - sent_monotonic

            if (
                result.get("experimentId") != run_id
                or result.get("latencyMs") != latency_ms
                or result.get("errorRate") != error_rate
                or result.get("resourceSlots", 0) != resource_slots
                or result.get("expiresAt", 0)
                - result.get("startedAt", 0)
                != duration_seconds * 1000
            ):
                raise RuntimeError(
                    "No se confirmaron los parámetros del fallo"
                )

            if control_rtt >= 15:
                raise RuntimeError(
                    "La activación tardó demasiado para medir "
                    "una ventana comparable"
                )

            # Solo se usa el reloj del generador para medir.
            start = acknowledged_at + 15
            end = acknowledged_at + duration_seconds - 15

            event(
                "fault.activated",
                state=result,
                control_request_sent_at=sent_at,
                control_acknowledged_at=acknowledged_at,
                control_rtt_seconds=control_rtt,
                measurement_start=start,
                measurement_end=end,
            )

            deadline = (
                acknowledged_monotonic + duration_seconds
            )
            next_check = acknowledged_monotonic

            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    raise RuntimeError(
                        "k6 terminó durante la inyección"
                    )

                if time.monotonic() >= next_check:
                    request("/health/live")
                    active = request("/admin/fault")

                    if (
                        active.get("expiresAt")
                        and active.get("experimentId") != run_id
                    ):
                        raise RuntimeError(
                            "El experimento activo cambió"
                        )

                    earliest_expiry = (
                        sent_monotonic + duration_seconds
                    )

                    if time.monotonic() < earliest_expiry - 1:
                        if (
                            active.get("experimentId") != run_id
                            or not active.get("expiresAt")
                        ):
                            raise RuntimeError(
                                "El fallo desapareció antes de tiempo"
                            )

                    next_check = time.monotonic() + 5

                time.sleep(0.2)

            rollback()
            event("fault.reverted")

            deadline = (
                time.monotonic()
                + profile["durationSeconds"]
                + 30
            )

            while proc.poll() is None:
                if time.monotonic() > deadline:
                    raise RuntimeError("k6 excedió el plazo")

                time.sleep(0.2)

            if proc.returncode:
                raise RuntimeError(
                    "k6 falló; consultar k6.log"
                )

        injection = metrics(
            folder / "samples.jsonl",
            start,
            end,
        )

        baseline = metrics(
            folder / "samples.jsonl",
            first + 60,
            first + inject_after_seconds,
        )

        recovery = metrics(
            folder / "samples.jsonl",
            acknowledged_at + duration_seconds + 5,
            time.time(),
        )

        recovered = (
            healthy()
            and recovery["error_rate"] == 0
        )

        RESULT = {
            "status": "complete",
            "round": round_value,
            "injection": injection,
            "baseline": baseline,
            "recovery": recovery,
            "valid_load": injection["dropped_iterations"] == 0,
            "recovered": recovered,
            "injection_window": [start, end],
        }

        (folder / "result.json").write_text(
            json.dumps(RESULT, indent=2),
            encoding="utf-8",
        )

        event("run.completed")
        print(f"Evidencia: {folder}")
        return RESULT

    except BaseException as exc:
        RESULT = {
            "status": "aborted",
            "reason": str(exc),
        }

        (folder / "result.json").write_text(
            json.dumps(RESULT, indent=2),
            encoding="utf-8",
        )

        event("run.aborted", reason=str(exc))
        raise

    finally:
        try:
            rollback()
        finally:
            if proc and proc.poll() is None:
                proc.terminate()

                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()

def run_latency(
    latency_ms=1500,
    duration_seconds=120,
    inject_after_seconds=120,
):
    return run_fault(
        latency_ms=latency_ms,
        duration_seconds=duration_seconds,
        inject_after_seconds=inject_after_seconds,
        error_rate=0,
    )


def availability_hypothesis(max_error_rate=0.01):
    if RESULT is None:
        return healthy()

    if RESULT.get("status") != "complete":
        return False

    return bool(
        RESULT["valid_load"]
        and RESULT["recovered"]
        and RESULT["injection"]["error_rate"] <= max_error_rate
    )
