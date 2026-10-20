# ARGUS PROTOCOL - BAĞIMSIZ WEB UYGULAMASI (PWA)

Bu paket, Telegram botuna ve Telegram ekosistemine ihtiyaç duymadan, doğrudan internet tarayıcıları ve mobil cihazlar üzerinden çalışan bağımsız Web3 uygulamasını içerir.

## Özellikler:
1. **Google ile Giriş (OAuth):** Kullanıcılar tek tıkla şifresiz giriş yapar.
2. **Web3 Cüzdan ile Giriş:** MetaMask, Rabby, Coinbase Wallet ile tek tıkla bağlanma.
3. **PWA (Progressive Web App):** Mobil kullanıcılar siteye girdiğinde "Uygulamayı Ana Ekrana Ekle" uyarısı alır ve telefonlarına yerel uygulama gibi ikon eklenir.
4. **Supabase Veritabanı:** Users, Products ve Reviews tabloları hazır.

## 5 Dakikada Canlıya Alma Adımları:

### 1. Supabase Kurulumu:
1. [supabase.com](https://supabase.com) adresine gidin ve ücretsiz proje açın.
2. **SQL Editor** bölümüne `supabase/schema.sql` dosyasının içeriğini yapıştırıp **RUN** butonuna basın.
3. **Authentication -> Providers** sekmesinden **Google**'ı aktif edin (Client ID ve Secret girin).
4. **Project Settings -> API** bölümünden `Project URL` ve `anon public` anahtarlarınızı alın.

### 2. Vercel ile Yayına Alma:
1. Bu klasörü GitHub reponuza yükleyin.
2. [vercel.com](https://vercel.com) üzerinde projeyi import edin.
3. Environment Variables kısmına:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Supabase URL'iniz)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase Anon Key'iniz)
4. **Deploy** butonuna basın. Siteniz saniyeler içinde `https://argusprotocol.vercel.app` şeklinde tüm dünyaya açılacaktır!
