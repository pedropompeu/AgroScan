import requests
import time
import uuid
import random

BASE_URL = "http://localhost:8000/api"


def get_auth_token() -> str:
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@agroscan.com",
        "password": "password",
    })
    if res.status_code != 200:
        raise RuntimeError(f"Login falhou: {res.status_code} — {res.text}")
    return res.json()["token"]


def test_expansion():
    print("🚀 Iniciando Teste de Expansão - AgroScan (Multiclasse)")

    print("0. Autenticando...")
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    print("   Token obtido com sucesso.")

    # 1. Enviar 5 registros de locais distintos
    scouting_ids = []
    for i in range(5):
        sid = str(uuid.uuid4())
        scouting_ids.append(sid)
        payload = {
            "data": [
                {
                    "id":        sid,
                    "latitude":  -15.79 + random.uniform(-0.1, 0.1),
                    "longitude": -47.88 + random.uniform(-0.1, 0.1),
                    "imagePath": f"scoutings/test_{i}.jpg",
                }
            ]
        }
        print(f"   Enviando Sync {i+1}/5 (ID: {sid})...")
        res = requests.post(f"{BASE_URL}/scoutings/sync", json=payload, headers=headers)
        print(f"   Status: {res.status_code} — {res.json()}")

    # 2. Aguardar processamento assíncrono da IA
    print("2. Aguardando processamento da IA (30s)...")
    time.sleep(30)

    # 3. Validar resultados
    print("3. Validando resultados multiclasse no Banco...")
    res = requests.get(f"{BASE_URL}/scoutings", headers=headers)
    scoutings = res.json()

    counts = {}
    for sid in scouting_ids:
        for s in scoutings:
            if s["id"] == sid:
                d = s["disease_detected"]
                c = s["disease_code"]
                print(f"   {sid[:8]}...: {d} ({c}) — Confiança: {s['confidence_score']}")
                counts[c] = counts.get(c, 0) + 1

    print(f"\nResumo da Detecção: {counts}")
    if len(counts) > 1:
        print("✅ SUCESSO: Múltiplas classes detectadas!")
    else:
        print("⚠️ AVISO: Apenas uma classe detectada (pode ser azar do modelo sem imagem real).")


if __name__ == "__main__":
    test_expansion()
