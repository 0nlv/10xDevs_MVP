---
project: ProfitLeak
context_type: greenfield
created: 2026-05-21
updated: 2026-05-21
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: false
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 22
  quality_check_status: accepted
---

# Shape Notes: ProfitLeak

## Vision & Problem Statement

**Ból**: Właściciele mikro i małych firm (2–20 osób) odczuwają ten problem wtedy, gdy mimo dużej liczby zleceń i rosnących przychodów nie widzą realnego zysku lub brakuje im pieniędzy na koncie.

**Osoba**: Właściciele mikro i małych firm (2–20 osób).

**Moment**: Gdy realizują wiele zleceń, przychody rosną, ale gotówka nie rośnie proporcjonalnie.

**Koszt dzisiaj**: Podejmowanie złych decyzji — utrzymywanie nierentownych klientów, zaniżone wyceny oraz utracony zysk i płynność finansowa.

**Kategoria bólu**: Paraliż decyzyjny — właściciel często wie, że „coś jest nie tak", ale nie ma narzędzia, które jasno wskaże konkretny problem.

**Wgląd (insight)**: Rozwiązania istnieją, ale rozwiązują inny problem — raportowanie, nie decyzje. ERP, księgowość i fakturowanie pokazują dane historyczne, ale nie interpretują rentowności ani nie wskazują, gdzie firma traci pieniądze. Właściciele często nawet wiedzą, że „coś jest nie tak", ale nie mają narzędzia, które jasno powie: ten klient jest nierentowny, to działanie trzeba zmienić.

Dodatkowo ten problem był dotąd trudny do rozwiązania, bo:
- dane są rozproszone i nieustrukturyzowane,
- małe firmy nie mają czasu na konfigurację skomplikowanych narzędzi,
- większość produktów budowano pod księgowość lub enterprise, a nie szybkie decyzje operacyjne.

Aplikacja skupia się na tym wąskim, niedosłużonym obszarze: zamianie danych w konkretne decyzje o rentowności.

**Insight o skali (100x)**: Przy przejściu od garstki użytkowników do tysięcy, reguła musiałaby ewoluować z „wykryj odchylenie względem własnego baseline'u" do „wykryj statystycznie istotne i wiarygodne odchylenia z benchmarkiem rynkowym, pokazując tylko najwyższy priorytet problemów wraz z jasnym uzasadnieniem". Kluczowe zmiany: standaryzacja danych (jakość > tolerancja), konserwatywność (mniej false positives), benchmark rynkowy (kontekst vs inne firmy), priorytetyzacja (top 1–3 alerty), explainability (każdy alert musi sam się tłumaczyć). MVP zakłada małą skalę — tolerancja dla „brudnych" danych i aproximacji jest świadomym uproszczeniem.

## User & Persona

**Główna persona**: Właściciel mikro lub małej firmy (2–20 osób) — osoba, która jednocześnie zarządza operacją, sprzedażą i finansami, często bez dedykowanego zespołu analitycznego.

**Zakres**: Konkretna rola wewnątrz organizacji — właściciel/CEO/CFO małej firmy usługowej lub produkcyjnej.

## Access Control

**Model dostępu**: Login (email + hasło / OAuth / passwordless).

**Model uprawnień**: Płaski — brak ról. Każde konto użytkownika widzi dane swojej firmy. Separacja odbywa się na poziomie firmy (tenant), nie użytkownika w ramach firmy.

## Functional Requirements

### Authentication & Onboarding

- FR-001: Użytkownik może założyć konto (email + hasło lub magic link). Priority: must-have
  > Socrates: Kontrargument rozważony: "Auth dodaje tarcie — dla MVP wystarczyłby demo mode bez konta (dane w localStorage)". Rozwiązanie: Pozostaje must-have — persystencja danych między sesjami jest kluczowa dla wartości produktu (użytkownik wraca, aby zobaczyć trendy i aktualizować dane).

- FR-002: Użytkownik może zalogować się do aplikacji. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli MVP jest single-session (użytkownik nie wraca), login jest zbędny". Rozwiązanie: Pozostaje must-have — założenie jest takie, że użytkownik BĘDZIE wracał (zgodnie z kryterium sukcesu: wraca 2–4 razy/miesiąc).

