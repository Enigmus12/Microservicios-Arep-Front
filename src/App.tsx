import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import './App.css';

// Front Post type mapped from backend Post
type Post = {
  id: string | number;
  content: string;
  createdAt: string;
  userId?: number;
};

const API_BASE_ENV = process.env.REACT_APP_API_BASE || process.env.REACT_APP_USER_API_BASE || '';
const API_BASE = (() => {
  if (!API_BASE_ENV) return 'http://localhost:8080/api';
  const trimmed = API_BASE_ENV.replace(/\/$/, '');
  // If the env already contains /api, use it; else append /api
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
})();

const POSTS_KEY = 'micro_posts_local_fallback';
const USER_KEY = 'micro_user_id';
const THREAD_KEY = 'micro_global_thread_id';

const App: React.FC = () => {
  const auth = useAuth();
  const [text, setText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stream from backend, fallback to localStorage
  const loadStream = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/stream`);
      if (!res.ok) throw new Error(`Stream fetch failed: ${res.status}`);
      const data = await res.json();
      // backend Post has fields id,userId,hiloId,content,createdAt
      const mapped: Post[] = data.map((p: any) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt || p.createdAt || p.createdAt,
        userId: p.userId,
      }));
      setPosts(mapped.reverse()); // show newest first if backend returns oldest-first
      try { localStorage.setItem(POSTS_KEY, JSON.stringify(mapped)); } catch {}
    } catch (e: any) {
      console.error('loadStream error:', e);
      // fallback to localStorage
      const raw = localStorage.getItem(POSTS_KEY);
      if (raw) {
        try { setPosts(JSON.parse(raw)); } catch { setPosts([]); }
      } else {
        setError(e.message || 'Could not load stream');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStream();
  }, [loadStream]);

  // Ensure a backend user exists for the signed-in user
  const ensureUser = useCallback(async () => {
    if (!auth.isAuthenticated) return null;
    const stored = localStorage.getItem(USER_KEY);
    if (stored) return Number(stored);
    const username = auth.user?.profile?.email || auth.user?.profile?.preferred_username || auth.user?.profile?.sub;
    if (!username) return null;
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('create user failed');
      const u = await res.json();
      if (u && u.id) {
        localStorage.setItem(USER_KEY, String(u.id));
        return u.id;
      }
    } catch (e) {
      console.warn('Could not create user in backend, falling back to local id');
      // create a local synthetic id
      const localId = Date.now();
      localStorage.setItem(USER_KEY, String(localId));
      return localId;
    }
    return null;
  }, [auth.isAuthenticated, auth.user]);

  // Ensure a global thread exists; backend will create one on demand
  const ensureThread = useCallback(async () => {
    const stored = localStorage.getItem(THREAD_KEY);
    if (stored) return Number(stored);
    try {
      const res = await fetch(`${API_BASE}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'global' }),
      });
      if (!res.ok) throw new Error('create thread failed');
      const h = await res.json();
      if (h && h.id) {
        localStorage.setItem(THREAD_KEY, String(h.id));
        return h.id;
      }
    } catch (e) {
      console.warn('Could not create thread in backend, falling back to local thread id');
      const localThreadId = 1;
      localStorage.setItem(THREAD_KEY, String(localThreadId));
      return localThreadId;
    }
    return null;
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = text.trim();
    if (!v) return;
    if (v.length > 140) {
      setError('Content exceeds 140 characters');
      return;
    }

    const userId = await ensureUser();
    const threadId = await ensureThread();
    if (!userId || !threadId) {
      setError('Missing user or thread id');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/threads/${threadId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: v }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Error ${res.status}`);
      }
      const created = await res.json();
      // prepend to posts list
      const p: Post = { id: created.id, content: created.content, createdAt: created.createdAt, userId: created.userId };
      setPosts(prev => [p, ...prev]);
      try { localStorage.setItem(POSTS_KEY, JSON.stringify([p, ...posts])); } catch {}
      setText('');
    } catch (err: any) {
      console.error('create post error:', err);
      setError(err.message || 'Failed to create post');
      // fallback: create local post
      const fallback: Post = { id: Date.now(), content: v, createdAt: new Date().toISOString(), userId: Number(localStorage.getItem(USER_KEY) || 0) };
      setPosts(prev => [fallback, ...prev]);
      try { localStorage.setItem(POSTS_KEY, JSON.stringify([fallback, ...posts])); } catch {}
      setText('');
    }
  };

  if (auth.isLoading || loading) return <div style={{padding:20}}>Loading...</div>;
  if (auth.error) return <div style={{padding:20}}>Auth error: {auth.error.message}</div>;

  return (
    <div className="App" style={{ maxWidth: 820, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Micro-posts</h2>
        <div>
          {auth.isAuthenticated ? (
            <>
              <small style={{marginRight:10}}>Signed in: {auth.user?.profile?.email}</small>
              <button onClick={() => auth.signoutRedirect()}>Sign out</button>
            </>
          ) : (
            <button onClick={() => auth.signinRedirect()}>Sign in</button>
          )}
        </div>
      </header>

      <section style={{ marginTop: 18 }}>
        <form onSubmit={submit}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={140}
            placeholder="Write up to 140 characters..."
            style={{ width: '100%', height: 90, padding: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <small>{text.length}/140</small>
            <button type="submit" disabled={!text.trim()}>Post</button>
          </div>
        </form>
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </section>

      <hr />

      <section>
        <h3>Posts</h3>
        {posts.length === 0 && <div>No posts yet.</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {posts.map(p => (
            <li key={String(p.id)} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(p.createdAt).toLocaleString()} — User {p.userId}</div>
              <div style={{ marginTop: 6 }}>{p.content}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default App;