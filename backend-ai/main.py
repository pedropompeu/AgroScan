import io
import logging
import os
from typing import Optional

import requests
import uvicorn
from fastapi import BackgroundTasks, FastAPI, File, UploadFile
from PIL import Image
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agroscan-ai")

app = FastAPI(title="AgroScan AI Engine - v3 (Real Inference)")

# ---------------------------------------------------------------------------
# Mapeamento PlantVillage → códigos AgroScan
# Usa busca por substring no label normalizado para ser robusto a variações.
# ---------------------------------------------------------------------------
KEYWORD_MAP = [
    (["rust", "ferrugem"],              ("Ferrugem Asiática",  "rust")),
    (["target_spot", "target"],         ("Mancha Alvo",        "target_spot")),
    (["frogeye", "frog_eye", "frogeye_leaf_spot"], ("Olho-de-Rã", "frogeye_leaf_spot")),
    (["healthy", "saudav"],             ("Saudável",           "healthy")),
    (["bacterial_blight", "blight"],    ("Mancha Alvo",        "target_spot")),
    (["downy_mildew", "powdery_mildew", "mildew"], ("Ferrugem Asiática", "rust")),
    (["mosaic", "virus"],               ("Olho-de-Rã",         "frogeye_leaf_spot")),
]
DEFAULT_DISEASE = ("Ferrugem Asiática", "rust")

# ---------------------------------------------------------------------------
# Carregamento do modelo (lazy — evita timeout no startup do container)
# ---------------------------------------------------------------------------
_classifier = None


def get_classifier():
    global _classifier
    if _classifier is not None:
        return _classifier

    try:
        from transformers import pipeline as hf_pipeline
        model_id = os.getenv(
            "AI_MODEL_ID",
            "linkanjarad/mobilenet_V2_1.0_224-plant-disease-identification"
        )
        logger.info(f"Carregando modelo {model_id} (primeira execução pode demorar)...")
        _classifier = hf_pipeline("image-classification", model=model_id)
        logger.info("Modelo carregado com sucesso.")
    except Exception as exc:
        logger.error(f"Falha ao carregar modelo: {exc}")
        _classifier = None

    return _classifier


def map_label(label: str) -> tuple[str, str]:
    normalized = label.lower().replace(" ", "_").replace("-", "_")
    for keywords, disease_info in KEYWORD_MAP:
        if any(kw in normalized for kw in keywords):
            return disease_info
    return DEFAULT_DISEASE


def classify_image(image: Image.Image) -> dict:
    classifier = get_classifier()
    if classifier is None:
        logger.error("Modelo indisponível — inferência cancelada.")
        return None

    results = classifier(image, top_k=1)
    top = results[0]
    label = top["label"]
    score = round(top["score"], 2)

    disease_label, code = map_label(label)
    return {
        "disease_detected":  disease_label,
        "disease_code":      code,
        "confidence_score":  score,
        "raw_label":         label,
    }


def load_image_from_url(url: str) -> Optional[Image.Image]:
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception as exc:
        logger.warning(f"Falha ao baixar imagem de {url}: {exc}")
        return None


def load_image_from_path(path: str) -> Optional[Image.Image]:
    candidates = [
        path,
        f"/app/uploads/{path}",
        f"/tmp/{os.path.basename(path)}",
    ]
    for candidate in candidates:
        try:
            return Image.open(candidate).convert("RGB")
        except Exception:
            continue
    logger.warning(f"Imagem não encontrada localmente para path: {path}")
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "status": "AgroScan AI Engine v3 — Real Inference",
        "model":  os.getenv("AI_MODEL_ID", "linkanjarad/mobilenet_V2_1.0_224-plant-disease-identification"),
    }


@app.post("/analyze")
async def analyze_sync(file: UploadFile = File(...)):
    """Análise síncrona via upload direto de imagem (multipart/form-data)."""
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    result = classify_image(image)
    if result is None:
        return {"error": "Modelo indisponível."}, 503
    return result


class AnalysisRequest(BaseModel):
    scouting_id: str
    image_path:  str
    callback_url: str
    image_url:   Optional[str] = None


def process_image_task(scouting_id: str, image_path: str, callback_url: str, image_url: Optional[str]):
    logger.info(f"Iniciando inferência real para scouting {scouting_id}")

    image: Optional[Image.Image] = None

    if image_url:
        image = load_image_from_url(image_url)

    if image is None:
        image = load_image_from_path(image_path)

    if image is None:
        logger.error(f"Nenhuma fonte de imagem disponível para {scouting_id}. Abortando inferência.")
        return

    result = classify_image(image)
    if result is None:
        return

    result["scouting_id"] = scouting_id

    secret = os.getenv("AI_CALLBACK_SECRET", "agroscan-internal-secret")
    try:
        response = requests.post(
            callback_url,
            json=result,
            headers={"X-AI-Secret": secret},
            timeout=15,
        )
        logger.info(f"Callback enviado para {scouting_id}. HTTP {response.status_code}")
    except Exception as exc:
        logger.error(f"Erro ao enviar callback para {scouting_id}: {exc}")


@app.post("/analyze-async")
async def analyze_async(request: AnalysisRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_image_task,
        request.scouting_id,
        request.image_path,
        request.callback_url,
        request.image_url,
    )
    return {"status": "inference_queued", "scouting_id": request.scouting_id}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
