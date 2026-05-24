import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardMap from './components/DashboardMap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'agroscan_token';

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@agroscan.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const token = res.data.token;
      localStorage.setItem(TOKEN_KEY, token);
      onLogin(token);
    } catch {
      setError('Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginWrapper}>
      <form onSubmit={handleSubmit} style={styles.loginForm}>
        <h2 style={{ color: '#2E7D32', marginBottom: 24 }}>AgroScan — Acesso</h2>
        {error && <p style={{ color: '#c0392b', marginBottom: 12 }}>{error}</p>}
        <input
          style={styles.input}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) setToken(stored);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  return (
    <div>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>AgroScan — Dashboard Geográfico</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sair</button>
      </header>
      <main>
        <DashboardMap token={token} apiUrl={API_URL} />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: '#2E7D32',
    padding: '16px 24px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid white',
    color: 'white',
    padding: '6px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  loginWrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loginForm: {
    background: 'white',
    padding: 40,
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    width: 320,
  },
  input: {
    padding: '10px 14px',
    marginBottom: 12,
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 15,
  },
  button: {
    padding: '12px',
    backgroundColor: '#2E7D32',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 8,
  },
};

export default App;