- FR-003: Użytkownik może przejść prosty onboarding z informacją o wartości produktu. Priority: must-have
  > Socrates: Kontrargument rozważony: "Onboarding opóźnia moment uploadu — użytkownik chce action, nie czytania". Rozwiązanie: Pozostaje must-have, ale z naciskiem na "prosty" — jeden ekran, jedna obietnica wartości, zero konfiguracji. Jeśli przekroczy 5 sekund, to problem.

### Data Upload

- FR-004: Użytkownik może wgrać plik CSV z fakturami sprzedaży. Priority: must-have
  > Socrates: Kontrargument rozważony: "CSV może być zbyt elastyczny format — użytkownik nie wie jak przygotować dane". Rozwiązanie: Pozostaje must-have — ale wymaga dobrego UX: szablon CSV do pobrania + przykładowe dane + jasna instrukcja. To jest known risk, ale integracje z księgowością są poza scope MVP.

- FR-005: Użytkownik może wgrać plik CSV z kosztami. Priority: must-have
  > Socrates: Kontrargument rozważony: "Użytkownik nie wie jak rozdzielić koszty od przychodów — zbyt skomplikowane". Rozwiązanie: Pozostaje must-have — ale dokumentacja musi jasno wyjaśnić różnicę (faktury = przychody, wydatki/dostawcy = koszty). Known onboarding risk.

- FR-006: Użytkownik może zobaczyć podgląd wgranych danych (np. pierwsze wiersze). Priority: must-have
  > Socrates: Kontrargument rozważony: "Podgląd opóźnia flow — użytkownik chce od razu do wyników, nie weryfikacji". Rozwiązanie: Pozostaje must-have — podgląd buduje zaufanie ("system zobaczył moje dane") i pozwala wykryć błędy PRZED przetwarzaniem. To 2 sekundy, ale krytyczne dla UX.

### Data Mapping

- FR-007: Użytkownik może przypisać kolumny CSV do pól systemowych (np. klient, kwota, data). Priority: must-have
  > Socrates: Kontrargument rozważony: "Mapowanie to tarcie — system powinien auto-wykrywać kolumny (AI/heurystyka)". Rozwiązanie: Pozostaje must-have — auto-wykrywanie jest nice-to-have dla v2. MVP wymaga manualnego mapowania, ale z prostym UX (selecty). Known friction point, ale konieczny dla elastyczności.

- FR-008: Użytkownik może poprawić mapowanie przed zatwierdzeniem. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli system auto-wykrywa (FR-007 counter), poprawka jest zbędna". Rozwiązanie: Pozostaje must-have — nawet z manualnym mapowaniem użytkownik może się pomylić. Poprawka przed zatwierdzeniem to safety net.

### Cost Assignment

- FR-009: Użytkownik może zdefiniować proste reguły przypisywania kosztów (np. dostawca → klient/projekt). Priority: must-have
  > Socrates: Kontrargument rozważony: "Definiowanie reguł to zbyt duży wysiłek poznawczy — system powinien zaproponować gotowe reguły". Rozwiązanie: Pozostaje must-have — ale implementacja MUSI zaproponować domyślne reguły/szablony (np. "przypisz koszt do wszystkich klientów proporcjonalnie" lub "przypisz koszt do konkretnego klienta"). Użytkownik akceptuje lub modyfikuje, nie buduje od zera.

- FR-010: Użytkownik może ręcznie poprawić przypisania kosztów. Priority: must-have
  > Socrates: Kontrargument rozważony: "Ręczna poprawka = niekończąca się praca — jeśli trzeba poprawiać, reguły są złe". Rozwiązanie: Pozostaje must-have — ręczna poprawka jest escape hatch dla edge case'ów, nie primary flow. Jeśli użytkownik musi poprawiać > 10% przypisań, to reguły są faktycznie złe (guardrail: ≤10 min na przypisania).

### Calculation Engine

- FR-011: System może obliczyć przychody per klient. Priority: must-have
  > Socrates: Kontrargument rozważony: "Przychody per klient są trywialne (suma faktur) — to nie wymaga osobnego FR". Rozwiązanie: Pozostaje must-have — mimo że trywialny, to jawny FR dokumentuje, że ta kalkulacja MUSI działać. Bez niej nie ma produktu.

