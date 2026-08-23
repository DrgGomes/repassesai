import { ArrowRight, ShieldCheck, Database, FileJson, LineChart, Search, Lock, Zap, FileSpreadsheet, Package, AlertTriangle, CheckCircle2, Clock, Ban, Quote } from 'lucide-react';

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
            <a href="#funcionalidades" className="hover:text-white transition-colors">Tecnologia</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          </div>
          <div className="flex gap-4">
            <button onClick={onLoginClick} className="text-sm font-bold text-zinc-300 hover:text-white transition-colors hidden md:block">Acessar Painel</button>
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
          Auditoria Forense Automatizada para E-commerce
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
          Pare de perder dinheiro <br className="hidden md:block"/> para os <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F1C40F] to-yellow-600">Marketplaces.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mb-10 leading-relaxed font-medium">
          As plataformas lucram com a complexidade das planilhas. Taxas ocultas, fretes duplos e pedidos extraviados corroem o seu lucro. O Repasse.AI é a inteligência que rastreia, audita e recupera cada centavo retido.
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
              <div className="col-span-2 bg-[#09090b] border border-zinc-800 rounded-xl p-6 relative overflow-hidden text-left">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">Venda Real Processada</p>
                <p className="text-3xl font-black text-white">R$ 145.230,00</p>
                <div className="mt-4 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%] rounded-full shadow-[0_0_10px_#10b981]"></div>
                </div>
              </div>
              <div className="col-span-1 bg-gradient-to-br from-red-900/20 to-[#09090b] border border-red-900/50 rounded-xl p-6 relative text-left">
                <AlertTriangle className="absolute top-4 right-4 text-red-500/20" size={48}/>
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-2">Capital Retido (Cobrar)</p>
                <p className="text-3xl font-black text-red-500">R$ 12.430,50</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORYTELLING / A DOR REAL DO CLIENTE */}
      <section className="py-24 bg-zinc-900/30 border-y border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full mb-6 text-red-500">
                <Quote size={32} />
              </div>
              <h2 className="text-3xl font-black text-white mb-6 leading-tight">"O meu faturamento explodia todo mês, mas o meu caixa estava quebrado."</h2>
              <p className="text-zinc-400 font-medium leading-relaxed mb-6">
                Este é o relato de um dos nossos primeiros clientes. Ele vendia muito, pagava fornecedores, mas a conta não fechava. O problema não eram os custos dele, era o <b>"buraco negro" logístico</b> das plataformas.
              </p>
              <p className="text-zinc-400 font-medium leading-relaxed">
                Ao plugar o Repasse.AI, o sistema detectou <span className="text-white font-bold">142 pedidos</span> que já haviam passado de 35 dias em trânsito e foram extraviados. A plataforma "esqueceu" de pagar a indenização. O sistema não só encontrou o buraco, como gerou o relatório exato para ele recuperar <span className="text-[#F1C40F] font-bold">mais de R$ 12.000 retidos.</span>
              </p>
            </div>
            <div className="md:w-1/2 w-full">
              <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Violações de SLA Detectadas</h3>
                
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-zinc-500 font-mono mb-1">ID: 17652268416{i}4</p>
                        <p className="text-sm font-bold text-zinc-300">Extraviado (> 35 dias)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-500 font-black">R$ 89,90</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase">Indenização Pendente</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE SOLUTION (COMPLEXIDADE ESCONDIDA / BENTO GRID) */}
      <section id="funcionalidades" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">A caixa preta foi aberta.</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg font-medium">As plataformas misturam Subsídios Conjuntos, Co-participações e Cupons de Loja para maquiar o seu repasse. Nossa I.A processa matrizes com dezenas de colunas, isola a "maquiagem financeira" e extrai a verdade nua e crua em milissegundos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative overflow-hidden group hover:border-zinc-600 transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F1C40F]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[#F1C40F]/10 transition-colors"></div>
            <Search className="text-[#F1C40F] mb-6" size={40}/>
            <h3 className="text-2xl font-black text-white mb-4">Motor Forense de Reconciliação</h3>
            <p className="text-zinc-400 leading-relaxed font-medium max-w-md">O sistema não faz "continhas de mais e menos". Ele analisa o preço base do seu ERP, abate estritamente as subvenções comerciais autorizadas e impede que as taxas incidam sobre os cupons que a própria plataforma distribuiu.</p>
            <div className="mt-8 flex items-center gap-3 overflow-hidden whitespace-nowrap opacity-60 text-xs font-mono">
              <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400">[EXTRATO BRUTO]</span> <ArrowRight size={14} className="text-zinc-600"/>
              <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400">[ISOLA SUBSÍDIO]</span> <ArrowRight size={14} className="text-zinc-600"/>
              <span className="bg-emerald-900/30 border border-emerald-800 px-3 py-1.5 rounded-lg text-emerald-500">[LUCRO AUDITADO]</span>
            </div>
          </div>

          <div className="md:col-span-1 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative group hover:border-red-900/50 transition-colors overflow-hidden">
             <AlertTriangle className="text-red-500 mb-6" size={40}/>
             <h3 className="text-2xl font-black text-white mb-4">Radar de Fretes Ocultos</h3>
             <p className="text-zinc-400 leading-relaxed font-medium">O frete é do cliente. Se a plataforma deduzir tarifas logísticas duplicadas do seu repasse de forma silenciosa, o radar expõe a falha na hora.</p>
          </div>

          <div className="md:col-span-1 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative group hover:border-zinc-700 transition-colors overflow-hidden">
             <Ban className="text-zinc-300 mb-6" size={40}/>
             <h3 className="text-xl font-black text-white mb-4">Quarentena Logística</h3>
             <p className="text-zinc-400 leading-relaxed font-medium text-sm">Pedidos Cancelados ou Devolvidos são interceptados e isolados do dashboard principal, impedindo que criem uma ilusão de faturamento que não existe.</p>
          </div>

          <div className="md:col-span-1 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative group hover:border-blue-900/50 transition-colors overflow-hidden">
             <Clock className="text-blue-500 mb-6" size={40}/>
             <h3 className="text-xl font-black text-white mb-4">Previsão de Recebíveis</h3>
             <p className="text-zinc-400 leading-relaxed font-medium text-sm">Saiba o que está no "Pipeline". Controlamos exatamente o que foi enviado e organizamos a fila de pagamento respeitando os ciclos (D+22, etc) de cada plataforma.</p>
          </div>

          <div className="md:col-span-1 bg-gradient-to-br from-zinc-900 to-[#09090b] border border-zinc-800 rounded-3xl p-10 relative group hover:border-[#F1C40F]/50 transition-colors overflow-hidden">
             <FileJson className="text-[#F1C40F] mb-6" size={40}/>
             <h3 className="text-xl font-black text-white mb-4">Dossiês de Cobrança</h3>
             <p className="text-zinc-400 leading-relaxed font-medium text-sm">Encontrou um erro de repasse? O SaaS gera a prova real: um relatório em PDF ou Excel blindado para você anexar e exigir sua indenização no suporte.</p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA (STEPS) */}
      <section id="como-funciona" className="py-20 border-t border-zinc-800/50 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center text-white mb-20">Tempo é dinheiro. Não desperdice nenhum dos dois.</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
             <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800"></div>

             <div className="relative flex flex-col items-center text-center z-10">
                <div className="w-20 h-20 bg-zinc-900 border-2 border-zinc-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl text-zinc-400">
                   <Package size={32}/>
                </div>
                <h3 className="text-xl font-black text-white mb-3">1. Alimente o Sistema</h3>
                <p className="text-zinc-500 font-medium text-sm px-4">Basta subir os arquivos de exportação crua (ERP e Finanças). O sistema padroniza, estrutura e cruza os Tracking IDs sozinho.</p>
             </div>

             <div className="relative flex flex-col items-center text-center z-10">
                <div className="w-20 h-20 bg-[#F1C40F] border-2 border-[#d4ac0d] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(241,196,15,0.3)] text-[#09090b] transform scale-110">
                   <Zap size={32}/>
                </div>
                <h3 className="text-xl font-black text-white mb-3">2. Automação Forense</h3>
                <p className="text-zinc-500 font-medium text-sm px-4">Adeus PROCVs lentos. Em 4 segundos, nossa tecnologia calcula os descontos, as taxas logísticas e as obrigações de repasse.</p>
             </div>

             <div className="relative flex flex-col items-center text-center z-10">
                <div className="w-20 h-20 bg-zinc-900 border-2 border-zinc-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl text-zinc-400">
                   <LineChart size={32}/>
                </div>
                <h3 className="text-xl font-black text-white mb-3">3. DRE Inteligente</h3>
                <p className="text-zinc-500 font-medium text-sm px-4">Tenha acesso a um balanço financeiro transparente, sabendo exatamente o que pagou o custo do produto e o que virou lucro líquido.</p>
             </div>
          </div>
        </div>
      </section>

      {/* CTA / PRICING */}
      <section id="planos" className="py-32 px-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-b from-zinc-900 to-[#09090b] border border-zinc-800 rounded-[3rem] p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[#F1C40F] opacity-[0.03]"></div>
          <Lock className="mx-auto text-zinc-600 mb-6" size={48}/>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6 relative z-10">Um sistema de inteligência que <br/> se paga na primeira auditoria.</h2>
          <p className="text-zinc-400 text-lg font-medium mb-10 max-w-xl mx-auto relative z-10">Grandes operações de E-commerce operam às cegas. Assuma o controle total do seu caixa e recupere o que é seu por direito.</p>
          
          <button onClick={onLoginClick} className="bg-[#F1C40F] hover:bg-[#d4ac0d] text-[#09090b] px-10 py-5 rounded-2xl text-lg font-black transition-all shadow-[0_0_30px_rgba(241,196,15,0.3)] hover:scale-105 relative z-10">
            Acessar o Workspace Agora
          </button>
          <p className="text-zinc-600 mt-6 text-sm font-semibold relative z-10 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-green-500"/> Planos flexíveis. Cancelamento descomplicado. Criptografia de ponta a ponta.
          </p>
        </div>
      </section>

      {/* FOOTER OFICIAL */}
      <footer className="border-t border-zinc-800/50 py-12 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center justify-center gap-2">
              <ShieldCheck size={20} className="text-[#F1C40F]" />
              <span className="text-lg font-black tracking-widest text-white">REPASSE<span className="text-[#F1C40F]">.AI</span></span>
            </div>
            <div className="text-zinc-600 text-xs font-medium text-center md:text-right space-y-1">
              <p>© 2026 Repasse.AI — Tecnologia em Auditoria e Reconciliação Financeira.</p>
              <p>CNPJ: 67.625.042/0001-99. Todos os direitos reservados.</p>
            </div>
        </div>
      </footer>

    </div>
  );
}