import requests
import time
import uuid
import random

BASE_URL = "http://localhost:8000/api"

def test_expansion():
    print("🚀 Iniciando Teste de Expansão - AgroScan (Multiclasse)")
    
    # 1. Simular 5 registros de diferentes locais
    scouting_ids = []
    for i in range(5):
        sid = str(uuid.uuid4())
        scouting_ids.append(sid)
        payload = {
            "data": [
                {
                    "id": sid,
                    "latitude": -15.79 + random.uniform(-0.1, 0.1),
                    "longitude": -47.88 + random.uniform(-0.1, 0.1),
                    "imagePath": f"scoutings/test_{i}.jpg"
                }
            ]
        }
        print(f"   Enviando Sync {i+1}/5 (ID: {sid})...")
        print(requests.post(f"{BASE_URL}/scoutings/sync", json=payload).json())
    
    # 2. Aguardar o processamento da IA (que agora é assíncrono real no docker)
    print("2. Aguardando processamento da IA (10s)...")
    time.sleep(30)
    
    # 3. Validar se os registros foram atualizados com diferentes doenças
    print("3. Validando resultados multiclasse no Banco...")
    res = requests.get(f"{BASE_URL}/scoutings")
    scoutings = res.json()
    
    counts = {}
    for sid in scouting_ids:
        for s in scoutings:
            if s['id'] == sid:
                d = s['disease_detected']
                c = s['disease_code']
                print(f"   ID {sid}: {d} ({c}) - Confiança: {s['confidence_score']}")
                counts[c] = counts.get(c, 0) + 1
    
    print(f"\nResumo da Detecção: {counts}")
    if len(counts) > 1:
        print("✅ SUCESSO: Múltiplas classes detectadas!")
    else:
        print("⚠️ AVISO: Apenas uma classe detectada (pode ser azar no random).")

if __name__ == "__main__":
    test_expansion()
