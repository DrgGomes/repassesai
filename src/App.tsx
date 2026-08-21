import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Dashboard from './Dashboard';
import { Loader2, Mail, Lock, Building2, User, Phone, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  // Estados da Tela de Login/Auth
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recovery' | 'update_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Estados do Formulário de Empresa (SaaS)
  const [tipoDoc, setTipoDoc] = useState('CNPJ');
  const [doc, setDoc] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  // Verifica o status do usuário sempre que o app abre
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });

    // Escuta se a pessoa entrou, saiu, ou clicou no link de resetar senha
    supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') setAuthMode('update_password');
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    });
  }, []);

  // Procura no banco de dados se esse usuário já preencheu os dados da empresa
  const checkProfile = async (userId: string) => {
    const { data } = await supabase.from('empresas').select('*').eq('id', userId).single();
    if (data) setHasProfile(true);
    setLoading(false);
  };

  // Motor de Login / Cadastro / Senha
  const handleAuth = async (e: any) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    setMsg({ type: '', text: '' });
    let authError = null;

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authError = error;
      } else if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        authError = error;
        if (!error) setMsg({ type: 'success', text: 'Tudo certo! Acesse seu e-mail para confirmar a conta.' });
      } else if (authMode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        authError = error;
        if (!error) setMsg({ type: 'success', text: 'Instruções enviadas para seu e-mail.' });
      } else if (authMode === 'update_password') {
        const { error } = await supabase.auth.updateUser({ password });
        authError = error;
        if (!error) {
          setMsg({ type: 'success', text: 'Senha atualizada com sucesso!' });
          setAuthMode('login');
        }
      }
    } catch (err) {
      console.error(err);
    }

    if (authError) {
      // Traduz os erros mais comuns do Supabase
      if (authError.message.includes('Invalid login')) setMsg({ type: 'error', text: 'E-mail ou senha incorretos.' });
      else if (authError.message.includes('already registered')) setMsg({ type: 'error', text: 'Este e-mail já está em uso.' });
      else if (authError.message.includes('at least 6')) setMsg({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      else setMsg({ type: 'error', text: authError.message });
    }
    
    setIsLoadingAuth(false);
  };

  // Salva o Perfil da Empresa
  const saveProfile = async (e: any) => {
    e.preventDefault();
    setIsLoadingAuth(true);
    const { error } = await supabase.from('empresas').insert({
      id: session.user.id,
      tipo_documento: tipoDoc,
      documento: doc,
      nome_razao: nome,
      telefone: telefone
    });
    setIsLoadingAuth(false);
    if (error) setMsg({ type: 'error', text: 'Erro ao salvar perfil. O Documento já pode estar em uso.' });
    else setHasProfile(true); // Libera a catraca pro Dashboard!
  };

  // 1. TELA DE CARREGAMENTO INICIAL
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#1a1a1a] text-white">
        <Loader2 className="animate-spin text-[#F1C40F] mb-4" size={48} />
        <p className="font-bold tracking-widest text-sm text-gray-400">CARREGANDO WORKSPACE...</p>
      </div>
    );
  }

  // 2. TELA DE CADASTRO DA EMPRESA (Obriga a pessoa a preencher dados antes de usar o sistema)
  if (session && !hasProfile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-xl animate-fade-in">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Complete seu Cadastro</h2>
            <p className="text-gray-500">Configure os dados da sua operação para liberar o painel.</p>
          </div>
          
          <form onSubmit={saveProfile} className="space-y-5">
            {msg.text && <div className={`p-4 rounded-xl font-bold text-sm ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{msg.text}</div>}
            
            <div className="flex gap-4 mb-4">
               <label className={`flex-1 p-4 rounded-xl border-2 text-center font-bold cursor-pointer transition-colors ${tipoDoc === 'CNPJ' ? 'border-[#F1C40F] bg-yellow-50 text-yellow-900' : 'border-gray-200 text-gray-400'}`}>
                 <input type="radio" className="hidden" checked={tipoDoc === 'CNPJ'} onChange={() => setTipoDoc('CNPJ')} /> CNPJ (Empresa)
               </label>
               <label className={`flex-1 p-4 rounded-xl border-2 text-center font-bold cursor-pointer transition-colors ${tipoDoc === 'CPF' ? 'border-[#F1C40F] bg-yellow-50 text-yellow-900' : 'border-gray-200 text-gray-400'}`}>
                 <input type="radio" className="hidden" checked={tipoDoc === 'CPF'} onChange={() => setTipoDoc('CPF')} /> CPF (Física)
               </label>
            </div>

            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input required type="text" placeholder={`Digite seu ${tipoDoc}`} value={doc} onChange={e => setDoc(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-4 pl-12 pr-4 focus:border-[#F1C40F] outline-none font-bold" />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input required type="text" placeholder={tipoDoc === 'CNPJ' ? 'Razão Social' : 'Nome Completo'} value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-4 pl-12 pr-4 focus:border-[#F1C40F] outline-none font-bold" />
            </div>
            
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input required type="text" placeholder="WhatsApp / Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-4 pl-12 pr-4 focus:border-[#F1C40F] outline-none font-bold" />
            </div>

            <button disabled={isLoadingAuth} type="submit" className="w-full bg-[#1a1a1a] text-[#F1C40F] py-4 rounded-xl font-black text-lg tracking-widest hover:-translate-y-1 transition-transform flex justify-center items-center gap-2 mt-4">
              {isLoadingAuth ? <Loader2 className="animate-spin" /> : <>ACESSAR PAINEL <ArrowRight size={20}/></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. O CORAÇÃO DO SAAS: O DASHBOARD PARA QUEM TEM TUDO CONFIGURADO!
  if (session && hasProfile) {
    return <Dashboard session={session} />;
  }

  // 4. TELA DE LOGIN / REGISTRO PRINCIPAL
  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      
      {/* Lado Esquerdo - Branding */}
      <div className="hidden md:flex w-1/2 bg-[#1a1a1a] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F1C40F] rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
        <div className="relative z-10">
           <h1 className="text-4xl font-black text-white tracking-widest">REPASSE<span className="text-[#F1C40F]">.AI</span></h1>
           <p className="text-gray-400 mt-4 text-lg font-medium max-w-md leading-relaxed">
             A primeira plataforma de auditoria financeira automatizada exclusiva para grandes vendedores Kwai e Upseller.
           </p>
        </div>
        <div className="relative z-10">
           <div className="flex items-center gap-4 text-white mb-6">
             <div className="bg-green-500/20 p-3 rounded-full text-green-400"><AlertCircle size={24}/></div>
             <p className="font-bold">Recupere taxas indevidas</p>
           </div>
           <div className="flex items-center gap-4 text-white">
             <div className="bg-[#F1C40F]/20 p-3 rounded-full text-[#F1C40F]"><Lock size={24}/></div>
             <p className="font-bold">Segurança de nível bancário</p>
           </div>
        </div>
      </div>

      {/* Lado Direito - Formulários */}
      <div className="w-full md:w-1/2 h-full flex items-center justify-center p-8 bg-gray-50 relative overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">
          
          <div className="text-center md:text-left mb-10">
             <h2 className="text-3xl font-black text-gray-900 mb-2">
                {authMode === 'login' ? 'Bem-vindo de volta' : authMode === 'register' ? 'Crie sua conta' : authMode === 'recovery' ? 'Recuperar Acesso' : 'Nova Senha'}
             </h2>
             <p className="text-gray-500 font-medium">
                {authMode === 'login' ? 'Acesse seu workspace.' : authMode === 'register' ? 'Inicie sua auditoria em segundos.' : 'Enviaremos um link mágico para você.'}
             </p>
          </div>

          {msg.text && (
             <div className={`p-4 rounded-xl font-bold text-sm mb-6 flex items-center gap-3 ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
               {msg.type === 'error' ? <AlertCircle size={20}/> : <Mail size={20}/>} {msg.text}
             </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
             {authMode !== 'update_password' && (
               <div className="relative group">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#F1C40F] transition-colors" size={20} />
                 <input required type="email" placeholder="Seu e-mail corporativo" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl py-4 pl-12 pr-4 focus:border-[#F1C40F] focus:ring-4 focus:ring-yellow-50 outline-none font-bold text-gray-800 transition-all" />
               </div>
             )}

             {(authMode === 'login' || authMode === 'register' || authMode === 'update_password') && (
               <div className="relative group">
                 <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#F1C40F] transition-colors" size={20} />
                 <input required type="password" placeholder="Sua senha secreta" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border-2 border-gray-200 rounded-xl py-4 pl-12 pr-4 focus:border-[#F1C40F] focus:ring-4 focus:ring-yellow-50 outline-none font-bold text-gray-800 transition-all" />
               </div>
             )}

             {authMode === 'login' && (
               <div className="flex justify-end">
                 <button type="button" onClick={() => { setAuthMode('recovery'); setMsg({type:'',text:''}); }} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Esqueceu a senha?</button>
               </div>
             )}

             <button disabled={isLoadingAuth} type="submit" className="w-full bg-[#1a1a1a] text-[#F1C40F] py-4 rounded-xl font-black text-lg hover:-translate-y-1 hover:shadow-xl transition-all flex justify-center items-center gap-2 mt-6">
                {isLoadingAuth ? <Loader2 className="animate-spin" /> : (
                  authMode === 'login' ? 'ENTRAR NA PLATAFORMA' : authMode === 'register' ? 'CRIAR MINHA CONTA' : authMode === 'recovery' ? 'ENVIAR LINK MAGICO' : 'ATUALIZAR SENHA'
                )}
             </button>
          </form>

          {/* Rodapé de Troca de Telas */}
          <div className="mt-8 text-center">
            {authMode === 'login' ? (
              <p className="text-gray-500 font-medium">Não tem uma conta? <button onClick={() => { setAuthMode('register'); setMsg({type:'',text:''}); }} className="text-gray-900 font-black hover:underline">Solicite acesso</button></p>
            ) : (
              <p className="text-gray-500 font-medium">Lembrou seus dados? <button onClick={() => { setAuthMode('login'); setMsg({type:'',text:''}); }} className="text-gray-900 font-black hover:underline">Faça login</button></p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}