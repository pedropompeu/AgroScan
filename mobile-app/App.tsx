import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
    Alert, ActivityIndicator, Platform, PermissionsAndroid,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import { saveScoutingOffline, syncScoutings, getPendingCount } from './src/services/ScoutingService';
import { login, logout, getStoredToken } from './src/services/AuthService';

const API_URL = 'http://10.0.2.2:8000'; // IP do host no emulador Android

// ---------------------------------------------------------------------------
// Permissões
// ---------------------------------------------------------------------------

async function requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'AgroScan — Permissão de Localização',
                message: 'Precisamos do GPS para registrar o local da ocorrência.',
                buttonPositive: 'Permitir',
            },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS: configurar no Info.plist
}

// ---------------------------------------------------------------------------
// Tela de Login
// ---------------------------------------------------------------------------

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
    const [email, setEmail]       = useState('admin@agroscan.com');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);

    const handleLogin = async () => {
        if (!password) { Alert.alert('Erro', 'Informe a senha.'); return; }
        setLoading(true);
        try {
            const token = await login(API_URL, { email, password });
            onLogin(token);
        } catch {
            Alert.alert('Erro', 'Credenciais inválidas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>AgroScan IA</Text></View>
            <View style={styles.loginContent}>
                <Text style={styles.loginLabel}>E-mail</Text>
                <Text style={styles.loginValue}>{email}</Text>
                <Text style={styles.loginLabel}>Senha</Text>
                <Text style={styles.loginHint}>(utilize a senha cadastrada)</Text>
                <TouchableOpacity style={styles.buttonCapture} onPress={handleLogin} disabled={loading}>
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>ENTRAR</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Tela principal
// ---------------------------------------------------------------------------

function MainScreen({ token, onLogout }: { token: string; onLogout: () => void }) {
    const [pendingCount, setPendingCount]   = useState(0);
    const [capturing, setCapturing]         = useState(false);
    const [syncing, setSyncing]             = useState(false);
    const [cameraActive, setCameraActive]   = useState(false);

    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();
    const camera = useRef<Camera>(null);

    useEffect(() => { refreshCount(); }, []);

    const refreshCount = async () => {
        setPendingCount(await getPendingCount());
    };

    const handleCapture = async () => {
        // Permissão de câmera
        if (!hasPermission) {
            const granted = await requestPermission();
            if (!granted) {
                Alert.alert('Permissão negada', 'Acesso à câmera necessário.');
                return;
            }
        }

        // Permissão de localização
        const locationOk = await requestLocationPermission();
        if (!locationOk) {
            Alert.alert('Permissão negada', 'Acesso ao GPS necessário.');
            return;
        }

        setCameraActive(true);
    };

    const takePicture = async () => {
        if (!camera.current) return;
        setCapturing(true);
        try {
            const photo = await camera.current.takePhoto({ flash: 'off' });

            Geolocation.getCurrentPosition(
                async position => {
                    const { latitude, longitude } = position.coords;
                    await saveScoutingOffline(latitude, longitude, photo.path);
                    setCameraActive(false);
                    await refreshCount();
                    Alert.alert('✅ Capturado', 'Monitoramento salvo! Sincronize quando tiver conexão.');
                },
                error => {
                    setCameraActive(false);
                    Alert.alert('Erro GPS', `Não foi possível obter a localização: ${error.message}`);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
            );
        } catch (err) {
            Alert.alert('Erro', 'Falha ao capturar a foto.');
            setCameraActive(false);
        } finally {
            setCapturing(false);
        }
    };

    const handleSync = async () => {
        if (pendingCount === 0) { Alert.alert('Info', 'Nenhum registro para sincronizar.'); return; }
        setSyncing(true);
        try {
            await syncScoutings(API_URL, token);
            await refreshCount();
            Alert.alert('✅ Sincronizado', 'Dados enviados com sucesso!');
        } catch {
            Alert.alert('Erro', 'Falha na sincronização. Verifique a conexão.');
        } finally {
            setSyncing(false);
        }
    };

    // Tela de câmera ativa
    if (cameraActive && device) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <Camera
                    ref={camera}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={true}
                    photo={true}
                />
                <View style={styles.cameraControls}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setCameraActive(false)}>
                        <Text style={styles.buttonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shutterBtn} onPress={takePicture} disabled={capturing}>
                        {capturing
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.buttonText}>📷</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>AgroScan IA</Text>
                <TouchableOpacity onPress={onLogout}>
                    <Text style={styles.logoutText}>Sair</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={[styles.status, pendingCount > 0 ? styles.pending : styles.synced]}>
                    {pendingCount} {pendingCount === 1 ? 'registro pendente' : 'registros pendentes'}
                </Text>
                <Text style={styles.info}>
                    Capture fotos da cultura para detecção de pragas. Os dados ficam salvos offline e são enviados quando houver conexão.
                </Text>
            </View>

            <TouchableOpacity style={styles.buttonCapture} onPress={handleCapture}>
                <Text style={styles.buttonText}>📷 CAPTURAR MONITORAMENTO</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.buttonSync, (pendingCount === 0 || syncing) && styles.disabled]}
                onPress={handleSync}
                disabled={pendingCount === 0 || syncing}
            >
                {syncing
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>🔄 SINCRONIZAR AGORA</Text>}
            </TouchableOpacity>
        </SafeAreaView>
    );
}

// ---------------------------------------------------------------------------
// Root: gerencia auth
// ---------------------------------------------------------------------------

const App = () => {
    const [token, setToken] = useState<string | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        getStoredToken().then(t => {
            setToken(t);
            setChecking(false);
        });
    }, []);

    const handleLogout = async () => {
        if (token) await logout(API_URL, token);
        setToken(null);
    };

    if (checking) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#2E7D32" />
            </SafeAreaView>
        );
    }

    if (!token) return <LoginScreen onLogin={setToken} />;
    return <MainScreen token={token} onLogout={handleLogout} />;
};

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container:      { flex: 1, backgroundColor: '#F5F5F5' },
    header:         { padding: 20, backgroundColor: '#2E7D32', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    title:          { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
    logoutText:     { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    content:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    status:         { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
    pending:        { color: '#D32F2F' },
    synced:         { color: '#2E7D32' },
    info:           { textAlign: 'center', fontSize: 15, color: '#666', lineHeight: 22 },
    loginContent:   { flex: 1, justifyContent: 'center', padding: 32 },
    loginLabel:     { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 12 },
    loginValue:     { fontSize: 16, color: '#333', marginBottom: 4 },
    loginHint:      { fontSize: 13, color: '#999' },
    buttonCapture:  { margin: 12, backgroundColor: '#2E7D32', padding: 18, borderRadius: 10, alignItems: 'center' },
    buttonSync:     { margin: 12, backgroundColor: '#1976D2', padding: 18, borderRadius: 10, alignItems: 'center' },
    disabled:       { backgroundColor: '#BDBDBD' },
    buttonText:     { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24 },
    cancelBtn:      { backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 10, minWidth: 100, alignItems: 'center' },
    shutterBtn:     { backgroundColor: '#2E7D32', padding: 16, borderRadius: 50, width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
});

export default App;