- FR-012: System może obliczyć koszty per klient. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli koszty są wspólne (overheady), przypisanie per klient jest sztuczne i myli". Rozwiązanie: Pozostaje must-have — ale z zastrzeżeniem: overheady (koszty wspólne) mogą być przypisane proporcjonalnie lub ignorowane w MVP. To known limitation — produkt pokazuje koszty BEZPOŚREDNIE per klient, nie fully-loaded cost. Dokumentacja musi to wyjaśnić.

- FR-013: System może obliczyć marżę (%) per klient. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli koszty są źle przypisane (FR-012 counter), marża % jest fałszywa". Rozwiązanie: Pozostaje must-have — jakość marży zależy od jakości przypisania kosztów. To jest core risk produktu: garbage in, garbage out. Mitigation: dobry UX w FR-009/010 + edukacja użytkownika.

- FR-014: System może obliczyć marżę globalną. Priority: must-have
  > Socrates: Kontrargument rozważony: "Marża globalna nie pokazuje gdzie problem — użytkownik może to zobaczyć w Excelu". Rozwiązanie: Pozostaje must-have — marża globalna to anchor point (benchmark). Użytkownik porównuje marżę per klient do marży globalnej i widzi outlierów. Bez niej brak kontekstu.

### Alert Engine

- FR-015: System może wykryć klienta poniżej progu marży. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli koszty są źle przypisane, alert jest fałszywy i szkodzi zaufaniu". Rozwiązanie: Pozostaje must-have — ale próg marży musi być konfigurowalny (domyślnie np. 20%, ale użytkownik może zmienić). Known risk: false positive jeśli dane są złe. Mitigation: jasna komunikacja w alercie ("na podstawie przypisanych kosztów").

- FR-016: System może wykryć spadek marży w czasie. Priority: must-have
  > Socrates: Kontrargument rozważony: "Spadek marży w czasie wymaga danych historycznych — MVP może nie mieć wystarczająco danych". Rozwiązanie: Pozostaje must-have — ale implementacja: jeśli użytkownik wgrywa dane z datami, system wykrywa trend. Jeśli brak danych historycznych, alert nie pojawia się (graceful degradation). To będzie działać przy ponownym uploade lub przy wgraniu danych za kilka miesięcy.

- FR-017: System może wykryć wzrost kosztów. Priority: must-have
  > Socrates: Kontrargument rozważony: "Wzrost kosztów może być naturalny (więcej zleceń) — alert bez kontekstu myli". Rozwiązanie: Pozostaje must-have — ale alert musi być kontekstowy: "koszty rosły szybciej niż przychody" (nie absolutny wzrost, ale wzrost względny). To wymaga porównania % change kosztów vs % change przychodów.

### Results & Insights

- FR-018: Użytkownik może zobaczyć listę najbardziej rentownych klientów. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli marża jest źle policzona, ta lista jest myśląca". Rozwiązanie: Pozostaje must-have — garbage in, garbage out. Lista jest tak dobra jak dane i przypisania. To core value produktu mimo ryzyka.

- FR-019: Użytkownik może zobaczyć listę najmniej rentownych (nierentownych) klientów. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli marża jest źle policzona, ta lista jest myśląca i szkodzi". Rozwiązanie: Pozostaje must-have — to jest KLUCZOWY insight ("aha moment"). Known risk, ale bez tego produktu nie ma. Mitigation: edukacja użytkownika o jakości danych.

- FR-020: Użytkownik może zobaczyć wygenerowane alerty z opisem problemu. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli alerty są źle sparametryzowane, generują szum zamiast value". Rozwiązanie: Pozostaje must-have — ale implementacja musi pozwolić użytkownikowi dostosować progi (FR-015 counter). Alerty muszą być actionable, nie tylko informacyjne. Known tuning challenge.

### Data Management

- FR-021: Użytkownik może wrócić do aplikacji i ponownie zobaczyć swoje dane oraz wyniki. Priority: must-have
  > Socrates: Kontrargument rozważony: "Jeśli użytkownik nie wraca (single-session MVP), persystencja jest zbędna". Rozwiązanie: Pozostaje must-have — założenie produktu: użytkownik wraca 2–4 razy/miesiąc (success criteria). Jeśli to założenie jest błędne, cały model biznesowy upada. Persystencja to core.

