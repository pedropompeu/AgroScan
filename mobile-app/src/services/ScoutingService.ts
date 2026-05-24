import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { authHeaders } from './AuthService';

const STORAGE_KEY = '@field_scoutings_pending';

export interface ScoutingData {
    id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    imageLocalPath: string;
    imageRemotePath?: string;
    status: 'pending' | 'uploading' | 'synced';
}

// UUID v7 simplificado para geração offline sem colisão
const generateUUIDv7 = (): string => {
    const now = Date.now();
    const hex = now.toString(16).padStart(12, '0');
    const rand = () => Math.random().toString(16).substring(2).padEnd(4, '0').substring(0, 4);
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-7${rand().substring(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${rand().substring(1)}-${rand()}${rand()}${rand()}`;
};

export const saveScoutingOffline = async (
    latitude: number,
    longitude: number,
    imageLocalPath: string,
): Promise<ScoutingData> => {
    const newData: ScoutingData = {
        id: generateUUIDv7(),
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        imageLocalPath,
        status: 'pending',
    };

    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const pending: ScoutingData[] = existing ? JSON.parse(existing) : [];
    pending.push(newData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));

    console.log(`✅ Scouting salvo offline: ${newData.id}`);
    return newData;
};

export const getPendingCount = async (): Promise<number> => {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return 0;
    const pending: ScoutingData[] = JSON.parse(existing);
    return pending.filter(i => i.status !== 'synced').length;
};

export const syncScoutings = async (apiUrl: string, token: string): Promise<void> => {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return;

    const pending: ScoutingData[] = JSON.parse(existing);
    const toSync = pending.filter(i => i.status !== 'synced');
    if (toSync.length === 0) return;

    console.log(`🔄 Sincronizando ${toSync.length} registros...`);

    for (const item of pending) {
        if (item.status === 'synced') continue;

        try {
            // 1. Solicitar presigned URL
            const { data: s3Config } = await axios.post(
                `${apiUrl}/api/storage/presigned-url`,
                { filename: `photo_${item.id}.jpg`, content_type: 'image/jpeg' },
                { headers: authHeaders(token) },
            );

            // 2. Upload da imagem via FormData
            console.log(`⬆️ Upload da imagem para ${item.id}...`);
            const formData = new FormData();
            formData.append('file', {
                uri: `file://${item.imageLocalPath}`,
                name: `photo_${item.id}.jpg`,
                type: 'image/jpeg',
            } as any);

            await axios.put(s3Config.upload_url, formData, {
                headers: { ...s3Config.headers, 'Content-Type': 'multipart/form-data' },
            });

            item.imageRemotePath = s3Config.file_path;
            item.status = 'uploading';

            // 3. Enviar metadados para o Laravel
            console.log(`📝 Sincronizando metadados para ${item.id}...`);
            await axios.post(
                `${apiUrl}/api/scoutings/sync`,
                {
                    data: [{
                        id:        item.id,
                        latitude:  item.latitude,
                        longitude: item.longitude,
                        imagePath: item.imageRemotePath,
                    }],
                },
                { headers: authHeaders(token) },
            );

            item.status = 'synced';
        } catch (err) {
            console.error(`⚠️ Erro ao sincronizar ${item.id}:`, err);
        }
    }

    const remaining = pending.filter(i => i.status !== 'synced');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    console.log('🏁 Sincronização finalizada.');
};
