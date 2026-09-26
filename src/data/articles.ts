import landscape from '../assets/solar-landscape.jpg';
import installation from '../assets/installation.jpg';
import panels from '../assets/solar-panels.jpg';

export const articles = [
  {
    slug: 'solarni-paneli-za-obiteljsku-kucu', category: 'Vodiči', date: '2026-09-23', dateLabel: '23. rujna 2026.', read: 6,
    title: 'Solarni paneli za obiteljsku kuću: od ideje do vlastite energije',
    description: 'Što trebate znati prije ugradnje? Donosimo pregled koraka, od procjene krova do priključenja elektrane.',
    image: landscape, alt: 'Solarni paneli u zelenom krajoliku obasjani suncem',
    sections: [
      ['Počnite od vlastite potrošnje', 'Prikupite račune za električnu energiju za posljednjih dvanaest mjeseci. Godišnja potrošnja u kWh bolja je polazna točka od iznosa jednog računa. Zabilježite i kada trošite najviše energije: elektrana najveći dio energije proizvodi tijekom dana.'],
      ['Provjerite je li krov spreman', 'Orijentacija, nagib, zasjenjenje i raspoloživa površina utječu na proizvodnju. Stanje pokrova i nosivost treba provjeriti stručna osoba. Ako planirate obnovu krova, uskladite je s ugradnjom panela kako biste izbjegli kasnije uklanjanje opreme.'],
      ['Usporedite cjelovite ponude', 'Ponuda treba jasno navesti snagu i modele panela, izmjenjivač, konstrukciju, zaštitnu opremu, projektiranje, montažu i uvjete jamstva. Zatražite procjenu godišnje proizvodnje za svoju lokaciju te provjerite što je uključeno u navedenu cijenu.'],
      ['Projekt i priključenje', 'Ovlašteni projektant i operator distribucijskog sustava mogu potvrditi tehničke uvjete za vašu lokaciju. Aktualni postupak priključenja provjerite izravno kod HEP ODS-a prije naručivanja opreme. Ovaj pregled nije zamjena za projekt ili uvjete operatora.'],
    ], source: 'https://www.hep.hr/ods/', sourceLabel: 'HEP ODS – informacije o priključenju',
  },
  {
    slug: 'kako-pripremiti-dokumentaciju-za-poticaje', category: 'Poticaji', date: '2026-09-21', dateLabel: '21. rujna 2026.', read: 4,
    title: 'Poticaji za solarne elektrane: kako se pripremiti za prijavu',
    description: 'Pripremite se na vrijeme. Saznajte gdje pratiti javne pozive i na što obratiti pozornost u dokumentaciji.',
    image: panels, alt: 'Fotonaponski paneli za proizvodnju obnovljive energije',
    sections: [
      ['Pratite izvorne objave', 'Uvjeti sufinanciranja ovise o pojedinom javnom pozivu. Pratite službenu stranicu Fonda za zaštitu okoliša i energetsku učinkovitost te svoju općinu, grad ili županiju. Ovaj članak ne potvrđuje da je trenutačno otvoren poziv niti jamči potporu.'],
      ['Pročitajte uvjete prije ulaganja', 'U pozivu provjerite prihvatljive prijavitelje, vrste troškova, razdoblje nastanka troška, rok prijave i način podnošenja. Posebno provjerite može li ulaganje započeti prije prijave i traži li se dokaz o završenoj ugradnji.'],
      ['Organizirajte dokumentaciju', 'Ovisno o pozivu, mogu se tražiti podaci o vlasništvu i zakonitosti zgrade, projektna dokumentacija, ponude, računi ili potvrde operatora. Točan i konačan popis uvijek preuzmite iz dokumentacije konkretnog poziva.'],
      ['Izračunajte ulaganje i bez potpore', 'Najprije procijenite opravdanost elektrane bez subvencije. U kalkulator unesite potporu tek kada znate iznos na koji imate pravo. Tako možete usporediti oba scenarija i izbjeći oslanjanje na neodobrena sredstva.'],
    ], source: 'https://www.fzoeu.hr/', sourceLabel: 'FZOEU – službene objave i javni pozivi',
  },
  {
    slug: 'odabir-snage-solarne-elektrane', category: 'Savjeti', date: '2026-09-18', dateLabel: '18. rujna 2026.', read: 5,
    title: 'Kako odabrati pravu snagu solarne elektrane?',
    description: 'Veća elektrana nije uvijek bolji izbor. Uskladite proizvodnju s potrošnjom i mogućnostima svojeg krova.',
    image: installation, alt: 'Stručnjak pri izvođenju elektroinstalacijskih radova',
    sections: [
      ['Razlika između kW i kWh', 'Kilovat (kW) označava snagu, a kilovatsat (kWh) količinu energije. Nazivna snaga panela obično se izražava u kWp. Dvije elektrane iste nazivne snage mogu proizvesti različite količine energije zbog lokacije, orijentacije i sjene.'],
      ['Potrošnja određuje polazište', 'Procijenite godišnju potrošnju i udio koji možete prebaciti u sunčane sate. Buduća dizalica topline ili električno vozilo mogu promijeniti potrebe. Prevelika elektrana može stvarati viškove čija je vrijednost drukčija od vrijednosti energije koju trošite izravno.'],
      ['Krov postavlja ograničenja', 'Za početnu procjenu naš kalkulator računa s panelom od 450 W i oko 2,2 m² raspoložive površine po panelu. Stvarna površina ovisi o dimenzijama opreme, razmacima, pristupnim putovima i geometriji krova. Konačan raspored određuje projektant.'],
      ['Potvrdite procjenu projektom', 'Provjerite raspoloživu priključnu snagu, tehničke uvjete mreže i mogućnost smještaja izmjenjivača. Informativni kalkulator pomaže usporediti scenarije, a izvedbeno rješenje treba temeljiti na pregledu lokacije i projektu.'],
    ], source: 'https://joint-research-centre.ec.europa.eu/pvgis-online-tool_en', sourceLabel: 'Europska komisija – PVGIS',
  },
  {
    slug: 'vlastita-potrosnja-solarne-energije', category: 'Savjeti', date: '2026-09-15', dateLabel: '15. rujna 2026.', read: 4,
    title: 'Iskoristite više energije koju sami proizvedete',
    description: 'Male promjene u navikama mogu pomoći boljem iskorištenju sunčanih sati.',
    image: landscape, alt: 'Sunčeva elektrana tijekom dana',
    sections: [
      ['Pratite proizvodnju i potrošnju', 'Aplikacija izmjenjivača prikazuje proizvodnju, dok je za praćenje ukupne potrošnje često potrebno dodatno mjerenje. Usporedite dnevne krivulje i pronađite vrijeme kada elektrana proizvodi više nego što kućanstvo troši.'],
      ['Pomaknite fleksibilnu potrošnju', 'Perilicu, zagrijavanje vode ili punjenje električnog vozila možete, kada je to praktično i sigurno, planirati u razdoblju proizvodnje. Automatsko upravljanje treba postaviti prema uputama proizvođača i stvarnim potrebama kućanstva.'],
      ['Baterija je zasebna odluka', 'Spremnik energije može dio dnevne proizvodnje sačuvati za kasnije. Isplativost ovisi o cijeni, korisnom kapacitetu, gubicima i načinu obračuna energije. Usporedite scenarij s baterijom i bez nje prije odluke.'],
    ], source: 'https://joint-research-centre.ec.europa.eu/pvgis-online-tool_en', sourceLabel: 'Europska komisija – procjena solarne proizvodnje',
  },
];