- FR-022: Użytkownik może usunąć lub nadpisać wcześniej wgrane dane. Priority: must-have
  > Socrates: Kontrargument rozważony: "Nadpisywanie/usuwanie to admin feature — nie core MVP flow". Rozwiązanie: Pozostaje must-have — użytkownik musi móc poprawić błąd (wgrał zły plik) lub zaktualizować dane (nowy miesiąc). Bez tego produkt jest read-only po pierwszym uploaderze, co blokuje iterację.

## User Stories

### US-01: Rejestracja użytkownika

**Given**: Użytkownik nie ma konta w systemie  
**When**: Użytkownik wprowadza email i hasło lub korzysta z magic linka  
**Then**: Konto zostaje utworzone, a użytkownik zostaje zalogowany do aplikacji

### US-02: Rozpoczęcie onboardingu

**Given**: Użytkownik jest zalogowany po raz pierwszy  
**When**: Użytkownik widzi ekran powitalny  
**Then**: System komunikuje prostą wartość: „Wgraj dane, żeby zobaczyć gdzie tracisz pieniądze"

### US-03: Upload danych sprzedażowych

**Given**: Użytkownik znajduje się w onboardingu  
**When**: Użytkownik wgrywa plik CSV z fakturami sprzedaży  
**Then**: System zapisuje plik i pokazuje podgląd danych

### US-04: Upload danych kosztowych

**Given**: Użytkownik wgrał dane sprzedażowe  
**When**: Użytkownik wgrywa plik CSV z kosztami  
**Then**: System zapisuje plik i pokazuje podgląd danych

### US-05: Mapowanie kolumn

**Given**: Dane zostały wgrane  
**When**: Użytkownik przypisuje kolumny CSV do pól systemowych (np. klient, kwota, data)  
**Then**: System zapisuje mapowanie i umożliwia przejście dalej

### US-06: Konfiguracja przypisania kosztów

**Given**: Dane są zmapowane  
**When**: Użytkownik akceptuje lub edytuje proste reguły przypisania kosztów  
**Then**: System zapisuje reguły i przypisuje koszty do klientów/projektów

### US-07: Przetwarzanie danych

**Given**: Dane są poprawnie wgrane i skonfigurowane  
**When**: System rozpoczyna obliczenia  
**Then**: System wylicza przychody, koszty, marże oraz trendy dla klientów i całości biznesu

### US-08: Wykrywanie problemów

**Given**: Dane zostały przetworzone  
**When**: System analizuje wyniki według zdefiniowanych reguł  
**Then**: System generuje alerty (np. klient nierentowny, spadek marży, wzrost kosztów)

### US-09: Prezentacja wyników (dashboard)

**Given**: Alerty i metryki zostały wygenerowane  
**When**: Użytkownik przechodzi do dashboardu  
**Then**: Użytkownik widzi:
- najbardziej rentownych klientów
- najmniej rentownych klientów
- alerty
- marżę globalną

### US-10: AHA moment

