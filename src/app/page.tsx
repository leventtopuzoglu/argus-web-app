'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Award, 
  Sparkles, 
  Send, 
  Wallet, 
  Mail, 
  LogOut,
  Download,
  Flame,
  Lock,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface Product {
  id: number;
  title: string;
  tagline: string;
  description: string;
  link: string;
  github_or_x_target: string;
  bullish_votes: number;
  bearish_votes: number;
}

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  wallet_address?: string;
  reputation_score: number;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [sentiment, setSentiment] = useState<'bullish' | 'bearish'>('bullish');
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedProducts, setSubmittedProducts] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'radar' | 'transparency'>('radar');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Magic Link Giriş Durumları
  const [emailInput, setEmailInput] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // 1. PWA Yükleme Yakalayıcısı
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    // 2. Oturum Kontrolü & Değişiklik Dinleyicisi
    checkAuthSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncUserProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
      } else {
        setCurrentUser(null);
      }
    });

    // 3. Ürünleri Çek
    loadProducts();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function checkAuthSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await syncUserProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
    }
  }

  async function syncUserProfile(authId: string, email?: string, fullName?: string, wallet?: string) {
    const displayName = fullName || (email ? email.split('@')[0] : (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : 'Anonim Küratör'));
    
    const { data } = await supabase
      .from('users')
      .upsert({
        auth_id: authId,
        email: email || null,
        full_name: displayName,
        wallet_address: wallet || null,
        last_active: new Date().toISOString()
      }, { onConflict: 'auth_id' })
      .select('*')
      .single();

    if (data) {
      setCurrentUser(data);
    }
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active');
    if (data) setProducts(data);
  }

  // MAGIC LINK İLE GİRİŞ FONKSİYONU
  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      alert('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setAuthLoading(true);
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput.trim(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    setAuthLoading(false);

    if (error) {
      alert('Hata: ' + error.message);
    } else {
      setMagicLinkSent(true);
    }
  }

  // Web3 Cüzdan ile Giriş
  async function handleWalletLogin() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const wallet = accounts[0];
        await syncUserProfile(wallet, undefined, undefined, wallet);
      } catch (err) {
        alert('Cüzdan bağlantısı reddedildi.');
      }
    } else {
      alert('Tarayıcınızda Web3 cüzdanı bulunamadı. Lütfen E-posta ile giriş yapın.');
    }
  }

  // Çıkış Yap
  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }

  // PWA Kurulum Butonu
  function handleInstallApp() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
      });
    }
  }

  // Tahmin & İnceleme Gönderimi
  async function handleVoteSubmit(productId: number) {
    if (!currentUser) {
      setShowEmailModal(true);
      return;
    }
    if (!reviewText.trim() || reviewText.length < 15) {
      alert('Lütfen en az 15 karakterlik somut bir eleştiri/görüş yazın.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('reviews').insert({
      user_id: currentUser.id,
      product_id: productId,
      sentiment,
      review_text: reviewText,
      points_awarded: 60
    });

    if (error) {
      alert('Bu ürünü bugün zaten oyladınız!');
    } else {
      setSubmittedProducts([...submittedProducts, productId]);
      setCurrentUser(prev => prev ? { ...prev, reputation_score: prev.reputation_score + 60 } : null);
      setSelectedProductId(null);
      setReviewText('');
      alert('Görüşünüz onaylandı! +60 Küratör XP cüzdanınıza işlendi.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto flex flex-col border-x border-slate-800/60 bg-[#060913] shadow-2xl relative">
      
      {/* E-POSTA / MAGIC LINK MODAL PENCERESİ */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-slate-700/80 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl text-center">
            {magicLinkSent ? (
              <div className="space-y-3 py-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">Giriş Bağlantısı Gönderildi!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-amber-400">{emailInput}</strong> adresinize tek kullanımlık bir giriş linki gönderdik. E-postanızı açıp bağlantıya tıklayarak şifresiz giriş yapabilirsiniz.
                </p>
                <button
                  onClick={() => { setShowEmailModal(false); setMagicLinkSent(false); }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Şifresiz Giriş Yap</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    E-posta adresinizi girin, size tek tıkla oturum açacağınız güvenli bir bağlantı gönderelim.
                  </p>
                </div>

                <form onSubmit={handleSendMagicLink} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ornek@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                  >
                    {authLoading ? 'Gönderiliyor...' : 'Giriş Bağlantısı Gönder'}
                  </button>
                </form>

                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Kapat
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ÜST GEZİNTİ VE PROFİL PANELİ */}
      <header className="p-4 border-b border-slate-800/80 bg-[#0a0f1d]/95 backdrop-blur sticky top-0 z-30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-white uppercase flex items-center gap-1.5">
              ARGUS PROTOCOL
            </h1>
            <p className="text-[10px] text-amber-400 font-medium">Proof-of-Taste & AI Oracle</p>
          </div>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{currentUser.reputation_score} XP</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              title="Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
            >
              <Mail className="w-3.5 h-3.5" /> Giriş Yap
            </button>
            <button
              onClick={handleWalletLogin}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
            >
              <Wallet className="w-3.5 h-3.5" /> Cüzdan
            </button>
          </div>
        )}
      </header>

      {/* PWA ANA EKRANA EKLE ÇUBUĞU */}
      {installPrompt && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-2.5 px-4 flex justify-between items-center text-xs font-bold text-slate-950">
          <span className="flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Argus'u telefonunun ana ekranına indir!
          </span>
          <button
            onClick={handleInstallApp}
            className="bg-slate-950 text-amber-400 text-[11px] px-3 py-1 rounded-md"
          >
            Yükle
          </button>
        </div>
      )}

      {/* SEKMELER */}
      <div className="flex border-b border-slate-800/80 bg-[#070c18] text-xs font-semibold px-4 pt-2">
        <button
          onClick={() => setActiveTab('radar')}
          className={`pb-2.5 px-4 flex items-center gap-1.5 ${
            activeTab === 'radar' 
              ? 'text-amber-400 border-b-2 border-amber-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Günün Radarı (3 Ürün)
        </button>
        <button
          onClick={() => setActiveTab('transparency')}
          className={`pb-2.5 px-4 flex items-center gap-1.5 ${
            activeTab === 'transparency' 
              ? 'text-amber-400 border-b-2 border-amber-400' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Şeffaflık Paneli
        </button>
      </div>

      {/* ANA İÇERİK */}
      <main className="p-4 flex-1 space-y-4">
        {activeTab === 'radar' ? (
          <>
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed">
              💡 <strong>Nasıl Çalışır?</strong> Her gün vitrine çıkan 3 ürünü inceleyin. <span className="text-emerald-400 font-bold">Bullish</span> veya <span className="text-rose-400 font-bold">Bearish</span> tahmininizi yapıp 2 cümlelik görüşünüzü yazın. Gece yarısı havuzdan $ARGUS payı kazanın.
            </div>

            {products.map((p) => {
              const isVoted = submittedProducts.includes(p.id);
              const isSelected = selectedProductId === p.id;

              return (
                <div key={p.id} className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-base text-white tracking-tight">{p.title}</h3>
                      <p className="text-xs text-amber-400/90 font-medium">{p.tagline}</p>
                    </div>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Projeyi Ziyaret Et"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>

                  <div className="bg-slate-950/70 p-2.5 rounded-xl text-[11px] text-slate-400 border border-slate-800 flex justify-between items-center">
                    <span>🎯 7 Günlük Başarı Hedefi:</span>
                    <strong className="text-amber-300 font-mono">{p.github_or_x_target}</strong>
                  </div>

                  {isVoted ? (
                    <div className="w-full py-2.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs font-bold rounded-xl text-center">
                      ✓ Bugün Oylandı (+60 XP Eklendi)
                    </div>
                  ) : isSelected ? (
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSentiment('bullish')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            sentiment === 'bullish'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" /> Bullish (Tutar)
                        </button>
                        <button
                          onClick={() => setSentiment('bearish')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            sentiment === 'bearish'
                              ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/40'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <TrendingDown className="w-3.5 h-3.5" /> Bearish (Batar)
                        </button>
                      </div>

                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Neden bu kanaattesin? Ürünün en güçlü veya en zayıf yanı nedir? (En az 15, maks 280 karakter)"
                        maxLength={280}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-slate-500 font-mono">{reviewText.length}/280</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedProductId(null)}
                            className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                          >
                            Vazgeç
                          </button>
                          <button
                            onClick={() => handleVoteSubmit(p.id)}
                            disabled={loading}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                          >
                            <Send className="w-3 h-3" /> Gönder
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedProductId(p.id)}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
                    >
                      İncele & Tahmin Et (+60 Puan)
                    </button>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* ŞEFFAFLIK VE HAZİNE PANELİ */
          <div className="space-y-4">
            <div className="bg-[#0b1220] border border-slate-800 p-4 rounded-2xl space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" /> Zincir Üstü Hazine & Kilitler (Base Network)
              </h2>

              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                  <span className="text-slate-400">Toplam Token Arzı</span>
                  <span className="font-bold text-white font-mono">10.000.000.000 ARGUS</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                  <span className="text-slate-400">Kurucu Payı (Vesting)</span>
                  <span className="font-bold text-emerald-400 font-mono">2.000.000.000 (%20 - 12 Ay Kilitli)</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                  <span className="text-slate-400">DEX Likidite Havuzu</span>
                  <span className="font-bold text-amber-400 font-mono">2.500$ USDC + 2B ARGUS</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                  <span className="text-slate-400">LP Kilit Güvenliği</span>
                  <span className="font-bold text-emerald-400 font-mono">365 Gün Kilitli (Team Finance)</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0b1220] border border-slate-800 p-4 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" /> Buy-Back & Burn Protokolü
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Geliştiricilerin ödediği B2B listeleme gelirlerinin %25'i her ay piyasadan $ARGUS satın alınıp yakılmak için kullanılır.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ALT BİLGİ */}
      <footer className="p-4 border-t border-slate-850 bg-[#070b15] text-center text-[11px] text-slate-500">
        Argus Protocol © 2026 • Autonomous Review & Global User Sentiment
      </footer>
    </div>
  );
}
