import { ArrowRight, ShieldCheck, Database, FileJson, LineChart, Search, Lock, Zap, FileSpreadsheet, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Landing({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans selection:bg-[#F1C40F] selection:text-black overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="fixed w-full top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#F1C40F] p-1.5 rounded-lg shadow-[0_0_15px_rgba(241,196,15,0.3)]">
              <ShieldCheck size={20} className="text-[#09090b]" />
            </div>
            <span className="text-xl font-black tracking-widest text-white">REPASSE<span className="text-[#F1C40F]">.AI</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-zinc-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a>
            <a href="#plataformas" className="hover:text-white transition-colors">Plataformas</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          </div>
          <div className="flex gap-4">
            <button onClick={onLoginClick} className="text-sm font-bold text-zinc-300 hover:text-white transition-colors hidden md:block">Entrar</button>
            <button onClick={onLoginClick} className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-[0_0_20px_rgba(241,196,15,0.2)] hover:scale-105">
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F1C40F] opacity-[0.07] blur-[120px] rounded-full pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#F1C40F]/30 bg-[#F1C40F]/10 text-[#F1C40F] text-xs font-bold uppercase tracking-wider mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F1C40F] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F1C40F]"></span>
          </span>
          A primeira Auditoria Forense para E-commerce
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
          Pare de perder dinheiro <br className="hidden md:block"/> para os <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F1C40F] to-yellow-600">Marketplaces.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mb-10 leading-relaxed font-medium">
          As plataformas lucram com a confusão das planilhas. Fretes duplos, taxas indevidas e pedidos "esquecidos" corroem sua margem. O Repasse.AI é o seu auditor financeiro automático que encontra e recupera cada centavo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button onClick={onLoginClick} className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] px-8 py-4 rounded-2xl text-base font-black transition-all shadow-[0_0_30px_rgba(241,196,15,0.3)] hover:shadow-[0_0_40px_rgba(241,196,15,0.4)] flex items-center justify-center gap-2 hover:-translate-y-1">
            Proteger meu dinheiro agora <ArrowRight size={18}/>
          </button>
        </div>

        {/* HERO MOCKUP */}
        <div className="mt-20 w-full max-w-5xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10 bottom-0 h-40 mt-auto"></div>
          <div className="bg-[#111827] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transform perspective-1000 rotate-x-12 scale-100 hover:scale-[1.02] transition-transform duration-500">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="p-8 grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-[#09090b] border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Venda Real Processada</p>
                <p className="text-3xl font-black text-white">R$ 145.230,00</p>
              </div>
              <div className="col-span-1 bg-gradient-to-br from-red-900/20 to-[#09090b] border border-red-900/50 rounded-xl p-6 relative">
                <AlertTriangle className="absolute top-4 right-4 text-red-500/20" size={48}/>
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-2">Dinheiro Retido</p>
                <p className="text-3xl font-black text-red-500">R$ 4.320,50</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATAFORMAS */}
      <section id="plataformas" className="border-y border-zinc-800/50 bg-[#09090b] py-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Integração com as maiores plataformas</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-2 text-2xl font-black"><span className="text-[#F1C40F]">Kwai</span> Shop</div>
             <div className="flex items-center gap-2 text-2xl font-black text-orange-500 relative">Shopee <span className="absolute -top-3 -right-6 text-[8px] bg-zinc-800 text-white px-2 py-0.5 rounded-full">EM BREVE</span></div>
             <div className="flex items-center gap-2 text-2xl font-black text-pink-500 relative">TikTok <span className="absolute -top-3 -right-6 text-[8px] bg-zinc-800 text-white px-2 py-0.5 rounded-full">EM BREVE</span></div>
             <div className="flex items-center gap-2 text-2xl font-black text-yellow-400 relative">Meli <span className="absolute -top-3 -right-6 text-[8px] bg-zinc-800 text-white px-2 py-0.5 rounded-full">EM BREVE</span></div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM / SOLUTION (BENTO GRID) */}
      <section id="como-funciona" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">A caixa preta foi aberta.</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg font-medium">Nós criamos o algoritmo perfeito que isola subsídios, calcula o que realmente importa e expõe o que tentam esconder.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative overflow-hidden group hover:border-zinc-600 transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F1C40F]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[#F1C40F]/10 transition-colors"></div>
            <Search className="text-[#F1C40F] mb-6" size={40}/>
            <h3 className="text-2xl font-black text-white mb-4">A Regra de Ouro (Exclusiva)</h3>
            <p className="text-zinc-400 leading-relaxed font-medium max-w-md">O sistema lê a planilha, isola os cupons que a própria plataforma deu, e aplica a taxa **somente sobre o seu preço real de venda**.</p>
            <div className="mt-8 bg-[#09090b] border border-zinc-800 rounded-xl p-4 font-mono text-sm text-green-400">
              ( Preço Real - Seu Desconto ) - 20% - R$ 4,00
            </div>
          </div>

          <div className="md:col-span-1 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative group hover:border-red-900/50 transition-colors overflow-hidden">
             <AlertTriangle className="text-red-500 mb-6" size={40}/>
             <h3 className="text-2xl font-black text-white mb-4">Radar de Fretes</h3>
             <p className="text-zinc-400 leading-relaxed font-medium">Se a plataforma cobrar um centavo de logística do seu repasse indevidamente, nosso radar acende a luz vermelha na hora.</p>
          </div>

          <div className="md:col-span-1 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative group hover:border-blue-900/50 transition-colors overflow-hidden">
             <FileJson className="text-blue-500 mb-6" size={40}/>
             <h3 className="text-xl font-black text-white mb-4">Dossiês em PDF</h3>
             <p className="text-zinc-400 leading-relaxed font-medium text-sm">Achou um erro? O sistema gera um PDF oficial para você anexar direto no chat de suporte e exigir seu reembolso.</p>
          </div>

          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative overflow-hidden group hover:border-emerald-900/50 transition-colors">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <LineChart className="text-emerald-500 mb-6" size={40}/>
                <h3 className="text-2xl font-black text-white mb-4">Lucratividade Real</h3>
                <p className="text-zinc-400 leading-relaxed font-medium max-w-sm">Cadastre o custo de cada produto. O sistema calcula automaticamente o seu lucro líquido isolando as taxas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section id="planos" className="py-32 px-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-b from-zinc-900 to-[#09090b] border border-zinc-800 rounded-[3rem] p-12 text-center relative overflow-hidden">
          <Lock className="mx-auto text-zinc-600 mb-6" size={48}/>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6 relative z-10">Um investimento que <br/> se paga na primeira auditoria.</h2>
          <p className="text-zinc-400 text-lg font-medium mb-10 max-w-xl mx-auto relative z-10">Vendedores perdem de 2% a 5% do faturamento em taxas silenciosas. Nossa ferramenta recupera isso para você.</p>
          <button onClick={onLoginClick} className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] px-10 py-5 rounded-2xl text-lg font-black transition-all hover:scale-105 relative z-10">
            Criar Minha Conta Agora
          </button>
        </div>
      </section>

    </div>
  );
}