**Given**: Użytkownik przegląda dashboard i alerty  
**When**: Użytkownik zauważa klienta lub usługę o niskiej lub ujemnej marży  
**Then**: Użytkownik uzyskuje nowy insight („ten klient jest nierentowny")

### US-11: Podjęcie decyzji

**Given**: Użytkownik zidentyfikował problem rentowności  
**When**: Użytkownik opuszcza aplikację  
**Then**: Użytkownik podejmuje decyzję biznesową (np. zmiana ceny, zakończenie współpracy, zmiana oferty)

## Business Logic

**Reguła domeny (one-sentence)**: Aplikacja analizuje dane finansowe użytkownika i automatycznie wykrywa odchylenia rentowności (per klient/usługa), generując konkretne alerty wskazujące gdzie biznes traci pieniądze względem jego własnego baseline'u.

**Wejścia**: Użytkownik dostarcza dane, które już posiada w firmie – przede wszystkim listę faktur sprzedażowych (kto zapłacił, ile i kiedy) oraz podstawowe informacje o kosztach (np. wydatki, podwykonawcy, materiały), opcjonalnie powiązane z klientami lub projektami. Na tym etapie nie chodzi o perfekcyjną księgowość, tylko o wystarczająco dobre odwzorowanie: „ile zarobiłem na kim" i „ile mnie to kosztowało". Dane mogą być nieidealne, ale reprezentują realny obraz działania firmy z ostatnich tygodni lub miesięcy.

**Wyjście**: Na podstawie tych danych aplikacja produkuje zestaw wniosków, a nie tylko liczby. Najważniejsze są alerty wskazujące odchylenia od normy — np. klient znacząco mniej rentowny niż reszta portfela, spadek marży na danym typie usług, czy rosnące koszty niewspółmierne do przychodów. Obok alertów użytkownik widzi uproszczone metryki (marża per klient, ranking klientów, marża globalna), ale ich główną rolą jest kontekst dla alertów — tak, aby użytkownik rozumiał, dlaczego coś jest problemem.

**Jak użytkownik to widzi w flow**: Reguła materializuje się w momencie przejścia od danych do wniosków — zaraz po wgraniu i przetworzeniu danych. Użytkownik nie musi sam analizować tabel ani szukać zależności; zamiast tego trafia bezpośrednio na listę problemów i odchyleń, które wymagają uwagi. To jest moment „aha": użytkownik widzi konkretną sytuację (np. nierentowny klient), której wcześniej nie był świadomy. Wszystko przed tym momentem to tylko przygotowanie danych — a wszystko po nim to już podejmowanie decyzji poza aplikacją.

## Non-Functional Requirements

### Timing / Responsywność

- Czas od uploadu danych do pierwszych wyników ≤ 30–60 sekund (user-perceived — od kliknięcia "przetwórz" do widocznych wyników)
- Każda akcja UI (upload, klik, przejście) daje natychmiastowy feedback ≤ 1–2 sekundy
- Ciągłe widoczne informacje o stanie — użytkownik nigdy nie widzi „zawieszenia" bez komunikatu (loading / processing)

### Privacy / Bezpieczeństwo

- Dane finansowe użytkownika są prywatne — brak udostępniania innym użytkownikom (tenant isolation)
- Dane nie są wykorzystywane do celów innych niż analiza użytkownika (no cross-tenant analytics, no training data)
- Użytkownik może usunąć swoje dane lub korzystać w trybie jednorazowym bez trwałego zapisu (data portability & deletion)

### Wiarygodność wyników

- Wyniki są deterministyczne — ten sam input → ten sam output (reproducibility)
- System jasno komunikuje założenia i ograniczenia (np. "brak kosztów wspólnych = tylko bezpośrednie przypisanie")
- Alerty są ograniczone do najważniejszych — max 3–5 alertów na sesję (noise control — no spam)

### Prostota użycia

- Użytkownik może przejść od wejścia do wyniku bez czytania dokumentacji (self-explanatory UX)
- Maksymalnie 1–2 decyzje wymagane od użytkownika przed wynikiem (low cognitive load)
- System toleruje niedoskonałe dane — brak wymogu „idealnej" księgowości (graceful degradation)

### Accessibility / Dostępność

- Aplikacja działa w aktualnych przeglądarkach (Chrome, Edge, Safari — last 2 major versions)
- Działa na desktopie bez instalacji (web-based, no native client required)
- UI czytelny bez szkolenia — self-explanatory labels and flows

### Interpretowalność

- Każdy alert zawiera krótkie wyjaśnienie „dlaczego to problem" (contextual help)
- Użytkownik rozumie wynik bez znajomości księgowości (plain language, no jargon)
- Brak „black box" — każdy wynik ma widoczne źródło (traceable to input data)

### Retention / Przechowywanie

- Jasna informacja dla użytkownika, czy dane są zapisywane czy nie (transparent persistence model)
- Brak długoterminowego przechowywania bez zgody użytkownika (opt-in for long-term storage)
- Dane mogą być usuwane na żądanie użytkownika (right to deletion)

### Noise control

- System pokazuje tylko najważniejsze problemy — nie wszystkie odchylenia (signal-to-noise optimization)
- Brak nadmiarowych metryk i wykresów — fokus na akcji, nie eksploracji (minimal viable dashboard)
- Priorytetyzacja alertów — użytkownik widzi „top N", nie całą listę

## Non-Goals

1. **Avoid: budowanie własnego silnika AI/ML do predykcji rentowności**  
   *Rationale*: Wymusza decyzję buy-vs-build teraz — MVP używa prostych reguł threshold-based i heurystyk, nie uczenia maszynowego. Predykcje i zaawansowana analityka to v2+, gdy będzie wystarczająco danych i validacji domeny.

2. **Avoid: real-time synchronizacja z księgowością / systemami zewnętrznymi**  
   *Rationale*: Silny scope avoid — integracje (KSeF, API księgowe, banki) są poza zakresem MVP. Dashboardy aktualizują się po ręcznym re-uploadzie danych CSV. Real-time sync to osobny projekt (infrastruktura, autentykacja, obsługa błędów).

3. **Avoid: funkcje zespołowe (współdzielone dashboardy, role, uprawnienia)**  
   *Rationale*: Jawne ograniczenie do single-user-per-tenant — brak współdzielonych workspace'ów, team features, uprawnień zespołowych. Jeden użytkownik = jedna firma. Multi-user to v2+, gdy model biznesowy będzie validowany.

4. **Avoid: zaawansowane wizualizacje i interaktywne wykresy (tylko listy + liczby)**  
   *Rationale*: Wykluczenie zaawansowanego UX — brak interaktywnych wykresów, drill-down, eksploracji danych. MVP pokazuje ultra prosty dashboard: listy (top/bottom klienci) + liczby (marża %, kwoty) + alerty (text). Wykresy to nice-to-have dla v2, nie core value.

5. **Avoid: aplikacje mobilne (native iOS/Android)**  
   *Rationale*: Wykluczenie platformy mobilnej — desktop-only web app. Responsywność mobilna (mobile-friendly web) może być nice-to-have, ale native apps są poza zakresem. Desktop to główny use case dla analizy finansowej.

6. **Avoid: w pełni automatyczne przypisywanie kosztów**  
   *Rationale*: MVP oferuje tylko uproszczone/opcjonalne przypisywanie kosztów (manual + 1–2 heurystyki). Fully automated cost allocation wymaga AI/heurystyk, które mogą generować false positives i obniżać zaufanie. Użytkownik akceptuje/modyfikuje reguły, nie dostaje gotowego przypisania bez kontroli.

## Success Criteria

### Primary

Użytkownik przechodzi pełny flow (upload CSV → mapping → wynik) i w jednej sesji dostaje przynajmniej 1 klarowny insight o nierentownym kliencie lub usłudze („aha moment").

**MVP flow**:

1. Użytkownik zakłada konto (email + hasło lub magic link)
2. Widzi onboarding: „Wgraj dane, żeby zobaczyć gdzie tracisz pieniądze"
3. Wrzuca CSV z faktur sprzedaży
4. Wrzuca CSV kosztów
5. Mapuje kolumny (drag & select, lub selecty jeśli trzeba skrócić czas)
6. Zatwierdza/poprawia proste reguły przypisania kosztów (manual + 1–2 heurystyki)
7. System przetwarza dane (marża per klient, trendy, alerty threshold-based)
8. Użytkownik widzi ultra prosty dashboard (lista + liczby): nierentowni klienci, 2–3 typy alertów, rentowni klienci, marża globalna
9. AHA moment: „Nie wiedziałem, że ten klient jest nierentowny"
10. (Poza aplikacją) Podejmuje decyzję: podnosi ceny / kończy współpracę / zmienia ofertę

**Cut-edge uproszczenia dla 3-week MVP**:
- Prosty login (email+hasło lub magic link, bez OAuth providers)
- Upload CSV bez perfekcyjnego UX
- Podstawowy mapping kolumn (selecty zamiast drag&drop jeśli trzeba)
- Bardzo proste reguły przypisania kosztów (manual + 1–2 heurystyki)
- Silnik marży (per klient)
- 2–3 typy alertów (threshold-based, bez zaawansowanej analityki)
- Ultra prosty dashboard (lista + liczby, bez rozbudowanych wykresów)
- Brak automatyzacji, brak „magii" w data cleaningu, brak rozbudowanego UI

### Secondary

Użytkownik ręcznie przypisuje koszty tylko minimalnie (≤10 min) i akceptuje większość zaproponowanych reguł bez frustracji.

### Guardrails

1. **Prywatność**: Dane finansowe są bezpieczne (brak wycieków, prywatność na poziomie MVP).
2. **Performance floor**: Czas od uploadu do wyników < 30–60 sekund (brak „czekania", które zniechęca użytkownika).

## Forward: tech-stack

Stack preferences dla downstream /10x-tech-stack-selector:
- **Auth**: rozważ Supabase Auth (prosty setup, wbudowany email+hasło i magic link, szybki dla MVP)

