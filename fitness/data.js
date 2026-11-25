/* Stammdaten: Ziele, Übungen (inkl. Animation), Trainingspläne, Wochen-Challenges, Lebensmittel */
(function () {
  'use strict';

  const GOALS = {
    lose: { label: 'Abnehmen', icon: '🔥', kcal: -500, protein: 2.0, fat: 0.8, desc: 'Kaloriendefizit, Ganzkörper-Zirkel und viel Bewegung im Alltag.' },
    muscle: { label: 'Muskelaufbau', icon: '💪', kcal: 300, protein: 2.0, fat: 1.0, desc: 'Progressives Krafttraining im Push/Pull/Beine-Split mit leichtem Überschuss.' },
    endurance: { label: 'Ausdauer', icon: '🫀', kcal: 0, protein: 1.6, fat: 1.0, desc: 'Laufen, Rudern, Radfahren und Intervalle für Herz und Lunge.' },
    golf: { label: 'Golf-spezifisch', icon: '⛳', kcal: 0, protein: 1.6, fat: 1.0, desc: 'Rotation, Hüftkraft, Balance und Mobilität für einen kraftvollen Schwung.' },
    hyrox: { label: 'HYROX-spezifisch', icon: '🏁', kcal: 200, protein: 1.8, fat: 1.0, desc: 'Laufen plus die acht HYROX-Stationen: Ski, Sled, Burpees, Rudern, Carry, Lunges, Wall Balls.' }
  };

  const ACTIVITY = [
    { id: 1.2, label: 'Kaum aktiv (Bürojob, wenig Bewegung)' },
    { id: 1.375, label: 'Leicht aktiv (1–2× Sport/Woche)' },
    { id: 1.55, label: 'Mäßig aktiv (3–4× Sport/Woche)' },
    { id: 1.725, label: 'Sehr aktiv (5–6× Sport/Woche)' },
    { id: 1.9, label: 'Extrem aktiv (körperliche Arbeit + Sport)' }
  ];
  const LEVELS = { beginner: 'Einsteiger', intermediate: 'Fortgeschritten', advanced: 'Profi' };

  const CATS = ['Kraft', 'Core', 'Cardio', 'HYROX', 'Golf', 'Mobilität'];

  // Häufig verwendete Posen
  const STAND = { t: 180, a1: [6, 10], a2: [-4, 4], l1: [0, 0] };
  const PLANK_TOP = { t: 115, a1: [0, 0], a2: [3, 0], l1: [-65, -65], l2: [-66, -66] };

  // type: reps | time ; bw: Anteil Körpergewicht für Volumen ; met: Energieumsatz
  const EXERCISES = [
    { id: 'squat', name: 'Kniebeuge', cat: 'Kraft', goals: ['lose', 'muscle', 'hyrox', 'golf'], muscles: 'Oberschenkel, Gesäß, Rumpf', equip: 'Ohne / Kurzhanteln', level: 1, type: 'reps', met: 5, bw: 0.7,
      steps: ['Füße schulterbreit, Zehen leicht nach außen.', 'Hüfte nach hinten-unten schieben, Brust bleibt aufrecht.', 'Knie folgen der Fußspitze, bis die Oberschenkel etwa parallel sind.', 'Über die ganzen Füße kraftvoll hochdrücken.'],
      tips: 'Fersen am Boden lassen, Rücken neutral.',
      anim: { dur: 2.4, frames: [STAND, { t: 140, a1: [85, 90], a2: [82, 90], l1: [80, -25], l2: [78, -27] }] } },
    { id: 'backsquat', name: 'Langhantel-Kniebeuge', cat: 'Kraft', goals: ['muscle', 'hyrox'], muscles: 'Oberschenkel, Gesäß, unterer Rücken', equip: 'Langhantel', level: 2, type: 'reps', met: 6, bw: 0,
      steps: ['Stange auf dem oberen Rücken ablegen, Hände eng greifen.', 'Tief einatmen, Rumpf anspannen.', 'Kontrolliert in die Hocke, Knie nach außen.', 'Aus der Hüfte und den Beinen nach oben drücken.'],
      tips: 'Mit leichtem Gewicht die Technik festigen.',
      anim: { dur: 2.6, prop: 'barback', frames: [{ t: 180, a1: [-60, 160], l1: [0, 0] }, { t: 145, a1: [-30, 175], l1: [82, -28], l2: [80, -30] }] } },
    { id: 'pushup', name: 'Liegestütz', cat: 'Kraft', goals: ['lose', 'muscle', 'golf'], muscles: 'Brust, Trizeps, Schultern', equip: 'Ohne', level: 1, type: 'reps', met: 8, bw: 0.65,
      steps: ['Hände etwas breiter als schulterbreit, Körper bildet eine Linie.', 'Ellbogen ca. 45° vom Körper beugen.', 'Brust bis kurz über den Boden senken.', 'Kraftvoll zurück in die Ausgangsposition drücken.'],
      tips: 'Zu schwer? Knie ablegen.',
      anim: { dur: 2, fixX: 'foot', frames: [PLANK_TOP, { t: 104, a1: [-68, 40], a2: [-66, 40], l1: [-76, -76], l2: [-77, -77] }] } },
    { id: 'lunge', name: 'Ausfallschritt', cat: 'Kraft', goals: ['lose', 'muscle', 'golf'], muscles: 'Oberschenkel, Gesäß', equip: 'Ohne / Kurzhanteln', level: 1, type: 'reps', met: 5, bw: 0.7,
      steps: ['Aufrecht stehen, Hände in die Hüfte.', 'Großen Schritt nach vorn machen.', 'Hinteres Knie Richtung Boden senken, vorderes Knie über dem Fuß.', 'Mit dem vorderen Bein zurückdrücken, Seite wechseln.'],
      tips: 'Oberkörper aufrecht, Knie nicht nach innen.',
      anim: { dur: 2.4, frames: [{ t: 180, a1: [-25, 60], l1: [0, 0], l2: [0, 0] }, { t: 180, a1: [-25, 60], l1: [85, -2], l2: [-15, -85] }] } },
    { id: 'deadlift', name: 'Kreuzheben', cat: 'Kraft', goals: ['muscle', 'hyrox'], muscles: 'Rückenstrecker, Gesäß, Beinbeuger', equip: 'Langhantel', level: 2, type: 'reps', met: 6, bw: 0,
      steps: ['Stange über der Fußmitte, hüftbreiter Stand.', 'Hüfte nach hinten, Stange schulterbreit greifen, Rücken gerade.', 'Stange nah am Körper durch Strecken von Hüfte und Knie heben.', 'Kontrolliert ablegen.'],
      tips: 'Niemals mit rundem Rücken ziehen.',
      anim: { dur: 2.8, prop: 'barbell', plateGround: true, frames: [{ t: 180, a1: [0, 0], l1: [0, 0] }, { t: 115, a1: [0, 0], l1: [55, -20], l2: [53, -22] }] } },
    { id: 'bench', name: 'Bankdrücken', cat: 'Kraft', goals: ['muscle'], muscles: 'Brust, Trizeps, vordere Schulter', equip: 'Langhantel, Bank', level: 2, type: 'reps', met: 5, bw: 0,
      steps: ['Auf die Bank legen, Füße fest am Boden.', 'Stange etwas breiter als schulterbreit greifen.', 'Kontrolliert zur unteren Brust senken.', 'Explosiv nach oben drücken.'],
      tips: 'Schulterblätter zusammen, mit Partner sichern.',
      anim: { dur: 2.4, prop: 'bench', fixX: 'hip', frames: [{ t: 90, h: 0, a1: [180, 180], l1: [-80, 10] }, { t: 90, h: 0, a1: [-80, 180], l1: [-80, 10] }] } },
    { id: 'ohp', name: 'Schulterdrücken', cat: 'Kraft', goals: ['muscle', 'golf'], muscles: 'Schultern, Trizeps', equip: 'Kurzhanteln', level: 1, type: 'reps', met: 5, bw: 0,
      steps: ['Hanteln auf Schulterhöhe, Rumpf fest.', 'Senkrecht über den Kopf drücken.', 'Oben kurz halten.', 'Langsam zurück auf Schulterhöhe.'],
      tips: 'Kein Hohlkreuz – Gesäß anspannen.',
      anim: { dur: 2.2, prop: 'dumbbell', frames: [{ t: 180, a1: [20, 175], a2: [18, 175] }, { t: 180, a1: [178, 180], a2: [176, 180] }] } },
    { id: 'curl', name: 'Bizepscurls', cat: 'Kraft', goals: ['muscle'], muscles: 'Bizeps, Unterarme', equip: 'Kurzhanteln', level: 1, type: 'reps', met: 4, bw: 0,
      steps: ['Aufrecht stehen, Hanteln seitlich.', 'Ellbogen am Körper fixieren.', 'Hanteln zur Schulter beugen.', 'Langsam absenken.'],
      tips: 'Nicht mit Schwung arbeiten.',
      anim: { dur: 2, prop: 'dumbbell', frames: [{ t: 180, a1: [3, 3], a2: [0, 0] }, { t: 180, a1: [8, 160], a2: [6, 158] }] } },
    { id: 'row', name: 'Vorgebeugtes Rudern', cat: 'Kraft', goals: ['muscle', 'golf', 'lose'], muscles: 'Oberer Rücken, Latissimus, Bizeps', equip: 'Kurzhanteln', level: 1, type: 'reps', met: 5, bw: 0,
      steps: ['Hüfte beugen, Oberkörper ca. 45° nach vorn.', 'Hanteln hängen unter den Schultern.', 'Ellbogen nah am Körper nach hinten ziehen.', 'Kontrolliert absenken.'],
      tips: 'Schulterblätter aktiv zusammenziehen.',
      anim: { dur: 2.2, prop: 'dumbbell', frames: [{ t: 125, a1: [0, 0], a2: [2, 2], l1: [25, -10] }, { t: 125, a1: [-110, 0], a2: [-105, 2], l1: [25, -10] }] } },
    { id: 'pullup', name: 'Klimmzüge', cat: 'Kraft', goals: ['muscle', 'hyrox'], muscles: 'Latissimus, Bizeps, Rumpf', equip: 'Klimmzugstange', level: 3, type: 'reps', met: 8, bw: 1,
      steps: ['Stange etwas breiter als schulterbreit greifen.', 'Aus dem Hang Schultern nach unten ziehen.', 'Kinn über die Stange ziehen.', 'Langsam in den gestreckten Hang.'],
      tips: 'Einsteiger: mit Widerstandsband.',
      anim: { dur: 2.4, prop: 'bar', anchorY: 'hands', fixX: 'hand', frames: [{ t: 180, a1: [178, 180], l1: [5, -12] }, { t: 180, a1: [35, 180], a2: [33, 180], l1: [10, -20] }] } },
    { id: 'dips', name: 'Dips', cat: 'Kraft', goals: ['muscle'], muscles: 'Trizeps, Brust', equip: 'Barren', level: 2, type: 'reps', met: 8, bw: 0.9,
      steps: ['Auf dem Barren stützen, Arme gestreckt.', 'Ellbogen nach hinten beugen.', 'Bis Oberarme etwa parallel zum Boden senken.', 'Hochdrücken.'],
      tips: 'Schultern weg von den Ohren.',
      anim: { dur: 2.2, prop: 'dipbars', anchorY: 'hands', handY: 100, fixX: 'hand', frames: [{ t: 175, a1: [0, 0], l1: [10, -80] }, { t: 165, a1: [-120, 10], l1: [10, -80] }] } },
    { id: 'bridge', name: 'Glute Bridge', cat: 'Core', goals: ['golf', 'lose', 'hyrox'], muscles: 'Gesäß, Beinbeuger, Rumpf', equip: 'Ohne', level: 1, type: 'reps', met: 3.5, bw: 0.4,
      steps: ['Rückenlage, Füße hüftbreit aufgestellt.', 'Gesäß anspannen und Becken anheben.', 'Oben Knie–Hüfte–Schulter in einer Linie.', 'Langsam absenken.'],
      tips: 'Druck über die Fersen.',
      anim: { dur: 2.2, headGround: true, frames: [{ t: 88, h: 2, a1: [-88, -90], l1: [-150, -15] }, { t: 70, h: 20, a1: [-85, -88], l1: [-110, 10] }] } },
    { id: 'plank', name: 'Unterarmstütz (Plank)', cat: 'Core', goals: ['lose', 'golf', 'hyrox', 'muscle'], muscles: 'Gerade & schräge Bauchmuskeln, Schultern', equip: 'Ohne', level: 1, type: 'time', met: 3.8, bw: 0,
      steps: ['Unterarme unter den Schultern ablegen.', 'Körper von Kopf bis Fuß gerade.', 'Bauch und Gesäß fest anspannen.', 'Ruhig weiteratmen und halten.'],
      tips: 'Hüfte weder durchhängen noch hochstrecken.',
      anim: { dur: 3, frames: [{ t: 103, a1: [0, 90], l1: [-77, -77] }, { t: 104, a1: [2, 90], l1: [-76, -76] }] } },
    { id: 'crunch', name: 'Crunches', cat: 'Core', goals: ['lose'], muscles: 'Gerade Bauchmuskeln', equip: 'Ohne', level: 1, type: 'reps', met: 3.8, bw: 0,
      steps: ['Rückenlage, Beine aufgestellt.', 'Hände an die Schläfen.', 'Oberkörper einrollen, Schulterblätter lösen sich.', 'Langsam ablegen.'],
      tips: 'Nicht am Nacken ziehen.',
      anim: { dur: 2, fixX: 'hip', headGround: true, frames: [{ t: 92, h: 0, a1: [150, -40], l1: [-130, -10] }, { t: 125, h: -10, a1: [175, -10], l1: [-130, -10] }] } },
    { id: 'twist', name: 'Russian Twist', cat: 'Core', goals: ['golf', 'lose'], muscles: 'Schräge Bauchmuskeln', equip: 'Medizinball', level: 2, type: 'reps', met: 4, bw: 0,
      steps: ['Sitzen, Oberkörper leicht zurücklehnen.', 'Füße anheben oder am Boden lassen.', 'Ball mit Rotation von Seite zu Seite führen.', 'Blick folgt dem Ball.'],
      tips: 'Rotation aus dem Rumpf, nicht nur aus den Armen.',
      anim: { dur: 1.8, prop: 'ball', fixX: 'hip', frames: [{ t: -155, a1: [60, 100], a2: [55, 100], l1: [120, 70] }, { t: -150, a1: [110, 60], a2: [105, 60], l1: [118, 68] }] } },
    { id: 'mountain', name: 'Mountain Climbers', cat: 'Cardio', goals: ['lose', 'hyrox'], muscles: 'Rumpf, Hüftbeuger, Schultern', equip: 'Ohne', level: 1, type: 'time', met: 8, bw: 0,
      steps: ['Hohe Liegestützposition.', 'Ein Knie zügig zur Brust ziehen.', 'Bein zurück, anderes Knie nach vorn.', 'Im schnellen Wechsel weiter.'],
      tips: 'Hüfte tief halten.',
      anim: { dur: 0.9, fixX: 'hand', frames: [{ t: 115, a1: [0, 0], l1: [30, -60], l2: [-66, -66] }, { t: 115, a1: [0, 0], l1: [-66, -66], l2: [30, -60] }] } },
    { id: 'burpee', name: 'Burpees', cat: 'Cardio', goals: ['lose', 'hyrox', 'endurance'], muscles: 'Ganzkörper', equip: 'Ohne', level: 2, type: 'reps', met: 8, bw: 0.5,
      steps: ['Aus dem Stand in die Hocke, Hände auf den Boden.', 'Füße zurück in die Liegestützposition springen.', 'Füße wieder heranspringen.', 'Explosiv nach oben springen, Arme über den Kopf.'],
      tips: 'Tempo vor Perfektion – aber sauber landen.',
      anim: { dur: 3.2, fixX: 'hand', frames: [
        { t: 180, a1: [175, 180], l1: [0, 0], lift: 18, x: -20 },
        { t: 135, a1: [30, 0], l1: [95, -40], l2: [93, -42], x: 0 },
        { t: 115, a1: [0, 0], l1: [-65, -65], x: 0 },
        { t: 135, a1: [30, 0], l1: [95, -40], l2: [93, -42], x: 0 },
        { t: 180, a1: [10, 10], l1: [0, 0], x: -20 }] } },
    { id: 'jacks', name: 'Hampelmann', cat: 'Cardio', goals: ['lose', 'endurance'], muscles: 'Ganzkörper, Waden', equip: 'Ohne', level: 1, type: 'time', met: 8, bw: 0,
      steps: ['Aufrecht, Arme seitlich.', 'Springen: Beine grätschen, Arme über den Kopf.', 'Zurückspringen in die Ausgangsposition.', 'Locker und rhythmisch wiederholen.'],
      tips: 'Auf den Fußballen landen.',
      anim: { view: 'front', dur: 1, fixX: 'center', frames: [{ a1: [12, 8], a2: [12, 8], l1: [3, 0], l2: [3, 0] }, { a1: [150, 170], a2: [150, 170], l1: [18, 18], l2: [18, 18], lift: 6 }] } },
    { id: 'kbswing', name: 'Kettlebell Swing', cat: 'Kraft', goals: ['lose', 'hyrox', 'golf'], muscles: 'Gesäß, Beinbeuger, Rumpf', equip: 'Kettlebell', level: 2, type: 'reps', met: 9.8, bw: 0,
      steps: ['Hüftbreit stehen, Kettlebell mit beiden Händen.', 'Hüfte nach hinten schieben, Kettlebell zwischen die Beine.', 'Explosiv die Hüfte strecken.', 'Kettlebell schwingt auf Brusthöhe.'],
      tips: 'Bewegung kommt aus der Hüfte, nicht aus den Armen.',
      anim: { dur: 1.8, prop: 'kettlebell', frames: [{ t: 125, a1: [-18, -18], a2: [-16, -16], l1: [30, -10] }, { t: 182, a1: [92, 92], a2: [90, 90], l1: [0, 0] }] } },
    { id: 'wallball', name: 'Wall Balls', cat: 'HYROX', goals: ['hyrox', 'lose'], muscles: 'Beine, Schultern, Ganzkörper', equip: 'Medizinball (6/4 kg)', level: 2, type: 'reps', met: 8, bw: 0.5,
      steps: ['Ball vor der Brust halten, schulterbreit stehen.', 'Tief in die Kniebeuge.', 'Explosiv hochdrücken und Ball an das Ziel werfen.', 'Ball fangen und direkt in die nächste Kniebeuge.'],
      tips: 'HYROX: 100 Wiederholungen – in Blöcke aufteilen.',
      anim: { dur: 2, prop: 'ball', frames: [{ t: 148, a1: [35, 170], a2: [33, 170], l1: [80, -25], l2: [78, -27], ballY: -4 }, { t: 182, a1: [165, 175], a2: [163, 175], l1: [0, 0], lift: 6, ballY: -22 }] } },
    { id: 'sandbag', name: 'Sandbag Lunges', cat: 'HYROX', goals: ['hyrox'], muscles: 'Beine, Gesäß, Rumpf', equip: 'Sandsack (20/10 kg)', level: 2, type: 'reps', met: 6, bw: 0.7,
      steps: ['Sandsack auf den Schultern ablegen.', 'Großer Schritt nach vorn.', 'Hinteres Knie berührt fast den Boden.', 'Nach vorn aufstehen und mit dem anderen Bein weitergehen.'],
      tips: 'Gleichmäßiges Tempo, Oberkörper aufrecht.',
      anim: { dur: 2.4, prop: 'sandbag', frames: [{ t: 180, a1: [160, -110], l1: [0, 0], l2: [0, 0] }, { t: 180, a1: [160, -110], l1: [85, -2], l2: [-15, -85] }] } },
    { id: 'sledpush', name: 'Sled Push', cat: 'HYROX', goals: ['hyrox'], muscles: 'Beine, Gesäß, Schultern', equip: 'Schlitten', level: 2, type: 'time', met: 8, bw: 0,
      steps: ['Hände an den Griffen, Arme fast gestreckt.', 'Oberkörper stark nach vorn gelehnt.', 'Mit kurzen, kraftvollen Schritten schieben.', 'Fuß bleibt in Kontakt, Tempo gleichmäßig.'],
      tips: 'Tiefer Körperschwerpunkt bringt mehr Kraft.',
      anim: { dur: 1.2, prop: 'sled', fixX: 'hand', frames: [{ t: 112, a1: [100, 95], l1: [45, -50], l2: [-35, -15] }, { t: 112, a1: [100, 95], l1: [-35, -15], l2: [45, -50] }] } },
    { id: 'sledpull', name: 'Sled Pull', cat: 'HYROX', goals: ['hyrox'], muscles: 'Rücken, Arme, Beine', equip: 'Schlitten, Seil', level: 2, type: 'time', met: 8, bw: 0,
      steps: ['Seil vor dem Körper greifen, Füße fest.', 'Gewicht nach hinten verlagern.', 'Hand über Hand das Seil ziehen.', 'Beine und Rücken mit einsetzen.'],
      tips: 'In der Box bleiben – nicht rückwärts gehen.',
      anim: { dur: 1.4, prop: 'sledpull', fixX: 'foot', frames: [{ t: -165, a1: [80, 90], a2: [50, 60], l1: [30, -10], l2: [-10, -5] }, { t: -160, a1: [50, 60], a2: [80, 90], l1: [30, -10], l2: [-10, -5] }] } },
    { id: 'broadjump', name: 'Burpee Broad Jumps', cat: 'HYROX', goals: ['hyrox'], muscles: 'Ganzkörper', equip: 'Ohne', level: 3, type: 'reps', met: 9, bw: 0.5,
      steps: ['Burpee: Brust zum Boden.', 'Füße zu den Händen springen.', 'Weit nach vorn springen.', 'Landen und direkt in den nächsten Burpee.'],
      tips: 'Beidbeinig abspringen und landen.',
      anim: { dur: 3, fixX: 'hip', frames: [
        { t: 115, a1: [0, 0], l1: [-65, -65], x: 30 },
        { t: 135, a1: [30, 0], l1: [95, -40], l2: [93, -42], x: -10 },
        { t: 150, a1: [120, 140], l1: [-20, -20], lift: 30, x: -30 },
        { t: 140, a1: [60, 60], l1: [75, -25], x: -45 }] } },
    { id: 'farmers', name: 'Farmers Carry', cat: 'HYROX', goals: ['hyrox', 'muscle', 'golf'], muscles: 'Griffkraft, Rumpf, Trapez', equip: 'Kettlebells (2×24/16 kg)', level: 1, type: 'time', met: 6, bw: 0,
      steps: ['Gewichte seitlich aufnehmen.', 'Schultern nach hinten-unten.', 'Zügig mit kurzen Schritten gehen.', 'Aufrecht bleiben, nicht seitlich kippen.'],
      tips: 'Griff fest, Blick nach vorn.',
      anim: { dur: 1.1, prop: 'kb2', fixX: 'hip', frames: [{ t: 180, a1: [3, 0], a2: [-3, 0], l1: [22, -8], l2: [-18, -20] }, { t: 180, a1: [-3, 0], a2: [3, 0], l1: [-18, -20], l2: [22, -8] }] } },
    { id: 'rowerg', name: 'Rudergerät', cat: 'HYROX', goals: ['hyrox', 'endurance', 'lose'], muscles: 'Beine, Rücken, Arme', equip: 'Rudergerät', level: 1, type: 'time', met: 7, bw: 0,
      steps: ['Auslage: Schienbeine senkrecht, Arme lang.', 'Zuerst Beine strecken.', 'Dann Oberkörper zurücklehnen.', 'Zum Schluss Griff zum Unterbauch ziehen – umgekehrt zurück.'],
      tips: 'Beine – Rumpf – Arme; zurück: Arme – Rumpf – Beine.',
      anim: { dur: 2.4, prop: 'rower', anchorY: 'hip', hipY: 150, fixX: 'hip', frames: [{ t: 150, a1: [95, 92], l1: [140, 5] }, { t: -162, a1: [-25, 110], l1: [92, 88], x: -18 }] } },
    { id: 'skierg', name: 'SkiErg', cat: 'HYROX', goals: ['hyrox', 'endurance'], muscles: 'Latissimus, Trizeps, Rumpf', equip: 'SkiErg', level: 1, type: 'time', met: 7, bw: 0,
      steps: ['Griffe über dem Kopf, Arme leicht gebeugt.', 'Rumpf anspannen, Hüfte nach hinten.', 'Griffe kraftvoll an den Oberschenkeln vorbei ziehen.', 'Kontrolliert wieder aufrichten.'],
      tips: 'Kraft aus dem Rumpf, nicht nur aus den Armen.',
      anim: { dur: 1.8, prop: 'skierg', frames: [{ t: 180, a1: [165, 170], a2: [160, 165], l1: [0, 0] }, { t: 130, a1: [-15, -20], a2: [-12, -16], l1: [30, -20] }] } },
    { id: 'run', name: 'Laufen', cat: 'Cardio', goals: ['endurance', 'lose', 'hyrox'], muscles: 'Beine, Herz-Kreislauf', equip: 'Laufschuhe', level: 1, type: 'time', met: 9.8, bw: 0,
      steps: ['Aufrecht, leicht nach vorn geneigt.', 'Fuß landet unter dem Körperschwerpunkt.', 'Arme schwingen locker im 90°-Winkel.', 'Gleichmäßig atmen.'],
      tips: 'Grundlagentempo: du kannst dich noch unterhalten.',
      anim: { dur: 0.8, fixX: 'hip', frames: [
        { t: 170, a1: [-45, 50], a2: [45, 140], l1: [50, -5], l2: [-28, -95], lift: 6 },
        { t: 170, a1: [45, 140], a2: [-45, 50], l1: [-28, -95], l2: [50, -5], lift: 6 }] } },
    { id: 'bike', name: 'Radfahren', cat: 'Cardio', goals: ['endurance', 'lose', 'golf'], muscles: 'Beine, Herz-Kreislauf', equip: 'Fahrrad / Ergometer', level: 1, type: 'time', met: 7.5, bw: 0,
      steps: ['Sattelhöhe: Bein unten fast gestreckt.', 'Runder Tritt mit gleichmäßiger Trittfrequenz.', 'Oberkörper ruhig, Schultern locker.', 'Intervalle: 1 Min schnell, 2 Min locker.'],
      tips: '80–90 Umdrehungen pro Minute anpeilen.',
      anim: { dur: 1, prop: 'bike', anchorY: 'hip', hipY: 116, fixX: 'hip', frames: [
        { t: 130, a1: [110, 100], l1: [95, 0], l2: [40, 10] },
        { t: 130, a1: [110, 100], l1: [60, -5], l2: [80, -25] },
        { t: 130, a1: [110, 100], l1: [40, 10], l2: [95, 0] },
        { t: 130, a1: [110, 100], l1: [80, -25], l2: [60, -5] }] } },
    { id: 'jumprope', name: 'Seilspringen', cat: 'Cardio', goals: ['endurance', 'lose', 'hyrox'], muscles: 'Waden, Schultern, Herz-Kreislauf', equip: 'Springseil', level: 1, type: 'time', met: 11, bw: 0,
      steps: ['Ellbogen nah am Körper, Seil aus den Handgelenken drehen.', 'Kleine Sprünge auf den Fußballen.', 'Knie leicht gebeugt.', 'Locker und rhythmisch.'],
      tips: 'Nur so hoch springen wie nötig.',
      anim: { view: 'front', dur: 0.7, prop: 'rope', fixX: 'center', frames: [{ a1: [25, 45], a2: [25, 45], l1: [3, 0], r: -1 }, { a1: [25, 50], a2: [25, 50], l1: [3, 0], lift: 12, r: 1 }] } },
    { id: 'boxjump', name: 'Box Jumps', cat: 'Cardio', goals: ['hyrox', 'endurance', 'golf'], muscles: 'Beine, Explosivkraft', equip: 'Box', level: 2, type: 'reps', met: 8, bw: 0.7,
      steps: ['Vor der Box stehen.', 'Arme zurück, in eine Viertelkniebeuge.', 'Explosiv auf die Box springen.', 'Weich landen, aufrichten, heruntersteigen.'],
      tips: 'Lieber niedrigere Box und sauber landen.',
      anim: { dur: 2.6, prop: 'box', boxX: 6, fixX: 'hip', offsetX: -30, frames: [
        { t: 180, a1: [5, 10], l1: [0, 0], x: -10 },
        { t: 140, a1: [-50, -40], l1: [70, -30], x: -10 },
        { t: 175, a1: [170, 175], l1: [60, -40], lift: 55, x: 25 },
        { t: 150, a1: [80, 90], l1: [70, -25], lift: 40, x: 55 },
        { t: 180, a1: [5, 10], l1: [0, 0], lift: 40, x: 55 }] } },
    { id: 'golfswing', name: 'Golfschwung-Drill', cat: 'Golf', goals: ['golf'], muscles: 'Rumpfrotation, Hüfte, Schultern', equip: 'Golfschläger', level: 1, type: 'reps', met: 4.8, bw: 0,
      steps: ['Ansprechposition: Knie leicht gebeugt, Arme hängen.', 'Ausholen: Schultern drehen, Hüfte bleibt stabil.', 'Abschwung aus der Hüfte einleiten.', 'Durchschwingen bis in den hohen Finish.'],
      tips: 'Langsam beginnen, Rotation statt Armkraft.',
      anim: { view: 'front', dur: 3, prop: 'club', fixX: 'center', frames: [
        { t: 182, a1: [-18, -12], a2: [22, 16], l1: [6, 0], l2: [6, 0], c: 0 },
        { t: 176, a1: [-140, -165], a2: [150, 175], l1: [6, 0], l2: [10, -4], c: 75 },
        { t: 182, a1: [-18, -12], a2: [22, 16], l1: [6, 0], l2: [6, 0], c: 0 },
        { t: 190, a1: [145, 170], a2: [-140, -165], l1: [10, -4], l2: [4, 0], c: -80 }] } },
    { id: 'woodchop', name: 'Medizinball-Holzhacker', cat: 'Golf', goals: ['golf', 'hyrox'], muscles: 'Schräge Bauchmuskeln, Schultern', equip: 'Medizinball', level: 1, type: 'reps', met: 5, bw: 0,
      steps: ['Ball über der rechten Schulter halten.', 'Diagonal zur linken Hüfte ziehen, dabei Knie beugen.', 'Rumpf mitdrehen.', 'Kontrolliert zurück; Seite wechseln.'],
      tips: 'Imitiert die Golf-Rotation – explosiv nach unten.',
      anim: { view: 'front', dur: 2, prop: 'ball', fixX: 'center', frames: [
        { t: 175, a1: [150, 165], a2: [-120, -150], l1: [4, 0], l2: [4, 0] },
        { t: 188, a1: [-10, -30], a2: [30, 45], l1: [25, -20], l2: [25, -20] }] } },
    { id: 'slrdl', name: 'Einbeiniges Kreuzheben', cat: 'Golf', goals: ['golf', 'muscle'], muscles: 'Beinbeuger, Gesäß, Balance', equip: 'Ohne / Kurzhantel', level: 2, type: 'reps', met: 4, bw: 0.4,
      steps: ['Auf einem Bein stehen, Knie leicht gebeugt.', 'Oberkörper nach vorn, freies Bein nach hinten.', 'Bis Oberkörper fast waagerecht ist.', 'Über das Standbein zurück aufrichten.'],
      tips: 'Hüfte bleibt parallel zum Boden – trainiert Golf-Stabilität.',
      anim: { dur: 2.8, frames: [{ t: 180, a1: [0, 0], l1: [3, 0], l2: [-5, -8] }, { t: 98, a1: [0, 0], l1: [8, -4], l2: [-98, -98] }] } },
    { id: 'thoracic', name: 'Thorax-Rotation (Vierfüßler)', cat: 'Mobilität', goals: ['golf', 'endurance', 'muscle', 'lose', 'hyrox'], muscles: 'Brustwirbelsäule, Schultern', equip: 'Ohne', level: 1, type: 'reps', met: 2.5, bw: 0,
      steps: ['Vierfüßlerstand, Hände unter Schultern.', 'Eine Hand an den Hinterkopf.', 'Ellbogen zur Decke aufdrehen, Blick folgt.', 'Zurückdrehen, nach 8 Wdh. Seite wechseln.'],
      tips: 'Mehr Drehung im Oberkörper = mehr Schwunggeschwindigkeit.',
      anim: { dur: 2.6, fixX: 'hip', frames: [{ t: 92, a1: [0, 0], a2: [2, 0], l1: [0, -90] }, { t: 96, h: 30, a1: [175, 178], a2: [2, 0], l1: [0, -90] }] } },
    { id: 'superman', name: 'Superman', cat: 'Core', goals: ['golf', 'lose', 'endurance'], muscles: 'Rückenstrecker, Gesäß', equip: 'Ohne', level: 1, type: 'reps', met: 3, bw: 0,
      steps: ['Bauchlage, Arme nach vorn gestreckt.', 'Arme und Beine gleichzeitig leicht anheben.', '2 Sekunden halten.', 'Langsam ablegen.'],
      tips: 'Blick zum Boden, Nacken lang.',
      anim: { dur: 2.4, fixX: 'hip', headGround: true, frames: [{ t: 90, a1: [90, 90], l1: [-90, -90] }, { t: 100, a1: [105, 108], l1: [-102, -104] }] } },
    { id: 'calf', name: 'Wadenheben', cat: 'Kraft', goals: ['endurance', 'hyrox'], muscles: 'Waden', equip: 'Ohne / Stufe', level: 1, type: 'reps', met: 3, bw: 0.8,
      steps: ['Hüftbreit stehen, evtl. an der Wand abstützen.', 'Auf die Zehenspitzen drücken.', 'Oben kurz halten.', 'Langsam absenken.'],
      tips: 'Volle Bewegungsamplitude nutzen.',
      anim: { dur: 1.6, frames: [{ t: 180, a1: [5, 5], l1: [0, 0] }, { t: 180, a1: [5, 5], l1: [0, 0], lift: 9 }] } }
  ];
  // Bankdrücken: Langhantel zusätzlich zur Bank zeichnen
  EXERCISES.find(e => e.id === 'bench').anim.extraProp = 'barbell';

  const PLANS = {
    lose: [
      { name: 'Ganzkörper-Zirkel', items: [['squat', 3, 15], ['pushup', 3, 10], ['lunge', 3, 12], ['mountain', 3, 40], ['plank', 3, 40], ['jacks', 3, 45]] },
      { name: 'Cardio & Burpees', items: [['run', 1, 1500], ['jumprope', 5, 60], ['burpee', 3, 10], ['crunch', 3, 20]] },
      { name: 'Kraft-HIIT', items: [['kbswing', 4, 15], ['row', 3, 12], ['wallball', 3, 15], ['bridge', 3, 15], ['mountain', 3, 30]] }
    ],
    muscle: [
      { name: 'Push (Brust/Schulter/Trizeps)', items: [['bench', 4, 8], ['ohp', 3, 10], ['dips', 3, 10], ['pushup', 2, 15]] },
      { name: 'Pull (Rücken/Bizeps)', items: [['pullup', 4, 6], ['row', 4, 10], ['deadlift', 3, 6], ['curl', 3, 12]] },
      { name: 'Beine & Core', items: [['backsquat', 4, 8], ['lunge', 3, 10], ['slrdl', 3, 10], ['calf', 3, 15], ['plank', 3, 45]] }
    ],
    endurance: [
      { name: 'Grundlagenlauf', items: [['run', 1, 2400], ['thoracic', 2, 8]] },
      { name: 'Intervalle', items: [['rowerg', 6, 120], ['jumprope', 5, 60], ['burpee', 3, 12]] },
      { name: 'Rad & Kraftausdauer', items: [['bike', 1, 2700], ['squat', 3, 20], ['calf', 3, 20], ['superman', 3, 12]] }
    ],
    golf: [
      { name: 'Rotation & Power', items: [['golfswing', 3, 10], ['woodchop', 3, 10], ['twist', 3, 20], ['kbswing', 3, 12]] },
      { name: 'Hüfte & Balance', items: [['slrdl', 3, 8], ['bridge', 3, 15], ['lunge', 3, 10], ['plank', 3, 40]] },
      { name: 'Mobilität', items: [['thoracic', 3, 8], ['superman', 3, 10], ['golfswing', 2, 15], ['farmers', 3, 40]] }
    ],
    hyrox: [
      { name: 'HYROX-Simulation', items: [['run', 4, 300], ['skierg', 1, 270], ['sledpush', 4, 30], ['sledpull', 4, 30], ['broadjump', 2, 10], ['rowerg', 1, 270], ['farmers', 4, 45], ['sandbag', 2, 20], ['wallball', 4, 25]] },
      { name: 'Kraftausdauer', items: [['wallball', 5, 20], ['sandbag', 4, 16], ['kbswing', 4, 20], ['burpee', 4, 10]] },
      { name: 'Lauf + Erg', items: [['run', 6, 240], ['rowerg', 3, 180], ['skierg', 3, 180]] }
    ]
  };

  // Wöchentliche Challenges – Auswahl abhängig von der Kalenderwoche (für alle Freunde gleich)
  const CHALLENGES = [
    { id: 'pushups', title: '150 Liegestütze', desc: 'Sammle diese Woche insgesamt 150 Liegestütze.', icon: '💥', kind: 'reps', ex: 'pushup', target: 150, unit: 'Wdh.' },
    { id: 'workouts3', title: '3 Trainings', desc: 'Schließe diese Woche mindestens 3 Trainingseinheiten ab.', icon: '🏋️', kind: 'wo', target: 3, unit: 'Trainings' },
    { id: 'steps', title: '60.000 Schritte', desc: 'Gehe diese Woche insgesamt 60.000 Schritte.', icon: '👟', kind: 'steps', target: 60000, unit: 'Schritte' },
    { id: 'cardio', title: '90 Minuten Cardio', desc: 'Laufen, Rudern, Rad, Seilspringen … 90 Minuten zählen.', icon: '🫀', kind: 'cardio', target: 90, unit: 'Min.' },
    { id: 'plank', title: '10 Minuten Plank', desc: 'Halte den Unterarmstütz diese Woche insgesamt 10 Minuten.', icon: '🧱', kind: 'sec', ex: 'plank', target: 600, unit: 'Sek.' },
    { id: 'squats', title: '250 Kniebeugen', desc: 'Egal ob mit oder ohne Gewicht – 250 Kniebeugen.', icon: '🦵', kind: 'reps', ex: 'squat', target: 250, unit: 'Wdh.' },
    { id: 'volume', title: '10 Tonnen bewegen', desc: 'Bewege diese Woche insgesamt 10.000 kg Trainingsvolumen.', icon: '🏗️', kind: 'vol', target: 10000, unit: 'kg' },
    { id: 'burpees', title: '100 Burpees', desc: 'Die Klassiker-Challenge: 100 Burpees in einer Woche.', icon: '🔥', kind: 'reps', ex: 'burpee', target: 100, unit: 'Wdh.' },
    { id: 'kcal', title: '2.000 kcal verbrennen', desc: 'Verbrenne mit Trainings 2.000 kcal.', icon: '⚡', kind: 'kcal', target: 2000, unit: 'kcal' },
    { id: 'water', title: '5 Tage Wasser-Ziel', desc: 'Trinke an 5 Tagen mindestens 2,5 Liter.', icon: '💧', kind: 'waterDays', target: 5, unit: 'Tage' },
    { id: 'food', title: '6 Tage Ernährung tracken', desc: 'Erfasse an 6 Tagen dein Essen.', icon: '🥗', kind: 'foodDays', target: 6, unit: 'Tage' }
  ];
  const POINTS = { workout: 25, perMinutes: 3, perSteps: 2000, challengeDone: 100, challengeFailed: -75, duelWin: 150, duelLoss: -25 };

  const DUEL_TYPES = {
    vol: { label: 'Mehr Gewicht bewegt', unit: 'kg', desc: 'Gesamtes Trainingsvolumen (Wdh. × Gewicht) in 30 Tagen.' },
    max: { label: 'Höchstes Gewicht bei einer Übung', unit: 'kg', desc: 'Wer schafft bei der Übung das höchste Gewicht?' },
    loss: { label: 'Mehr abgenommen', unit: 'kg', desc: 'Gewichtsverlust zwischen Start und Ende (Gewicht eintragen!).' },
    wo: { label: 'Mehr Trainings', unit: 'Trainings', desc: 'Anzahl abgeschlossener Trainingseinheiten.' },
    steps: { label: 'Mehr Schritte', unit: 'Schritte', desc: 'Summe aller Schritte.' }
  };

  // Lebensmittel (pro 100 g) für Offline-Suche
  const FOODS = [
    ['Haferflocken', 372, 13.5, 58.7, 7], ['Banane', 93, 1.2, 20, 0.2], ['Apfel', 54, 0.3, 11.4, 0.2], ['Vollkornbrot', 214, 7, 39, 1.6],
    ['Brötchen (Weizen)', 252, 8.6, 49, 1.5], ['Magerquark', 67, 12, 4, 0.3], ['Skyr natur', 63, 11, 4, 0.2], ['Griechischer Joghurt 10%', 133, 5, 4, 10],
    ['Milch 1,5%', 47, 3.4, 4.8, 1.5], ['Ei (Hühnerei)', 155, 13, 1.1, 11], ['Hähnchenbrust', 110, 23, 0, 1.5], ['Putenbrust', 105, 24, 0, 1],
    ['Rinderhack', 250, 26, 0, 16], ['Lachs', 208, 20, 0, 13], ['Thunfisch (Dose, Wasser)', 116, 26, 0, 1], ['Tofu natur', 145, 15, 2, 9],
    ['Reis (gekocht)', 130, 2.7, 28, 0.3], ['Nudeln (gekocht)', 158, 5.8, 31, 0.9], ['Kartoffeln (gekocht)', 77, 2, 17, 0.1], ['Süßkartoffel', 86, 1.6, 20, 0.1],
    ['Brokkoli', 34, 2.8, 7, 0.4], ['Tomate', 18, 0.9, 3.9, 0.2], ['Gurke', 15, 0.7, 3.6, 0.1], ['Avocado', 160, 2, 9, 15],
    ['Mandeln', 579, 21, 22, 50], ['Erdnussbutter', 588, 25, 20, 50], ['Olivenöl', 884, 0, 0, 100], ['Butter', 717, 0.9, 0.1, 81],
    ['Gouda', 356, 25, 2, 27], ['Mozzarella', 280, 18, 3, 22], ['Whey Protein', 380, 78, 6, 5], ['Proteinriegel', 360, 33, 35, 10],
    ['Linsen (gekocht)', 116, 9, 20, 0.4], ['Kichererbsen (gekocht)', 164, 9, 27, 2.6], ['Pizza Margherita', 250, 10, 30, 9], ['Döner Kebab', 215, 12, 20, 10],
    ['Schokolade (Vollmilch)', 535, 7.6, 59, 30], ['Chips', 536, 7, 53, 34], ['Cola', 42, 0, 10.6, 0], ['Bier', 43, 0.5, 3.6, 0],
    ['Orangensaft', 45, 0.7, 10, 0.2], ['Müsli', 360, 9, 63, 6], ['Reiswaffel', 387, 8, 81, 3], ['Lachsfilet geräuchert', 117, 18, 0, 4.3]
  ].map(([name, kcal, p, c, f], i) => ({ id: 'local' + i, name, kcal, p, c, f }));

  window.FitData = { GOALS, ACTIVITY, LEVELS, CATS, EXERCISES, PLANS, CHALLENGES, POINTS, DUEL_TYPES, FOODS };
})();
