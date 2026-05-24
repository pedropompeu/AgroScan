import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const TOKEN_KEY = '@agroscan_token';

export interface AuthCredentials {
    email: string;
    password: string;
}

export const login = async (apiUrl: string, credentials: AuthCredentials): Promise<string> => {
    const res = await axios.post(`${apiUrl}/api/auth/login`, credentials);
    const token = res.data.token as string;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
};

export const logout = async (apiUrl: string, token: string): Promise<void> => {
    try {
        await axios.post(`${apiUrl}/api/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } finally {
        await AsyncStorage.removeItem(TOKEN_KEY);
    }
};

export const getStoredToken = async (): Promise<string | null> => {
    return AsyncStorage.getItem(TOKEN_KEY);
};

export const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
});
