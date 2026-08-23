import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Dashboard from './Dashboard';
import Landing from './Landing';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginView, setShowLoginView] = useState(false); // Controla se mostra a Landing ou o formulário de Login
  
  // Estados do formulário de login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
       setAuthError('Credenciais inválidas. Verifique seu e-mail e senha.');
    }
    setAuthLoading(false);
  };

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-[#F1C40F]" size={48} /></div>;
  }

  // Se TEM chave (Sessão Ativa) -> Vai direto pro Dashboard (O Cofre)
  if (session) {
    return <Dashboard session={session} />;
  }

  // Se NÃO TEM chave, mas clicou em "Entrar" -> Mostra o Login Premium
  if (showLoginView) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center p-6 selection:bg-[#F1C40F] selection:text-black">
        <button onClick={() => setShowLoginView(false)} className="absolute top-8 left-8 text-zinc-400 hover:text-white flex items-center gap-2 transition-colors font-medium">
          <ArrowLeft size={16}/> Voltar para o início
        </button>
        
        <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F1C40F] to-transparent opacity-50"></div>
          
          <div className="flex justify-center mb-8">
            <div className="bg-[#F1C40F] p-3 rounded-2xl shadow-[0_0_20px_rgba(241,196,15,0.3)]">
              <ShieldCheck size={32} className="text-[#09090b]" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white text-center mb-2">Acesso ao Workspace</h2>
          <p className="text-zinc-400 text-sm text-center mb-8 font-medium">Insira suas credenciais corporativas.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">E-mail Corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] focus:ring-1 focus:ring-[#F1C40F] outline-none transition-all font-medium"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Senha de Acesso</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:border-[#F1C40F] focus:ring-1 focus:ring-[#F1C40F] outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {authError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-lg text-center">{authError}</div>}

            <button disabled={authLoading} type="submit" className="w-full bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] font-black py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(241,196,15,0.2)] flex justify-center items-center mt-4">
              {authLoading ? <Loader2 className="animate-spin" size={20}/> : 'Acessar o Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Se NÃO TEM chave e não clicou em entrar -> Mostra a Vitrine (Landing Page)
  return <Landing onLoginClick={() => setShowLoginView(true)} />;
}