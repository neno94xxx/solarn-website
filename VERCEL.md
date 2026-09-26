# Objava na Vercelu

Projekt automatski koristi Vercel adapter kada je `VERCEL=1`; lokalno ostaje Node adapter. Nije potrebna promjena Supabase projekta. Administrator se prijavljuje putem Supabase Auth kolacica; aplikacija ne koristi Astro Sessions API niti lokalnu datotecnu pohranu sesije.

## 1. GitHub

Posaljite aktualni kod i package-lock.json na GitHub. `.env`, `.vercel`, build, node_modules i lokalne Supabase SQL skripte nisu za Git.
Ako Git jos prati SQL skriptu, prije commita pokrenite `git rm --cached --ignore-unmatch -- supabase-setup.txt supabase-update-delete-articles.txt`. Lokalne kopije ostaju sacuvane.

## 2. Novi projekt

Na https://vercel.com/new povezite GitHub i uvezite `neno94xxx/solarn-website`.

- Framework Preset: Astro
- Root Directory: korijen repozitorija (pocetna vrijednost)
- Build Command: `npm run build`
- Install Command: automatski (npm)
- Output Directory: automatski; ne upisivati `dist/client`
- Node.js: 24.x (odredjeno i u package.json)
- Production Branch: main

Nemojte postavljati `npm start` kao build naredbu. Vercel pokrece generirane funkcije, ne lokalni dugotrajni server.

## 3. Environment Variables

U Production okruzenje kopirajte vrijednosti iz lokalnog `.env`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (ili `SUPABASE_ANON_KEY` ako koristite stari anon kljuc)

Bez prefiksa NEXT_PUBLIC_ ili PUBLIC_. Ne dodavati service_role, secret kljuc ni administratorsku lozinku.

`SITE_URL` za prvu objavu mozete izostaviti: koristi se sistemski `VERCEL_PROJECT_PRODUCTION_URL`. U postavkama trebaju biti ukljucene automatske System Environment Variables (zadano ukljucene). Nemojte kopirati lokalni SITE_URL=http://localhost:4321 na Vercel. Kada dodate stvarnu domenu, postavite `SITE_URL=https://vasa-domena.hr` i napravite Redeploy.

Preview objave mogu koristiti zaseban testni Supabase projekt. Ako im date iste vrijednosti kao Production, njihov admin mijenja istu stvarnu bazu. Ne kopirajte produkcijske vrijednosti u Preview ako to ne zelite.

## 4. Deploy i provjera

Kliknite Deploy. Nakon statusa Ready otvorite produkcijsku adresu projekta, ne privremenu adresu pojedinog builda.

- Naslovnica, clanci i kalkulator moraju se otvoriti.
- Na /admin/ provjerite prijavu, spremanje nacrta, objavu, sliku do 1 MB i brisanje testnog clanka.
- Objavljen clanak mora biti na naslovnici i u /sitemap-articles.xml.
- /robots.txt i sitemapovi moraju koristiti javnu HTTPS adresu, nikad localhost.
- Provjerite naslovnu i slike pocetnih vodica (Astro optimizacija) te slike iz Supabasea.
- Prije promoviranja testne stranice provjerite da produkcija nije zasticena Vercel prijavom i nema noindex. Preview objave zadrzite zasticenima.

Ako build padne, otvorite Build Logs i podijelite prvu gresku (bez tajnih vrijednosti). Lokalni portable build nije dokaz da je udaljeni deployment uspio.

## 5. Domena i Supabase

U Vercel Settings > Domains dodajte domenu i kod registrara unesite tocno DNS zapise koje Vercel prikaze. Nakon provjere HTTPS-a postavite SITE_URL i ponovno objavite. Odaberite jednu glavnu domenu (s www ili bez) i ostale preusmjerite na nju.

U Supabase Authentication > URL Configuration postavite Site URL na glavnu HTTPS adresu. Postojeca prijava e-mailom i lozinkom nema OAuth callback; za buduce resetiranje lozinke/OAuth dodat cemo tocne redirect URL-ove. U aplikaciji je vec obavezna potvrda administratorske uloge, ne samo postojanje Auth racuna.

Nakon toga povezite Search Console, predajte sitemapove i izmjerite PageSpeed/Core Web Vitals. Administracija je noindex i nije u sitemapovima.

## Napomene

Vercel Functions ogranicavaju zahtjev na 4,5 MB; aplikacija prihvaca jednu izvornu sliku do 1 MB i sprema optimizirane varijante do 100 KB. Fotografije pri visestrukom odabiru salju se pojedinacno. ISR nije ukljucen, pa objave i brisanje clanaka ne cekaju istek zajednickog cachea.

Hobby je za osobnu nekomercijalnu upotrebu; za poslovni portal odaberite odgovarajuci placeni plan. Supabase se placa i konfigurira zasebno.

Sluzbene upute: https://docs.astro.build/en/guides/integrations-guide/vercel/ i https://vercel.com/docs/environment-variables/system-environment-variables
