import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Scouting {
    id: string;
    latitude: number;
    longitude: number;
    disease_detected: string | null;
    disease_code: string | null;
    confidence_score: number | null;
}

interface HeatPoint {
    lat: number;
    lng: number;
    intensity: number;
}

interface Props {
    token: string;
    apiUrl: string;
}

// ---------------------------------------------------------------------------
// Cores por doença
// ---------------------------------------------------------------------------

const DISEASE_COLORS: Record<string, string> = {
    rust:               '#e74c3c',
    target_spot:        '#f39c12',
    frogeye_leaf_spot:  '#f1c40f',
    healthy:            '#2ecc71',
};

const LEGEND = [
    { code: 'rust',              label: 'Ferrugem Asiática', color: '#e74c3c' },
    { code: 'target_spot',       label: 'Mancha Alvo',       color: '#f39c12' },
    { code: 'frogeye_leaf_spot', label: 'Olho-de-Rã',        color: '#f1c40f' },
    { code: 'healthy',           label: 'Saudável',           color: '#2ecc71' },
];

// ---------------------------------------------------------------------------
// Componente de camada de calor (usa Leaflet.heat via hook useMap)
// ---------------------------------------------------------------------------

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap();
    const heatRef = useRef<L.Layer | null>(null);

    useEffect(() => {
        if (!points.length) return;

        if (heatRef.current) map.removeLayer(heatRef.current);

        heatRef.current = (L as any).heatLayer(points, {
            radius: 30,
            blur: 20,
            maxZoom: 12,
            gradient: { 0.3: '#2ecc71', 0.6: '#f39c12', 1.0: '#e74c3c' },
        }).addTo(map);

        return () => {
            if (heatRef.current) map.removeLayer(heatRef.current);
        };
    }, [map, points]);

    return null;
}

// ---------------------------------------------------------------------------
// Dashboard principal
// ---------------------------------------------------------------------------

const DashboardMap: React.FC<Props> = ({ token, apiUrl }) => {
    const [scoutings, setScoutings]       = useState<Scouting[]>([]);
    const [heatPoints, setHeatPoints]     = useState<[number, number, number][]>([]);
    const [view, setView]                  = useState<'points' | 'heat'>('heat');
    const [lastUpdate, setLastUpdate]      = useState<string>('—');

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        try {
            const [scoutRes, heatRes] = await Promise.all([
                axios.get(`${apiUrl}/api/scoutings`, { headers }),
                axios.get(`${apiUrl}/api/scoutings/heatmap`, { headers }),
            ]);

            setScoutings(scoutRes.data);

            const pts: [number, number, number][] = (heatRes.data as HeatPoint[]).map(p => [
                p.lat,
                p.lng,
                Math.min(1, p.intensity / 10),
            ]);
            setHeatPoints(pts);
            setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
        } catch (err) {
            console.error('Erro ao buscar dados do mapa:', err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10_000);
        return () => clearInterval(interval);
    }, [token]);

    return (
        <div>
            {/* Barra de controle */}
            <div style={styles.controls}>
                <div style={styles.toggleGroup}>
                    <button
                        style={{ ...styles.toggleBtn, ...(view === 'heat' ? styles.toggleActive : {}) }}
                        onClick={() => setView('heat')}
                    >
                        Mapa de Calor
                    </button>
                    <button
                        style={{ ...styles.toggleBtn, ...(view === 'points' ? styles.toggleActive : {}) }}
                        onClick={() => setView('points')}
                    >
                        Pontos de Ocorrência
                    </button>
                </div>
                <span style={styles.updateInfo}>
                    {scoutings.length} registros · atualizado às {lastUpdate}
                </span>
            </div>

            {/* Mapa */}
            <MapContainer center={[-15.7942, -47.8822]} zoom={5} style={{ height: '560px', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {view === 'heat' && <HeatmapLayer points={heatPoints} />}

                {view === 'points' && scoutings.map(s => (
                    s.latitude && s.longitude ? (
                        <CircleMarker
                            key={s.id}
                            center={[s.latitude, s.longitude]}
                            radius={8}
                            pathOptions={{
                                fillColor: DISEASE_COLORS[s.disease_code ?? ''] || '#95a5a6',
                                color: '#fff',
                                weight: 1,
                                fillOpacity: 0.85,
                            }}
                        >
                            <Popup>
                                <strong>{s.disease_detected || '⏳ Analisando...'}</strong><br />
                                {s.confidence_score != null
                                    ? `Confiança: ${(s.confidence_score * 100).toFixed(0)}%`
                                    : 'Aguardando IA'}
                            </Popup>
                        </CircleMarker>
                    ) : null
                ))}
            </MapContainer>

            {/* Legenda */}
            <div style={styles.legend}>
                {LEGEND.map(item => (
                    <span key={item.code} style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, backgroundColor: item.color }} />
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    controls: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#f9f9f9',
        borderBottom: '1px solid #e0e0e0',
    },
    toggleGroup: { display: 'flex', gap: 8 },
    toggleBtn: {
        padding: '6px 16px',
        border: '1px solid #2E7D32',
        borderRadius: 20,
        cursor: 'pointer',
        backgroundColor: 'white',
        color: '#2E7D32',
        fontSize: 13,
    },
    toggleActive: {
        backgroundColor: '#2E7D32',
        color: 'white',
    },
    updateInfo: { fontSize: 12, color: '#666' },
    legend: {
        display: 'flex',
        gap: 20,
        padding: '10px 16px',
        backgroundColor: '#f9f9f9',
        borderTop: '1px solid #e0e0e0',
        flexWrap: 'wrap',
    },
    legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 },
    legendDot: { width: 12, height: 12, borderRadius: '50%', display: 'inline-block' },
};

export default DashboardMap;
