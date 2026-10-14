import type { Locale } from "./content.ts";

/**
 * The What's new page, newest date first, one group per date (YYYY-MM-DD). Only significant learner-visible changes, each in
 * every UI locale. The unseen badge counts items, so add new items without removing old ones: a removal hides a later addition.
 */
export const WHATS_NEW: { date: string; items: Record<Locale, string>[] }[] = [
  {
    date: "2026-10-14",
    items: [
      {
        en: "Your friends list shows each friend's language, stars and lessons this week.",
        "es-419": "Tu lista de amigos muestra el idioma, las estrellas y las lecciones de esta semana de cada amigo.",
        nl: "Je vriendenlijst toont van elke vriend de taal, de sterren en de lessen van deze week.",
        it: "La lista degli amici mostra la lingua, le stelle e le lezioni di questa settimana di ogni amico.",
        el: "Η λίστα φίλων δείχνει τη γλώσσα, τα αστέρια και τα μαθήματα αυτής της εβδομάδας κάθε φίλου.",
      },
      {
        en: "Talk: turn on Slow speech to hear your partner at 3/4 speed.",
        "es-419": "Hablar: activa Habla lenta para oír a tu compañero a 3/4 de velocidad.",
        nl: "Praten: zet Langzaam spreken aan om je partner op 3/4 snelheid te horen.",
        it: "Conversa: attiva Parlato lento per sentire il tuo interlocutore a 3/4 della velocità.",
        el: "Συζήτηση: άνοιξε την Αργή ομιλία για να ακούς τον συνομιλητή σου στα 3/4 της ταχύτητας.",
      },
      {
        en: "Talk: pick up a past conversation, with a preview of its latest line.",
        "es-419": "Hablar: retoma una conversación anterior, con una vista previa de su última frase.",
        nl: "Praten: ga verder met een eerder gesprek, met een voorproefje van de laatste zin.",
        it: "Conversa: riprendi una conversazione passata, con un'anteprima dell'ultima frase.",
        el: "Συζήτηση: συνέχισε μια παλιότερη συζήτηση, με προεπισκόπηση της τελευταίας φράσης.",
      },
      {
        en: "Type: Play and Slow turn into a Stop button while the sentence plays.",
        "es-419": "Escribir: los botones de reproducir y lento se convierten en Detener mientras suena la frase.",
        nl: "Typen: de knoppen Afspelen en Langzaam worden een Stop-knop terwijl de zin speelt.",
        it: "Digita: i pulsanti di riproduzione e lento diventano Stop mentre la frase è in riproduzione.",
        el: "Γραφή: τα κουμπιά αναπαραγωγής και αργής ταχύτητας γίνονται Διακοπή όσο παίζει η φράση.",
      },
    ],
  },
  {
    date: "2026-10-13",
    items: [
      {
        en: "Talk: new, more natural voices.",
        "es-419": "Hablar: voces nuevas y más naturales.",
        nl: "Praten: nieuwe, natuurlijkere stemmen.",
        it: "Conversa: voci nuove e più naturali.",
        el: "Συζήτηση: νέες, πιο φυσικές φωνές.",
      },
      {
        en: "Talk: ask \"How do I say...?\" out loud instead of typing it, and play the answer.",
        "es-419": "Hablar: pregunta \"¿Cómo se dice...?\" en voz alta en lugar de escribirlo, y escucha la respuesta.",
        nl: "Praten: vraag \"Hoe zeg ik...?\" hardop in plaats van het te typen, en speel het antwoord af.",
        it: "Conversa: chiedi \"Come si dice...?\" a voce invece di scriverlo, e ascolta la risposta.",
        el: "Συζήτηση: ρώτα «Πώς λέγεται...;» φωναχτά αντί να το γράψεις, και άκου την απάντηση.",
      },
      {
        en: "Type: hints now step up all the way to the full answer.",
        "es-419": "Escribir: las pistas ahora avanzan hasta la respuesta completa.",
        nl: "Typen: hints gaan nu stap voor stap door tot het volledige antwoord.",
        it: "Digita: gli aiuti ora arrivano passo dopo passo fino alla risposta completa.",
        el: "Γραφή: οι βοήθειες φτάνουν πλέον βήμα βήμα μέχρι την πλήρη απάντηση.",
      },
    ],
  },
  {
    date: "2026-10-07",
    items: [
      {
        en: "Type: on a phone keyboard, a space moves you to the next word.",
        "es-419": "Escribir: en el teclado del teléfono, un espacio te lleva a la siguiente palabra.",
        nl: "Typen: op een telefoontoetsenbord ga je met een spatie naar het volgende woord.",
        it: "Digita: sulla tastiera del telefono, uno spazio ti porta alla parola successiva.",
        el: "Γραφή: στο πληκτρολόγιο του κινητού, ένα κενό σε πάει στην επόμενη λέξη.",
      },
      {
        en: "Replaying audio is instant on iPhone.",
        "es-419": "Volver a escuchar el audio es instantáneo en iPhone.",
        nl: "Audio opnieuw afspelen gaat direct op iPhone.",
        it: "Riascoltare l'audio è immediato su iPhone.",
        el: "Η επανάληψη του ήχου είναι άμεση στο iPhone.",
      },
    ],
  },
  {
    date: "2026-10-04",
    items: [
      {
        en: "The leaderboard is weekly and worldwide.",
        "es-419": "La clasificación es semanal y mundial.",
        nl: "De ranglijst is wekelijks en wereldwijd.",
        it: "La classifica è settimanale e mondiale.",
        el: "Η κατάταξη είναι εβδομαδιαία και παγκόσμια.",
      },
      {
        en: "Your dashboard shows your progress and stars.",
        "es-419": "Tu panel muestra tu progreso y tus estrellas.",
        nl: "Je dashboard toont je voortgang en sterren.",
        it: "La tua bacheca mostra i tuoi progressi e le tue stelle.",
        el: "Ο πίνακάς σου δείχνει την πρόοδο και τα αστέρια σου.",
      },
      {
        en: "Tell us what you think with the Feedback link at the bottom of every page.",
        "es-419": "Cuéntanos qué piensas con el enlace Comentarios al pie de cada página.",
        nl: "Laat ons weten wat je ervan vindt via de link Feedback onderaan elke pagina.",
        it: "Dicci cosa ne pensi con il link Feedback in fondo a ogni pagina.",
        el: "Πες μας τη γνώμη σου με τον σύνδεσμο Σχόλια στο κάτω μέρος κάθε σελίδας.",
      },
      {
        en: "Missing a language? Ask for it with \"Other...\" in the language picker.",
        "es-419": "¿Falta un idioma? Pídelo con \"Otro...\" en el selector de idiomas.",
        nl: "Mis je een taal? Vraag erom met \"Anders...\" in de taalkiezer.",
        it: "Manca una lingua? Chiedila con \"Altro...\" nel selettore delle lingue.",
        el: "Λείπει μια γλώσσα; Ζήτησέ την με το «Άλλη...» στην επιλογή γλώσσας.",
      },
    ],
  },
  {
    date: "2026-10-01",
    items: [
      {
        en: "Type: Review now mixes in the mistakes from your notebook.",
        "es-419": "Escribir: Repasar ahora incluye los errores de tu cuaderno.",
        nl: "Typen: Herhalen mengt nu de fouten uit je schrift erdoorheen.",
        it: "Digita: il Ripasso ora include gli errori del tuo quaderno.",
        el: "Γραφή: η Επανάληψη περιλαμβάνει πλέον τα λάθη από το τετράδιό σου.",
      },
      {
        en: "Talk: 20 conversation starters to pick from.",
        "es-419": "Hablar: 20 temas para empezar una conversación.",
        nl: "Praten: 20 gespreksstarters om uit te kiezen.",
        it: "Conversa: 20 spunti per iniziare una conversazione.",
        el: "Συζήτηση: 20 θέματα για να ξεκινήσεις μια συζήτηση.",
      },
    ],
  },
];

export const WHATS_NEW_COUNT = WHATS_NEW.reduce((n, day) => n + day.items.length, 0);
