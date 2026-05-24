import requests
import time
import uuid

BASE_URL = "http://localhost:8000/api"
AI_CALLBACK_SECRET = "agroscan-internal-secret"  # deve coincidir com .env


def get_auth_token() -> str:
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@agroscan.com",
        "password": "password",
    })
    if res.status_code != 200:
        raise RuntimeError(f"Login falhou: {res.status_code} — {res.text}")
    return res.json()["token"]


def test_flow():
    print("🚀 Iniciando Teste E2E — AgroScan")

    # 0. Autenticar
    print("0. Autenticando...")
    token = get_auth_token()
    user_headers = {"Authorization": f"Bearer {token}"}
    ai_headers   = {"X-AI-Secret": AI_CALLBACK_SECRET}
    print("   Token obtido com sucesso.")

    # 1. Simular Mobile: Sync de um registro
    scouting_id = str(uuid.uuid4())
    payload = {
        "data": [
            {
                "id":        scouting_id,
                "latitude":  -15.7942,
                "longitude": -47.8822,
                "imagePath": "scoutings/test_photo.jpg",
            }
        ]
    }

    print(f"1. Enviando Sync Mobile (ID: {scouting_id})...")
    res = requests.post(f"{BASE_URL}/scoutings/sync", json=payload, headers=user_headers)
    if res.status_code != 200:
        print(f"❌ Erro no Sync: {res.status_code}\n{res.text}")
        return
    print(f"   Status: {res.status_code}, Resposta: {res.json()}")

    # 2. Verificar persistência
    print("2. Verificando persistência no Backend...")
    time.sleep(1)
    res = requests.get(f"{BASE_URL}/scoutings", headers=user_headers)
    scoutings = res.json()
    found = any(str(s["id"]) == scouting_id for s in scoutings)
    print(f"   Registro encontrado: {found}")

    if not found:
        print("❌ Abortando: Registro não encontrado no backend.")
        return

    # 3. Simular Callback da IA (com X-AI-Secret e disease_code obrigatório)
    print("3. Simulando Callback da IA...")
    callback_payload = {
        "scouting_id":     scouting_id,
        "disease_detected": "Mancha Alvo",
        "disease_code":    "target_spot",   # campo obrigatório — era o bug
        "confidence_score": 0.92,
    }
    res = requests.post(
        f"{BASE_URL}/scoutings/ai-callback",
        json=callback_payload,
        headers=ai_headers,
    )
    print(f"   Status Callback: {res.status_code}")
    if res.status_code != 200:
        print(res.text)
        return

    # 4. Validar resultado final
    print("4. Validando resultado final no Banco...")
    res = requests.get(f"{BASE_URL}/scoutings", headers=user_headers)
    for s in res.json():
        if str(s["id"]) == scouting_id:
            print(f"   Resultado final: {s['disease_detected']} — code: {s['disease_code']} — confiança: {s['confidence_score']}")
            if s["disease_code"] == "target_spot":
                print("✅ TESTE E2E CONCLUÍDO COM SUCESSO!")
                return

    print("❌ ERRO: Resultado da IA não persistiu corretamente.")


if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
