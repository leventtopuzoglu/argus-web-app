-- ========================================================
-- ARGUS PROTOCOL - BAĞIMSIZ WEB UYGULAMASI (SUPABASE ŞEMASI)
-- ========================================================

-- 1. Kullanıcılar Tablosu (Google, E-posta veya Web3 Cüzdan)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id TEXT UNIQUE, -- Supabase auth.users ID veya Cüzdan Adresi
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    wallet_address TEXT,
    reputation_score INT DEFAULT 100,
    tier TEXT DEFAULT 'Gözlemci (Tier 1)',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Günün Radarındaki Ürünler
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL,
    github_or_x_target TEXT,
    status TEXT DEFAULT 'active',
    bullish_votes INT DEFAULT 0,
    bearish_votes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mikro İncelemeler ve Tahminler Tablosu
CREATE TABLE IF NOT EXISTS public.reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id INT REFERENCES public.products(id) ON DELETE CASCADE,
    sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish')) NOT NULL,
    review_text VARCHAR(280) NOT NULL,
    points_awarded INT DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Örnek Başlangıç Ürünleri
INSERT INTO public.products (title, tagline, description, link, github_or_x_target)
VALUES 
('vLLM Inference Engine', 'LLM Servisi İçin En Hızlı Açık Kaynak Çıkarım Motoru', 'vLLM, PagedAttention algoritması ile GPU bellek kullanımını optimize eden küresel kütüphane.', 'https://github.com/vllm-project/vllm', '+300 Github Stars in 7 Days'),
('Cursor AI IDE', 'Yazılımcılar İçin Otonom Yapay Zekâ Kod Editörü', 'Tüm kod tabanını tarayarak çoklu dosyalarda anında mimari düzenleme yapan yeni nesil editör.', 'https://cursor.com', '+500 X Mentions in 7 Days'),
('Aerodrome DEX', 'Base Ağındaki En Yüksek Hacimli Likidite Merkezi', 'Düşük kayma (slippage) ve minimum işlem ücretiyle Base zincirinin amiral gemisi takas protokolü.', 'https://aerodrome.finance', '+1M TVL in 7 Days')
ON CONFLICT DO NOTHING;

-- RLS Güvenlik Politikaları
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public Read Users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public Upsert Users" ON public.users FOR ALL USING (true);
CREATE POLICY "Public Insert Reviews" ON public.reviews FOR INSERT WITH CHECK (true);
