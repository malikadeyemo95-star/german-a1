const section = (title, rows) => ({
  title,
  questions: rows.map(([prompt, answers, points = 1]) => ({ prompt, answers:Array.isArray(answers) ? answers : [answers], points })),
});

export const TEST_DEFINITIONS = {
  7:{
    objectiveSections:[
      section('Part A · Verbs',[
        ['Ich ___ (sein) müde.','bin'],['Du ___ (haben) Hunger.','hast'],['Er ___ (werden) Arzt.','wird'],['Wir ___ (wohnen) in Berlin.','wohnen'],['Ihr ___ (sein) nett.','seid'],['Sie (they) ___ (kommen) aus Spanien.','kommen'],['Du ___ (arbeiten) viel.','arbeitest'],['Sie (she) ___ (sprechen) Englisch.','spricht'],['Ich ___ (lernen) Deutsch.','lerne'],['Ihr ___ (haben) Zeit.','habt'],
      ]),
      section('Part B · Numbers',[
        ['14 in words','vierzehn'],['40 in words','vierzig'],['26 in words','sechsundzwanzig'],['73 in words','dreiundsiebzig'],['100 in words',['hundert','einhundert','ein hundert']],
      ]),
      section('Part C · Questions',[
        ['Ask: “My name is Anna.”',['Wie heißt du','Wie heißen Sie']],['Ask: “I come from Italy.”',['Woher kommst du','Woher kommen Sie']],['Ask: “I am 30 years old.”',['Wie alt bist du','Wie alt sind Sie']],['Ask: “I live in Hamburg.”',['Wo wohnst du','Wo wohnen Sie']],['Ask: “Yes, I have a sister.”',['Hast du Geschwister','Haben Sie Geschwister','Hast du eine Schwester','Haben Sie eine Schwester']],
      ]),
      section('Part D · Possessives',[
        ['my father','mein Vater'],['her mother','ihre Mutter'],['his sister','seine Schwester'],['our children','unsere Kinder'],['your (formal) name','Ihr Name'],
      ]),
      section('Part E · Reading',[
        ['Where does David live now?','Frankfurt'],['How old is he?',['34','vierunddreißig']],['What is his job?',['Engineer','Ingenieur']],["What is his wife's job?",['Teacher','Lehrerin']],['How many children do they have?',['Two','2','zwei']],
      ]),
    ],
    selfSections:[{title:'Part F · Writing',maxScore:10,guide:'Write 8–10 correct introduction sentences. Award 1 point per correct sentence, maximum 10.'}],
  },
  14:{
    objectiveSections:[
      section('Part A · Articles and plurals',[
        ['Article for Buch','das'],['Plural of Buch','Bücher'],['Article for Lampe','die'],['Plural of Lampe','Lampen'],['Article for Stuhl','der'],['Plural of Stuhl','Stühle'],['Article for Kind','das'],['Plural of Kind','Kinder'],
      ]),
      section('Part B · Accusative',[
        ['Ich kaufe ___ Computer. (a)','einen'],['Sie sucht ___ Schlüssel. (the)','den'],['Wir möchten ___ Suppe. (a)','eine'],['Er hat ___ Auto. (no)','kein'],['Nimmst du ___ Salat? (the)','den'],['Ich sehe ___ Frau. (the)','die'],['Ich esse ___ Apfel. (an)','einen'],['Haben Sie ___ Kinder? (no)','keine'],
      ]),
      section('Part C · nicht or kein?',[
        ['Ich trinke ___ Milch.','keine'],['Das Brot ist ___ frisch.','nicht'],['Er arbeitet heute ___.','nicht'],['Wir haben ___ Zeit.','keine'],['Das ist ___ mein Handy.','nicht'],['Sie isst ___ Fleisch.','kein'],
      ]),
      section('Part D · Irregular verbs',[
        ['du ___ (essen)','isst'],['er ___ (nehmen)','nimmt'],['sie ___ (lesen)','liest'],['du ___ (fahren)','fährst'],['er ___ (sprechen)','spricht'],['sie ___ (schlafen)','schläft'],
      ]),
      section('Part E · Reading',[
        ['What three things does Lea need?',['bread cheese fruit','Brot Käse Obst']],['What does she buy at the bakery, and for how much?',['two rolls for one euro','zwei Brötchen für einen Euro','two rolls €1']],['How does she pay?',['by card','mit Karte']],["Why doesn't she buy milk?",['she has milk at home','sie hat Milch zu Hause']],['One accusative masculine form',['einen Euro','den Käse']],
      ]),
    ],
    selfSections:[{title:'Part F · Restaurant dialogue',maxScore:7,guide:'Award 1 point per correct line, maximum 7. Check polite ordering, accusative forms, verb-second order, bill, and payment.'}],
  },
  21:{
    objectiveSections:[
      section('Part A · Everyday time',[
        ['7:30',['halb acht']],['10:15',['Viertel nach zehn']],['16:45',['Viertel vor fünf']],['12:00',['zwölf Uhr','zwölf','Mittag']],['8:55',['fünf vor neun']],
      ]),
      section('Part B · Separable verbs',[
        ['ich / aufstehen / um 6 Uhr','Ich stehe um 6 Uhr auf'],['der Kurs / anfangen / um 9 Uhr','Der Kurs fängt um 9 Uhr an'],['wir / einkaufen / am Samstag','Wir kaufen am Samstag ein'],['er / fernsehen / abends','Er sieht abends fern'],['du / mitkommen / ?','Kommst du mit'],
      ]),
      section('Part C · Modal verbs',[
        ['Ich ___ gut schwimmen. (können)','kann'],['Du ___ den Termin absagen. (müssen)','musst'],['Er ___ Pilot werden. (wollen)','will'],['___ ich hier parken? (dürfen)','Darf'],['Ihr ___ mehr Deutsch sprechen. (sollen)','sollt'],['Wir ___ bestellen. (möchten)','möchten'],['muss / heute / arbeiten / sie / lange','Sie muss heute lange arbeiten'],['kannst / helfen / du / mir / ?','Kannst du mir helfen'],['One may not smoke here.','Man darf hier nicht rauchen'],['I want to go to the cinema.',['Ich will ins Kino gehen','Ich möchte ins Kino gehen']],
      ]),
      section('Part D · Prepositions',[
        ['Ich fahre ___ Hause.','nach'],['Ich bin ___ Hause.','zu'],['Wir fahren ___ Österreich.','nach'],['Sie geht ___ Zahnarzt.','zum'],['Das Buch liegt ___ dem Tisch.','auf'],['Er ist ___ der Arbeit.','bei'],['Der Kurs geht ___ 9 ___ 12 Uhr.',['von bis','von 9 bis 12 Uhr']],['___ Sonntag schlafe ich lange.','Am'],['Kaffee ___ Milch, bitte.','mit'],['Das ist ___ meine Mutter.','für'],
      ]),
      section('Part E · Reading',[
        ['When exactly is the appointment?',['Tuesday at 10:15','Dienstag um Viertel nach zehn','Dienstag um 10:15']],["Why can't he take his car?",['his car is broken','sein Auto ist kaputt']],['What goes wrong, and how does he solve it?',['the bus does not come he takes a taxi','der Bus kommt nicht er nimmt ein Taxi'],3],
      ]),
    ],
    selfSections:[{title:'Part F · Writing',maxScore:5,guide:'Award 1 point for each requirement: times, two separable verbs, two modals, three preposition chunks, and overall clarity.'}],
  },
  28:{
    objectiveSections:[
      section('Part A · war and hatte',[
        ['Gestern ___ ich krank.','war'],['Wir ___ keine Zeit.','hatten'],['___ du auf der Party?','Warst'],['Das Essen ___ lecker.','war'],['Ihr ___ viel Spaß.','hattet'],['Sie (they) ___ im Urlaub.','waren'],['Er ___ Fieber.','hatte'],['Ich ___ müde.','war'],
      ]),
      section('Part B · Participles',[
        ['machen','gemacht'],['essen','gegessen'],['lesen','gelesen'],['arbeiten','gearbeitet'],['einkaufen','eingekauft'],['bestellen','bestellt'],['sprechen','gesprochen'],['studieren','studiert'],
      ]),
      section('Part C · haben or sein?',[
        ['Ich ___ nach Rom geflogen.','bin'],['Er ___ eine Pizza gegessen.','hat'],['Wir ___ ins Kino gegangen.','sind'],['Sie ___ ein Buch gelesen.','hat'],['Du ___ zu Hause geblieben.','bist'],['Ihr ___ Deutsch gelernt.','habt'],['Ich ___ um sieben aufgestanden.','bin'],['Sie (pl.) ___ Freunde getroffen.','haben'],
      ]),
      section('Part D · Perfect sentences',[
        ['ich / gestern / einen Film / sehen','Ich habe gestern einen Film gesehen',2],['wir / am Samstag / nach Hamburg / fahren','Wir sind am Samstag nach Hamburg gefahren',2],['du / schon / die Hausaufgaben / machen / ?','Hast du schon die Hausaufgaben gemacht',2],
      ]),
      section('Part E · Reading',[
        ['How did Marta get to Vienna, and when?',['she flew on Friday','am Freitag geflogen','sie ist am Freitag geflogen'],2],['What did she eat and how was it?',['Sachertorte fantastic','eine Sachertorte fantastisch','Sachertorte fantastisch'],2],['Why did she stay in the hotel on Sunday?',['it rained','es hat geregnet'],1],
      ]),
    ],
    selfSections:[{title:'Part F · Writing',maxScore:5,guide:'Award points for war/hatte, haben-perfect, two sein-perfect verbs, verb position, and overall clarity.'}],
  },
  30:{
    objectiveSections:[
      section('Hören · Listening',[
        ['Who is calling?',['b',"doctor's office",'a doctor office'],1.5],['The Thursday appointment is…',['b','cancelled','not possible'],1.5],['The new suggested time is…',['a','Friday 9','Fri 9:00'],1.5],['Phone number',['030445582','030 44 55 82'],3],['The train goes to…','Frankfurt',1.5],['Which platform today?',['b','7','Gleis 7'],1.5],["What's the plan?",['b','cinema','Kino'],1.5],['The film starts at…',['b','8:30','halb neun'],1.5],['They meet…',['a','at 8 in front of the cinema','um acht vor dem Kino'],1.5],
      ]),
      section('Lesen · Reading',[
        ['Selma has her birthday on Saturday.',['R','richtig','true'],1.5],['The party is in a restaurant.',['F','falsch','false'],1.5],['Ceyda should bring food.',['F','falsch','false'],1.5],['Ceyda should answer by Thursday.',['R','richtig','true'],1.5],['Which flat ad fits best, and why?',['Anzeige 2 Zentrum unter 800','ad 2 centre under 800','2 Zentrum 790'],5],['Opening hours sign',['open Monday Saturday 9 20 closed Sunday','Mo Sa 9 20 Sonntag geschlossen'],1],['Checkout sign',['use checkout 2 checkout 1 closed','Kasse 2 Kasse 1 geschlossen'],1],['Queue sign',['wait here take a number','hier warten Nummer ziehen'],1],['Emergency exit sign',['open only in an emergency','nur im Notfall öffnen'],1],
      ]),
    ],
    selfSections:[
      {title:'Schreiben · Writing',maxScore:15,guide:'Task 1: up to 5 points for the form. Task 2: 3 points per required message point plus 1 for greeting/sign-off.'},
      {title:'Sprechen · Speaking',maxScore:15,guide:'Award up to 5 points each for introduction, questions/answers, and polite requests. Subtract for missing required content.'},
    ],
  },
};
