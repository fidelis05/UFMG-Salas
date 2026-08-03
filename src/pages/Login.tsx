import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import login from "../services/login";
import getSchedule from "../services/schedule";

const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w000.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setError("Sua sessão expirou. Por favor, faça login novamente.");
    }
  }, [searchParams]);

  // If the LtpaToken2 cookie is still valid, fetching the schedule directly
  // both confirms that and prefetches it in a single request, so Schedule.tsx
  // finds it already cached and never needs a round-trip of its own.
  useEffect(() => {
    let cancelled = false;
    getSchedule({ forceReload: true })
      .then(() => {
        if (cancelled) return;
        navigate("/grade", { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function loginRequest(username: string, password: string) {
    try {
      setLoading(true);
      await login(username, password);
      await getSchedule({ forceReload: true }).catch(() => {});
      navigate("/grade");
    } catch {
      setError("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Spinner className="h-8 w-8 text-[#D44A61]" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Entrar</h2>
          <p className="text-gray-500 text-sm mt-1">
            Use suas credenciais do Minha UFMG / SIGA
          </p>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            loginRequest(username, password);
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <input
              type="text"
              placeholder="Seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D44A61]/50 focus:border-[#D44A61] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D44A61]/50 focus:border-[#D44A61] transition-colors"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="bg-[#D44A61] text-white py-3 rounded-full font-semibold hover:bg-[#b93d52] transition-colors w-full shadow-md disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <Spinner />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <a
          href="/disclaimer"
          target="_blank"
          className="block text-center text-sm text-gray-500 hover:text-gray-700 hover:underline mt-4"
        >
          Este site não é oficial da UFMG.
        </a>
      </div>

      {error && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top-2 fade-in duration-300 z-50">
          <span className="text-sm font-medium">{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-700 hover:text-red-900 font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
