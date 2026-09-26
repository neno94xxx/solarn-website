# Solarni portal

Astro portal sa solarnim kalkulatorom i zaštićenim uredništvom. Javne informativne stranice ostaju statičke; naslovnica, arhiva i članci iz Supabasea renderiraju se na poslužitelju. Objave su odmah dostupne, a njihov tekst nalazi se u HTML-u za tražilice.

## Pokretanje

Potreban je Node 24+.

```sh
npm install
npm run dev
```

Portal: http://localhost:4321 · Administracija: http://localhost:4321/admin/

Razvojna naredba gradi aplikaciju i pokreće Node poslužitelj u radnoj niti. Izmjene izvornog koda automatski pokreću novu izgradnju; nakon toga osvježite preglednik. Izmjene sadržaja u adminu ne trebaju build. Ako promijenite `.env`, ponovno pokrenite poslužitelj.

## Supabase — zaseban projekt

Sve SQL naredbe i redoslijed koraka nalaze se u **`supabase-setup.txt`** u korijenu projekta. Nije potrebno koristiti projekt niti ključeve NBA aplikacije.

1. Kreirajte novi Supabase projekt.
2. U Authentication → Users → Add user kreirajte `ferdinand.nodilo@yahoo.com`, odaberite lozinku i označite Auto Confirm User.
3. U SQL Editor pokrenite cijeli `supabase-setup.txt`. Skripta kreira tablice, pristupna pravila, Storage bucket i dodjeljuje administratorsku ulogu navedenom računu. Može se ponovno pokrenuti.
4. Kopirajte `.env.example` u `.env` i unesite **Project URL** i **publishable key** iz novog projekta. Podržan je i stariji anon key. Service-role/secret ključ nije potreban.
5. Ponovno pokrenite `npm run dev` i prijavite se na `/admin/`.

Bez konfiguracije portal nastavlja prikazivati početne vodiče. Prijava prikazuje uputu za postavljanje; nema zaobilazne administratorske prijave.

### Uređivanje

Članak ima jedan naslov, kratak opis, naslovnu sliku i kategoriju. U sadržaj dodajte više podnaslova, tekstualnih blokova i fotografija, promijenite im redoslijed strelicama ili uklonite blok. Više fotografija možete odabrati u jednom prijenosu. Opisi slika obavezni su radi pristupačnosti.

„Spremi nacrt” čuva tekst samo za administraciju. „Objavi članak” prikazuje ga u arhivi, na vlastitom URL-u i među tri najnovija članka na naslovnici. Objavljivanje ne pokreće novu izgradnju. Naknadne izmjene su podržane; URL jednom objavljenog članka ostaje stabilan. Istodobne izmjene iz dva prozora ne prepisuju se neprimjetno. Spremanje objavljenog članka kao nacrta povlači ga s portala nakon potvrde.

Početni vodiči nalaze se u `src/data/articles.ts` i ostaju dio portala; ovo uredništvo upravlja člancima iz baze. Portal i admin trenutačno dohvaćaju do 500 članaka po popisu; prije većeg broja dodajte poslužiteljsku paginaciju i segmentiranje sitemapa.

### Podaci i pristup

- `solar_articles`: naslov, slug, opis, status, naslovna slika, redoslijed blokova i vremena izmjena.
- `solar_media`: metapodaci i varijante fotografija.
- `solar_admins`: dopušteni Supabase Auth korisnici.
- Storage `solar-articles`: javne optimizirane WebP slike; fotografije su javno dostupne putem URL-a i za nacrte. Za povjerljive fotografije treba zaseban privatni bucket.

Pri prijenosu se provjerava stvarni format, najviše 10 MB i 30 megapiksela. Fotografije se orijentiraju, smanjuju do 1600 × 1600 px, uklanjaju se metapodaci i stvaraju do tri WebP veličine. Ne prenose se izvorne velike datoteke. Zamijenjene ili uklonjene fotografije ostaju u Storageu kako se postojeći sadržaj ne bi slučajno obrisao.

Prijavu provjerava Supabase Auth. Pravo uređivanja zasebno se provjerava u `solar_admins`, na poslužitelju i kroz Postgres RLS. Klijenti koriste javni ključ; nema zaobilaženja RLS-a service-role ključem. Sesija je u HttpOnly, SameSite kolačićima, sa Secure zastavicom na HTTPS-u. Sve promjene zahtijevaju isti origin; privatni odgovori imaju `no-store`. Admin nije u sitemapu i označen je `noindex`.

## Izgradnja i produkcija

```sh
npm run build
npm start
```

Ako okruženje blokira native podprocese:

```sh
npm run build:portable
npm start
```

Prenosivi build koristi isti esbuild kompajler u WebAssemblyju. Za produkciju je sada **potreban Node hosting**, a ne samo statički hosting. Objavite `dist/`, `package.json`, lockfile i instalirajte produkcijske ovisnosti. Postavite `SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `HOST` i `PORT` u hostingu. `HOST` po potrebi postavite na `0.0.0.0`; lokalno je početno `127.0.0.1`. Koristite HTTPS preko ispravno konfiguriranog reverse proxyja. `SITE_URL` mora biti stvarna HTTPS domena već pri buildu; bez nje koristi se rezervirana demonstracijska domena `https://solarni-portal.example`.

Ne keširajte admin/API odgovore niti odgovore sa Set-Cookie. Za javni HTML cache mora uzeti u obzir objavu/povlačenje članka; početna izvedba ne koristi zajednički cache članaka. Statičkim hashiranim resursima i Storage slikama može se dodijeliti dug cache.

`robots.txt` upućuje na statički `sitemap-index.xml` i dinamički `sitemap-articles.xml`. Članci imaju canonical, naslov, opis, Open Graph i Article JSON-LD. Novi članci odmah ulaze u dinamički sitemap. Prije objave unesite podatke stvarnog izdavača i hostinga na stranicu privatnosti.

## Provjere

```sh
npm test
npm run build:portable
npm run test:admin
npm run test:site
```

`npm test` provjerava kalkulator, validaciju članka te izvršava stvarni SQL u lokalnom PostgreSQL-u (PGlite) s testnim Supabase auth/storage shemama. Provjerava RLS za gosta, običnog korisnika i administratora. `test:admin` testira HTTP tok prijave, ovlasti, spremanja, objave i prijenosa uz lokalno simuliran Supabase API, bez pravih računa ili mrežnih upisa. `test:site` zahtijeva pokrenut lokalni poslužitelj; provjerava javne rute, SEO i zaštitu admina. Ti testovi ne zamjenjuju završnu provjeru na vašem novom Supabase projektu.

Opcionalna provjera izgleda i interakcija u Chromeu: `npm run test:browser` uz pokrenuti portal i instaliran Chrome. Ako sandbox blokira pokretanje Chromea, pokrenite je u vlastitom terminalu.

## Ostalo

Informativne stranice: `src/data/pages.ts`. Kalkulator: `src/lib/calculator.mjs`, obrađuje podatke lokalno bez slanja kontakata. Izvorne fotografije: Unsplash (`photo-1508514177221-188b1cf16e9d`, `photo-1621905251189-08b45d6a269e`, `photo-1497440001374-f26997328c1b`). Javne stranice koriste lokalne fontove, responzivne slike i minimalan JavaScript.
