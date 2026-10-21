'use client';

import React, { useEffect, useState } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Compass, 
  PlusSquare, 
  User, 
  Home as HomeIcon, 
  Sparkles, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  Key, 
  Wallet, 
  X,
  Trash2,
  FileText,
  AlertTriangle
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
  author_name?: string;
  avatar_url?: string;
  bg_gradient?: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userScore, setUserScore] = useState<number>(100);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'transparency' | 'profile'>('feed');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [sentiment, setSentiment] = useState<'bullish' | 'bearish'>('bullish');
  const [submittedProducts, setSubmittedProducts] = useState<number[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    checkSession();
    loadProducts();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setUserScore(100);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      loadUserProfile(session.user.id);
    }
  }

  async function loadUserProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('reputation_score')
      .eq('id', userId)
      .single();
    if (data) {
      setUserScore(data.reputation_score);
    }
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*');
    if (data && data.length > 0) {
      const gradients = [
        'from-blue-900/80 via-slate-900 to-black',
        'from-purple-950/80 via-slate-900 to-black',
        'from-emerald-950/80 via-slate-900 to-black'
      ];
      const enriched = data.map((p, idx) => ({
        ...p,
        author_name: idx === 0 ? 'vllm_project' : idx === 1 ? 'cursor_ai' : 'aerodrome_fi',
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${p.title}`,
        bg_gradient: gradients[idx % gradients.length]
      }));
      setProducts(enriched);
    }
  }

  function isSpam(text: string): boolean {
    const trimmed = text.trim();
    if (/(.)\1{3,}/i.test(trimmed)) return true;
    const words = trimmed.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length >= 4 && uniqueWords.size <= 2) return true;
    return false;
  }

  async function handleReviewSubmit() {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const trimmed = reviewText.trim();
    if (trimmed.length < 15 || trimmed.length > 280) {
      alert('Lütfen en az 15, en fazla 280 karakterlik somut bir değerlendirme yazın.');
      return;
    }

    if (isSpam(trimmed)) {
      alert('Güvenlik Uyarısı: Tekrarlayan ve anlamsız spam ifadeler onaylanmaz. Lütfen somut bir görüş yazın.');
      return;
    }

    if (!selectedProduct) return;

    setSubmittingReview(true);

    const { error } = await supabase.rpc('submit_curator_review', {
      p_product_id: selectedProduct.id,
      p_sentiment: sentiment,
      p_review_text: trimmed
    });

    setSubmittingReview(false);

    if (error) {
      alert('İşlem başarısız: ' + error.message);
    } else {
      setSubmittedProducts([...submittedProducts, selectedProduct.id]);
      setUserScore(prev => prev + 60);
      setSelectedProduct(null);
      setReviewText('');
      alert('✓ İncelemeniz ve tahmininiz güvenle kaydedildi! +60 XP eklendi.');
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim() || passwordInput.length < 6) {
      alert('Lütfen geçerli bir e-posta ve en az 6 haneli şifre girin.');
      return;
    }

    setAuthLoading(true);

    if (authMode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });

      setAuthLoading(false);
      if (error) {
        alert('Giriş başarısız: ' + error.message + '\nHesabınız yoksa "Kayıt Ol" seçeneğini kullanın.');
      } else {
        setCurrentUser(data.user);
        setShowAuthModal(false);
        setEmailInput('');
        setPasswordInput('');
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: emailInput.trim(),
        password: passwordInput,
      });

      setAuthLoading(false);
      if (error) {
        alert('Kayıt hatası: ' + error.message);
      } else {
        setCurrentUser(data.user);
        setShowAuthModal(false);
        alert('Hesabınız başarıyla oluşturuldu ve oturum açıldı!');
      }
    }
  }

  async function handleWalletLogin() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const wallet = accounts[0];
        setCurrentUser({ id: wallet, email: `${wallet.slice(0, 6)}...${wallet.slice(-4)}` });
        setShowAuthModal(false);
      } catch (err) {
        alert('Cüzdan bağlantısı reddedildi.');
      }
    } else {
      alert('MetaMask cüzdanı bulunamadı. Lütfen e-posta ile giriş yapın.');
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
  }

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm('Hesabınızı ve tüm kazanılan puanlarınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmDelete) return;

    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      alert('Hesap silinirken hata: ' + error.message);
    } else {
      await supabase.auth.signOut();
      setCurrentUser(null);
      alert('Hesabınız ve tüm verileriniz kalıcı olarak silindi.');
    }
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-black text-white flex flex-col font-sans select-none relative overflow-x-hidden border-x border-neutral-900">
      
      {/* ÜST BAR */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-neutral-900/80 sticky top-0 bg-black/90 backdrop-blur z-30">
        <div className="flex items-center gap-1.5 cursor-pointer">
          <span className="font-serif italic font-extrabold text-2xl tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            Argus
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-full ml-1">
            Radar
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 text-xs text-amber-400 font-bold">
              <Award className="w-3.5 h-3.5" /> {userScore} XP
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold px-3.5 py-1.5 rounded-full shadow active:scale-95 transition-transform"
            >
              Giriş Yap
            </button>
          )}
          <Heart className="w-6 h-6 text-white cursor-pointer active:scale-90 transition-transform" />
        </div>
      </header>

      {/* HİKAYELER */}
      <section className="py-2.5 px-3 border-b border-neutral-900 overflow-x-auto no-scrollbar flex gap-3.5 bg-neutral-950/40">
        <div className="flex flex-col items-center gap-1 min-w-[62px]">
          <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 cursor-pointer active:scale-95 transition-transform">
            <div className="w-full h-full rounded-full bg-black p-[2px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <span className="text-[11px] text-neutral-300 truncate w-14 text-center">Günün 3'ü</span>
        </div>

        {products.map((p) => (
          <div 
            key={p.id} 
            onClick={() => setSelectedProduct(p)}
            className="flex flex-col items-center gap-1 min-w-[62px] cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 to-emerald-400">
              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden">
                <img src={p.avatar_url} alt={p.title} className="w-10 h-10 object-cover" />
              </div>
            </div>
            <span className="text-[11px] text-neutral-400 truncate w-14 text-center">
              {p.author_name}
            </span>
          </div>
        ))}
      </section>

      {/* AKIŞ VE SEKMELER */}
      <main className="flex-1 pb-16">
        {activeTab === 'feed' ? (
          <div className="divide-y divide-neutral-900">
            {products.map((p) => {
              const isVoted = submittedProducts.includes(p.id);

              return (
                <article key={p.id} className="relative flex flex-col bg-neutral-950">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 to-rose-500">
                        <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                          <img src={p.avatar_url} alt={p.title} className="w-7 h-7" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-white">{p.author_name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
                        </div>
                        <p className="text-[10px] text-neutral-400">{p.title}</p>
                      </div>
                    </div>

                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1 border border-neutral-700"
                    >
                      İncele <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Dikey Reels Kartı */}
                  <div className={`w-full aspect-[4/5] bg-gradient-to-b ${p.bg_gradient} relative p-6 flex flex-col justify-between overflow-hidden shadow-inner`}>
                    <div className="flex justify-between items-start z-10">
                      <span className="bg-black/60 backdrop-blur border border-amber-500/30 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        ⚡ Günün Radarı #0{p.id}
                      </span>
                      <span className="bg-neutral-900/80 backdrop-blur text-neutral-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-neutral-800">
                        Hedef: {p.github_or_x_target}
                      </span>
                    </div>

                    <div className="z-10 space-y-2 text-left">
                      <h2 className="text-2xl font-black tracking-tight text-white drop-shadow">
                        {p.title}
                      </h2>
                      <p className="text-sm font-medium text-amber-200/90 drop-shadow-sm">
                        {p.tagline}
                      </p>
                      <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed drop-shadow-sm">
                        {p.description}
                      </p>
                    </div>

                    <div className="z-10 pt-4">
                      {isVoted ? (
                        <div className="w-full py-2.5 bg-emerald-950/80 border border-emerald-600 text-emerald-400 text-xs font-bold rounded-xl text-center backdrop-blur">
                          ✓ Tahmininiz Kaydedildi (+60 XP)
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedProduct(p); setSentiment('bullish'); }}
                            className="flex-1 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg backdrop-blur transition-all"
                          >
                            <TrendingUp className="w-4 h-4" /> Bullish (Tutar)
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(p); setSentiment('bearish'); }}
                            className="flex-1 py-2.5 bg-rose-600/90 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg backdrop-blur transition-all"
                          >
                            <TrendingDown className="w-4 h-4" /> Bearish (Batar)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between text-neutral-300">
                    <div className="flex items-center gap-4">
                      <Heart className="w-6 h-6 hover:text-rose-500 active:scale-125 transition-all cursor-pointer" />
                      <MessageCircle 
                        onClick={() => setSelectedProduct(p)}
                        className="w-6 h-6 hover:text-amber-400 active:scale-125 transition-all cursor-pointer" 
                      />
                      <Send className="w-6 h-6 hover:text-blue-400 active:scale-125 transition-all cursor-pointer" />
                    </div>
                    <Bookmark className="w-6 h-6 hover:text-amber-400 active:scale-125 transition-all cursor-pointer" />
                  </div>

                  <div className="px-4 pb-3 space-y-1 text-xs">
                    <p className="font-bold text-white">{1400 + p.bullish_votes + p.bearish_votes} Küratör Oyladı</p>
                    <p className="text-neutral-400">
                      <strong className="text-neutral-200">argus_oracle:</strong> Bu projenin GitHub taahhütleri ve topluluk ilgisi yükseliş trendinde.
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : activeTab === 'transparency' ? (
          <div className="p-4 space-y-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Şeffaflık & Hazine (Base On-Chain)
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-black border border-neutral-800">
                  <span className="text-neutral-400">Toplam Token Arzı:</span>
                  <span className="font-mono font-bold">10.000.000.000 ARGUS</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-black border border-neutral-800">
                  <span className="text-neutral-400">Kurucu Payı:</span>
                  <span className="font-mono text-emerald-400">2B (%20 - 12 Ay Kilitli)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-black border border-neutral-800">
                  <span className="text-neutral-400">DEX Likiditesi:</span>
                  <span className="font-mono text-amber-400">2.500$ USDC + 2B ARGUS</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 leading-relaxed space-y-1">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Yasal ve Finansal Sorumluluk Reddi
              </div>
              <p>
                Argus Protocol bir yatırım tavsiyesi, borsa aracı kurumu veya bahis platformu değildir. Platform içi puanlar (XP) ve $ARGUS yalnızca kürasyon ve değerlendirme amacıyla kullanılan bir fayda (utility) aracıdır.
              </p>
            </div>
          </div>
        ) : (
          /* PROFİL SAYFASI */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base">{currentUser ? (currentUser.email || 'Küratör') : 'Misafir Kullanıcı'}</h3>
              <p className="text-xs text-amber-400 font-medium">Toplam İtibar: {userScore} XP</p>
            </div>

            {currentUser ? (
              <div className="space-y-2 pt-4 border-t border-neutral-900">
                <button 
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-xl text-neutral-200"
                >
                  Oturumu Kapat
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full py-2 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-950/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hesabımı ve Verilerimi Kalıcı Olarak Sil
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl shadow"
              >
                Giriş Yap / Kayıt Ol
              </button>
            )}

            <div className="pt-4 border-t border-neutral-900">
              <button
                onClick={() => setShowTermsModal(true)}
                className="text-[11px] text-neutral-500 hover:text-neutral-400 flex items-center justify-center gap-1 mx-auto"
              >
                <FileText className="w-3 h-3" /> Kullanım Şartları & Gizlilik Bildirimi
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ALT BAR */}
      <nav className="h-14 bg-black border-t border-neutral-900 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-center justify-around z-40 px-2">
        <button onClick={() => setActiveTab('feed')} className={`p-1 ${activeTab === 'feed' ? 'text-white' : 'text-neutral-500'}`}>
          <HomeIcon className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('explore')} className={`p-1 ${activeTab === 'explore' ? 'text-white' : 'text-neutral-500'}`}>
          <Compass className="w-6 h-6" />
        </button>
        <button onClick={() => { if (products.length > 0) setSelectedProduct(products[0]); }} className="p-1 text-neutral-400 hover:text-white">
          <PlusSquare className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('transparency')} className={`p-1 ${activeTab === 'transparency' ? 'text-emerald-400' : 'text-neutral-500'}`}>
          <ShieldCheck className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('profile')} className={`p-1 ${activeTab === 'profile' ? 'text-white' : 'text-neutral-500'}`}>
          <User className="w-6 h-6" />
        </button>
      </nav>

      {/* GÜVENLİ OYLAMA MODALI */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">İncele & Tahmin Et</h3>
                <p className="text-xs text-amber-400">{selectedProduct.title}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-1 rounded-full bg-neutral-800 text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSentiment('bullish')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
                  sentiment === 'bullish' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Bullish (Tutar)
              </button>
              <button
                onClick={() => setSentiment('bearish')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
                  sentiment === 'bearish' ? 'bg-rose-600 text-white border-rose-500' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <TrendingDown className="w-4 h-4" /> Bearish (Batar)
              </button>
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Ürünün en güçlü veya en zayıf yanı nedir? Neden tutar veya batar? (En az 15 karakter)"
              rows={3}
              maxLength={280}
              className="w-full bg-black border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />

            <button
              onClick={handleReviewSubmit}
              disabled={submittingReview}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl disabled:opacity-50 transition-all"
            >
              {submittingReview ? 'Onaylanıyor...' : 'Görüşü ve Tahmini Gönder (+60 XP)'}
            </button>
          </div>
        </div>
      )}

      {/* ŞİFRELİ GİRİŞ / KAYIT MODALI */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto">
              <Key className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-base text-white">
                {authMode === 'signin' ? 'Argus Hesabına Giriş Yap' : 'Yeni Küratör Hesabı Aç'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                E-posta ve şifrenizi belirleyin, onay beklemeden anında başlayın.
              </p>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="E-posta adresiniz"
                className="w-full bg-black border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
              <input
                type="password"
                required
                minLength={6}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Şifreniz (En az 6 karakter)"
                className="w-full bg-black border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {authLoading ? 'İşleniyor...' : (authMode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              {authMode === 'signin' ? (
                <span>Hesabınız yok mu? <button onClick={() => setAuthMode('signup')} className="text-amber-400 font-bold hover:underline">Kayıt Ol</button></span>
              ) : (
                <span>Zaten hesabınız var mı? <button onClick={() => setAuthMode('signin')} className="text-amber-400 font-bold hover:underline">Giriş Yap</button></span>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <button
                onClick={handleWalletLogin}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400" /> Web3 Cüzdan ile Bağlan
              </button>
            </div>

            <button onClick={() => setShowAuthModal(false)} className="text-xs text-neutral-500 hover:text-neutral-300">
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* YASAL KOŞULLAR MODALI */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-sm space-y-3 text-left">
            <h3 className="font-bold text-sm text-white">Kullanım Koşulları & KVKK</h3>
            <div className="text-[11px] text-neutral-400 space-y-2 max-h-60 overflow-y-auto leading-relaxed">
              <p>1. Argus Protocol, kullanıcılarına dijital ürünleri inceleme ve topluluk tahmini yapma imkanı sunar.</p>
              <p>2. Kazanılan itibar puanları (XP), hile veya bot kullanımı tespit edildiğinde iptal edilebilir.</p>
              <p>3. Kullanıcı dilediği an profil sekmesinden hesabını ve tüm ilişkili verilerini tek tıkla kalıcı olarak silebilir.</p>
            </div>
            <button 
              onClick={() => setShowTermsModal(false)}
              className="w-full py-2 bg-neutral-800 text-xs font-bold text-white rounded-xl"
            >
              Anladım
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
