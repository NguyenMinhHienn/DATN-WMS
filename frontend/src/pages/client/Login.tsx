import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || '/admin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="card">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                            W
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
                        <p className="text-slate-600">Sign in to your account</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="label">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input"
                                placeholder="Enter your username"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="mb-6">
                            <label className="label">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-3 text-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        <p>
                            Don't have an account?{' '}
                            <a href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                                Register here
                            </a>
                        </p>
                    </div>

                    <div className="mt-4 text-center text-xs text-slate-400">
                        <p>Demo credentials:</p>
                        <p className="font-mono mt-1">admin / admin123</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
