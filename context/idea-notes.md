## ProfitLeak - MVP

### Główny problem
Właściciele mikro i małych firm mają przychody i klientów, ale nie wiedzą, które zlecenia i klienci są faktycznie rentowni.
Brakuje im odpowiedzi na kluczowe pytania:
- gdzie uciekają pieniądze,
- którzy klienci generują straty,
- czy wzrost obrotu oznacza wzrost zysku.

Efekt:
- nierentowne zlecenia,
- złe wyceny,
- przepalanie czasu,
- problemy z płynnością mimo „dużej ilości pracy”.

### Najmniejszy zestaw funkcjonalności
- Upload danych finansowych (CSV: faktury sprzedaży + koszty)
- Prosty model danych (klient, faktura, koszt, typ usługi/projektu)
- Półautomatyczne przypisywanie kosztów do klientów/projektów (proste reguły)
- Silnik marżowości:
    przychód per klient
    koszty per klient
    marża %
    trend zmian


- Alert engine (core produktu):
    klient nierentowny
    koszty rosną szybciej niż ceny
    typ usługi poniżej targetu

- Prosty dashboard:
    najbardziej rentowni klienci
    najmniej rentowni klienci
    alerty
    marża globalna

### Co NIE wchodzi w zakres MVP
- Integracje (KSeF, banki, API księgowe)
- OCR faktur
- AI / machine learning / predykcje
- Pełna księgowość
- CRM, task management, workflow
- Aplikacje mobilne (web only)
- Wielopoziomowe role i uprawnienia
- Forecasting cashflow
- W pełni automatyczna kategoryzacja

### Kryteria sukcesu
- Użytkownik po pierwszym imporcie odkrywa problem („aha moment”)
- Użytkownik wraca minimum 2–4 razy w miesiącu
- Gotowość do płacenia: 49–149 zł / miesiąc
- Produkt pozwala szybciej podejmować decyzje niż Excel
- System wykrywa przynajmniej 1 wcześniej niewidoczny problem finansowy