export interface TourStep {
  target: string;
  first?: boolean;
  title: string;
  text: string;
  mobileText?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour=plans]',
    title: 'Twoje plany',
    text: 'Tu przełączasz się między planami. Możesz dodać kolejny, np. plan znajomego, i nałożyć go na swój, żeby zobaczyć, kiedy oboje macie wolne.'
  },
  {
    target: '.qs-top, [data-tour=search]',
    title: 'Podgląd dowolnego planu',
    text: 'Wyszukaj przedmiot (potem wybierzesz grupę) albo prowadzącego i zajrzyj w ich plan bez zapisywania.'
  },
  {
    target: '[data-tour=nav]',
    title: 'Tygodnie i dni',
    text: 'Strzałki zmieniają tydzień (działają też ← → na klawiaturze), a „Dziś” wraca do bieżącego.',
    mobileText: 'Dotknij dnia albo przesuń palcem po planie. Strzałki po bokach zmieniają tydzień.'
  },
  {
    target: '[data-tour=date]',
    title: 'Skok do dowolnej daty',
    text: 'Kliknij datę, a otworzy się kalendarz. Wybierz dzień i od razu lądujesz w tamtym tygodniu, czy to sesja za dwa miesiące, czy zeszły tydzień.'
  },
  {
    target: '[data-tour=filters]',
    title: 'Filtry zajęć',
    text: 'Odznacz typ zajęć, np. wykłady, a plan pokaże, ile czasu zwalnia ich pominięcie.'
  },
  {
    target: '.stage .bk:not(.peer):not(.own), .stage .day.sel .it:not(.peer):not(.own)',
    first: true,
    title: 'Szczegóły zajęć',
    text: 'Kliknij zajęcia, żeby zobaczyć prowadzącego i harmonogram, zaznaczyć nieobecność (licznik jest osobny dla każdych zajęć) albo ręcznie zmienić salę, godzinę lub oznaczyć je jako odwołane.'
  },
  {
    target: '[data-tour=changes]',
    title: 'Zmiany w planie',
    text: 'Po odświeżeniu planu dzwonek pokaże, czy USOS zmienił salę albo godzinę, przeniósł zajęcia lub je odwołał.',
    mobileText: 'Pociągnij plan w dół, żeby go odświeżyć. Dzwonek pokaże, czy USOS zmienił salę albo godzinę, przeniósł zajęcia lub je odwołał.'
  },
  {
    target: '[data-tour=settings]',
    title: 'Ustawienia i kolory',
    text: 'Zmienisz tu motyw i kolor aplikacji, zakres godzin i detektor kolizji, a także zalogujesz się kontem USOS. Jest tu też „Przenieś na inne urządzenie”: jeden zaszyfrowany kod QR i Twoje plany, nieobecności, ustawienia, a nawet logowanie USOS są od razu na drugim urządzeniu.'
  },
  {
    target: '[data-tour=add]',
    title: 'Własne wydarzenia',
    text: 'Dodaj pracę, trening czy korepetycje. Pojawią się w planie i będą brane pod uwagę przy kolizjach.'
  }
];
