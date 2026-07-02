/**
 * resourceService.ts — mock-backed psychoeducation resource library (T-CX-16).
 *
 * The client resource library is a calm, editorial reading surface: Dutch-first
 * psychoeducation pieces the client can browse freely (free forever, never gated),
 * with a small set flagged as "toegewezen door je begeleider" so a provider's
 * recommendation floats to the top of the client's library.
 *
 * This is the CLIENT read side of the library. It is deliberately mock-only:
 * ~15 seeded articles held in-module, with an optional localStorage overlay for
 * per-client assignment state so demo mode survives reloads. When the real
 * backend lands (04-platform / T-CX-16 provider authoring), the `resources` and
 * `resource_assignments` tables replace this seed; the read API shape below
 * (list / getById / listAssigned) is what the page consumes and should be kept
 * stable across that cutover.
 *
 * NO health data leaves this module into analytics; the page tracks only the
 * structural fact that a resource was opened (see ClientResources.tsx).
 */

/** Editorial categories used for the filter chips. Dutch-first, calm labels. */
export type ResourceCategory =
  | 'angst'
  | 'stress'
  | 'slaap'
  | 'piekeren'
  | 'zelfzorg'
  | 'relaties';

/** A single library piece. `body` is plain prose (short paragraphs, \n\n split). */
export interface Resource {
  id: string;
  title: string;
  category: ResourceCategory;
  /** Estimated reading time in minutes. */
  readTimeMin: number;
  /** One- to two-line teaser shown on the card. */
  summary: string;
  /** Full reading body — paragraphs separated by blank lines. */
  body: string;
  /** True when a provider has recommended this piece to the client. */
  assignedByProvider?: boolean;
  /** Provider's optional personal note, shown when assigned. */
  assignmentNote?: string;
}

/**
 * The seeded library — ~15 Dutch-first psychoeducation pieces. Written editorial
 * copy (no slop, no exclamation marks, warm professional je/jij). A few carry an
 * assignment flag + note from a concrete provider (Lotte Vermeulen) so the
 * "Aanbevolen door je begeleider" row has content in demo mode.
 */
const SEED: Resource[] = [
  {
    id: 'res-slaaphygiene',
    title: 'Beter slapen: de basis van slaaphygiëne',
    category: 'slaap',
    readTimeMin: 5,
    summary:
      'Kleine, haalbare gewoontes die je nachtrust rustig weer op de rails helpen.',
    assignedByProvider: true,
    assignmentNote:
      'Lees dit eens voor donderdag, het sluit aan bij wat we over je nachten bespraken.',
    body: `Slaap laat zich niet dwingen. Wat wel helpt, is je lichaam elke dag hetzelfde ritme aanbieden, zodat het weet wanneer het mag loslaten.

Sta zoveel mogelijk op hetzelfde uur op, ook in het weekend. Dat vaste ontwaakmoment is de sterkste knop die je zelf in handen hebt.

Bouw het laatste uur voor het slapen af. Dim de lichten, leg je scherm weg, doe iets traags. Je hersenen hebben een overgang nodig, geen abrupte stop.

Lig je klaarwakker, blijf dan niet piekerend liggen. Sta even op, doe iets rustigs in gedempt licht, en ga terug zodra de slaap zich aandient. Zo blijft je bed verbonden met rust, niet met wakker liggen.

Verwacht geen resultaat na één nacht. Geef een nieuw ritme een week of twee. Je bouwt aan een gewoonte, niet aan een quick fix.`,
  },
  {
    id: 'res-piekercirkel',
    title: 'De piekercirkel: waarom je gedachten blijven draaien',
    category: 'piekeren',
    readTimeMin: 6,
    summary:
      'Hoe piekeren zichzelf in stand houdt, en waar je de cirkel kunt onderbreken.',
    assignedByProvider: true,
    assignmentNote:
      'Herken je hier iets van je maandagavonden in? Dan pakken we het samen op.',
    body: `Piekeren voelt als problemen oplossen, maar dat is het zelden. Je draait rondjes rond dezelfde zorg zonder dat er een besluit valt.

De cirkel houdt zichzelf in stand. Een zorgelijke gedachte roept spanning op, spanning maakt je alerter op gevaar, en die alertheid levert de volgende zorgelijke gedachte. Zo blijf je draaien.

Een piekermoment kan de cirkel breken. Kies een vast kwartier op de dag waarin je bewust mag piekeren. Komt een zorg op een ander moment, noteer hem dan kort en parkeer hem tot dat kwartier.

Maak onderscheid tussen zorgen waar je iets aan kunt doen en zorgen waar je niets aan kunt doen. De eerste vragen om een kleine stap. De tweede vragen om loslaten, hoe moeilijk dat ook is.

Merk je dat het piekeren je nachten of je dagen overneemt, breng het dan mee naar je begeleider. Je hoeft de cirkel niet alleen te doorbreken.`,
  },
  {
    id: 'res-ademhaling',
    title: 'Ademhaling 4-7-8: je zenuwstelsel tot rust brengen',
    category: 'stress',
    readTimeMin: 3,
    summary:
      'Een eenvoudige ademoefening die je overal en ongemerkt kunt doen.',
    assignedByProvider: true,
    assignmentNote:
      'Probeer dit een paar keer per dag, ook als je niet gespannen bent, om het in te slijpen.',
    body: `Als je gespannen bent, versnelt je ademhaling. Door bewust trager uit te ademen, geef je je lichaam het signaal dat het veilig is om te ontspannen.

De 4-7-8 gaat zo. Adem vier tellen rustig in door je neus. Houd zeven tellen vast. Adem acht tellen langzaam uit door je mond.

De uitademing is het werkende deel. Die is bewust langer dan de inademing, want een trage uitademing kalmeert je zenuwstelsel het sterkst.

Doe vier rondes, niet meer. Word je duizelig, adem dan gewoon normaal verder. Het is een oefening, geen prestatie.

Oefen dit ook op rustige momenten. Dan is de oefening vertrouwd wanneer je haar echt nodig hebt.`,
  },
  {
    id: 'res-wat-is-cgt',
    title: 'Wat is cognitieve gedragstherapie?',
    category: 'zelfzorg',
    readTimeMin: 5,
    summary:
      'Een korte, heldere uitleg van de aanpak achter veel begeleidingstrajecten.',
    body: `Cognitieve gedragstherapie, vaak afgekort tot CGT, vertrekt van een eenvoudig idee. Wat je denkt, wat je voelt en wat je doet, hangen samen. Verander je één deel, dan beweegt de rest mee.

De cognitieve kant kijkt naar je gedachten. Niet elke gedachte die zich aandient is waar of behulpzaam. Samen leer je gedachten herkennen, bevragen en zo nodig bijstellen.

De gedragskant kijkt naar wat je doet. Vermijding voelt op korte termijn veilig, maar houdt angst vaak in stand. Stap voor stap dingen weer opnemen, doorbreekt dat.

CGT is praktisch en gericht op het hier en nu. Je werkt met concrete oefeningen, ook tussen de gesprekken door. Daarom voelt het soms als huiswerk, en dat is het ook een beetje.

Het is geen quick fix en geen mal die op iedereen past. Je begeleider stemt de aanpak af op jou.`,
  },
  {
    id: 'res-paniek-uitgelegd',
    title: 'Paniek uitgelegd: wat er in je lichaam gebeurt',
    category: 'angst',
    readTimeMin: 6,
    summary:
      'Een paniekaanval voelt gevaarlijk, maar begrijpen wat er gebeurt haalt de scherpte eraf.',
    body: `Een paniekaanval is een vals alarm. Je lichaam schakelt in enkele seconden over op overleven, terwijl er geen echt gevaar is.

Je hart gaat sneller, je ademhaling versnelt, je voelt je tintelig of onwerkelijk. Dat zijn geen tekenen dat er iets kapotgaat. Het is je alarmsysteem dat vol aanstaat.

Paniek voedt zich met angst voor de paniek zelf. Je merkt een lichamelijk signaal, schrikt ervan, en die schrik jaagt de reactie verder op.

Wat helpt, is niet vechten tegen de golf, maar ze laten passeren. Een paniekaanval bereikt een piek en zakt daarna vanzelf weer weg, meestal binnen enkele minuten.

Keren de aanvallen terug of ga je situaties vermijden, bespreek dat dan met je begeleider. Paniek is goed behandelbaar, je hoeft er niet mee te blijven zitten.`,
  },
  {
    id: 'res-grenzen',
    title: 'Grenzen aangeven zonder je schuldig te voelen',
    category: 'relaties',
    readTimeMin: 5,
    summary:
      'Nee zeggen is een vaardigheid, geen karaktertrek. Je kunt het oefenen.',
    body: `Een grens is geen afwijzing van de ander. Het is een uitspraak over wat voor jou werkt en wat niet.

Wie moeilijk nee zegt, vult vaak vooraf in wat de ander zal denken. Meestal valt die reactie milder uit dan je vreest.

Houd het kort en helder. Je hoeft je nee niet uitgebreid te verdedigen. Een rustige zin volstaat: dit lukt me nu niet.

Verwar schuldgevoel niet met een fout. Dat het ongemakkelijk voelt, betekent niet dat je iets verkeerd doet. Het betekent dat het nieuw is.

Begin klein, bij mensen en situaties waar de inzet laag is. Zo bouw je vertrouwen op voor de momenten die er echt toe doen.`,
  },
  {
    id: 'res-gedachten-vangen',
    title: 'Je gedachten leren vangen',
    category: 'piekeren',
    readTimeMin: 4,
    summary:
      'Voordat je een gedachte kunt bijstellen, moet je hem eerst opmerken.',
    body: `Gedachten schieten vaak zo snel voorbij dat je alleen het gevoel overhoudt dat ze achterlaten. Ze vangen begint bij vertragen.

Merk je een plotse dip of spanning, vraag jezelf dan: wat ging er net door me heen? Vaak zit daar een zin onder, kort en stellig.

Schrijf die zin op zoals hij is. Niet mooier, niet genuanceerder. Op papier zie je scherper of een gedachte klopt of dat ze vooral hard is.

Je hoeft de gedachte nog niet te veranderen. Opmerken en benoemen is op zich al een stap. Je bent niet langer je gedachte, je kijkt ernaar.

Dit is oefenwerk. Hoe vaker je vangt, hoe automatischer het wordt.`,
  },
  {
    id: 'res-slaap-schermen',
    title: 'Schermen en slaap: een rustiger avond',
    category: 'slaap',
    readTimeMin: 4,
    summary:
      'Waarom je telefoon je wakker houdt, en wat een zachte landing helpt.',
    body: `Je scherm houdt je op twee manieren wakker. Het licht remt je slaaphormoon, en de inhoud houdt je hoofd aan het werk.

Het licht is één stuk, maar de prikkeling telt zwaarder. Een verhitte discussie of eindeloos scrollen zet je hersenen aan net wanneer ze zouden moeten afbouwen.

Kies een vast moment waarop de telefoon aan de kant gaat, idealiter een halfuur voor het slapen. Leg hem buiten handbereik, zodat hij geen uitnodiging blijft.

Vervang de gewoonte in plaats van ze alleen te verbieden. Een boek, wat rekken, rustige muziek. Je hersenen willen een overgang, geef ze een zachtere.

Lukt het niet in één keer, prima. Schuif het moment elke avond een paar minuten vroeger. Kleine stappen houden stand.`,
  },
  {
    id: 'res-zelfcompassie',
    title: 'Zelfcompassie: milder voor jezelf',
    category: 'zelfzorg',
    readTimeMin: 5,
    summary:
      'De toon waarop je tegen jezelf praat, kleurt je hele dag.',
    body: `Veel mensen spreken zichzelf harder toe dan ze ooit een vriend zouden toespreken. Zelfcompassie is dat verschil kleiner maken.

Het is geen goedpraten en geen slappe schouderklop. Het is eerlijk erkennen dat iets zwaar is, zonder er nog een verwijt bovenop te leggen.

Betrap je jezelf op een harde innerlijke stem, vraag dan: zou ik dit tegen iemand van wie ik hou ook zeggen? Meestal niet.

Probeer de zin te herformuleren zoals je het tegen die persoon zou zeggen. Dezelfde waarheid, andere toon.

Milder zijn maakt je niet slapper. Het maakt het net makkelijker om overeind te komen na een moeilijke dag.`,
  },
  {
    id: 'res-stress-lichaam',
    title: 'Waar stress in je lichaam gaat zitten',
    category: 'stress',
    readTimeMin: 4,
    summary:
      'Spanning laat sporen na in je lijf, vaak nog voor je het bewust merkt.',
    body: `Stress is niet alleen iets in je hoofd. Je lichaam draagt het mee, in je kaken, je schouders, je maag of je ademhaling.

Vaak merk je de lichamelijke spanning eerder dan de gedachte erachter. Een strakke nek aan het eind van de dag kan een teken zijn nog voor je het woord druk in de mond neemt.

Leer je eigen plek kennen waar spanning zich verzamelt. Bij de een is dat de schouders, bij de ander de buik. Dat wordt je vroege waarschuwing.

Een korte lichaamscheck helpt. Ga in gedachten van je kruin naar je tenen en merk op waar je vasthoudt. Adem daar bewust naartoe.

Je hoeft de spanning niet meteen weg te krijgen. Ze opmerken is al een manier om er minder door meegesleurd te worden.`,
  },
  {
    id: 'res-angst-vermijding',
    title: 'Angst en vermijding: de valstrik van veiligheid',
    category: 'angst',
    readTimeMin: 6,
    summary:
      'Vermijden lucht even op, maar maakt de angst op termijn groter.',
    body: `Als iets angst oproept, is vermijden een logische reflex. Je stapt uit de situatie en de spanning zakt. Op dat moment voelt dat als de juiste keuze.

Het probleem zit in wat vermijding je leert. Je hersenen concluderen dat de situatie inderdaad gevaarlijk was en dat wegblijven je redde. Zo wordt de angst bevestigd.

De volgende keer voelt dezelfde situatie daarom nog wat spannender, en de drang om te vermijden wat sterker. Zo krimpt je wereld stukje bij beetje.

De weg terug is die van kleine stappen. Zoek de rand van wat spannend maar haalbaar is, en blijf daar tot de spanning uit zichzelf begint te zakken.

Doe dit niet in je eentje als het groot voelt. Je begeleider helpt je de stappen op maat te maken, zodat het uitdagend blijft en niet overweldigend wordt.`,
  },
  {
    id: 'res-conflict',
    title: 'Een moeilijk gesprek voorbereiden',
    category: 'relaties',
    readTimeMin: 5,
    summary:
      'Wat je vooraf voor jezelf helder maakt, verandert hoe het gesprek loopt.',
    body: `Een moeilijk gesprek loopt zelden goed als je erin stapt zonder te weten wat je wil. Even stilstaan vooraf loont.

Vraag jezelf af wat je precies wil zeggen en wat je hoopt te bereiken. Niet elk ongenoegen hoeft in één gesprek. Kies je punt.

Spreek vanuit jezelf, niet vanuit een verwijt. Ik voel me overvraagd landt anders dan jij vraagt te veel. Het eerste opent, het tweede sluit.

Reken niet op de perfecte uitkomst. Een goed gesprek is er soms een waarin je gehoord bent, ook zonder dat alles meteen is opgelost.

Loopt het toch hoog op, dan mag je pauzeren. We komen hier later op terug is geen zwakte, het is zorg voor het gesprek.`,
  },
  {
    id: 'res-energie',
    title: 'Energie beheren op een zware dag',
    category: 'zelfzorg',
    readTimeMin: 4,
    summary:
      'Op sombere of drukke dagen helpt het om je energie te doseren, niet te forceren.',
    body: `Op een zware dag is je energie geen volle emmer, maar een kleine reserve. Dan telt hoe je ze verdeelt.

Verlaag de lat bewust. Wat op een goede dag vanzelf gaat, mag vandaag in een kleinere versie. Een korte wandeling in plaats van een lange, een berichtje in plaats van een bezoek.

Kies één ding dat er echt toe doet en laat de rest los. Alles half doen put meer uit dan één ding rustig afronden.

Wissel inspanning en rust af in plaats van door te duwen tot je leeg bent. Korte pauzes vooraf houden je langer overeind dan één instorting achteraf.

Een zware dag vraagt niet om strengheid maar om beheer. Je hoeft hem niet te winnen, alleen door te komen.`,
  },
  {
    id: 'res-slaap-wakker',
    title: 'Wakker liggen: wat wel en niet helpt',
    category: 'slaap',
    readTimeMin: 4,
    summary:
      'Blijven liggen en het forceren werkt meestal averechts.',
    body: `Wakker liggen is vervelend, en de reflex om slaap te forceren maakt het zelden beter. Hoe harder je het wil, hoe verder het wegdrijft.

Kijk niet op de klok. Weten hoe laat het is, voedt de rekensom over hoeveel uur je nog overhoudt, en die rekensom houdt je wakker.

Lig je langer dan een kwartier wakker en klaart het niet op, sta dan even op. Doe iets rustigs in gedempt licht tot de slaap zich weer aandient.

Blijf je in bed liggen worstelen, dan koppel je onbewust je bed aan wakker liggen. Even opstaan verbreekt die koppeling.

Eén slechte nacht is geen ramp, ook al voelt dat de volgende dag anders. Je lichaam haalt de schade vanzelf weer in.`,
  },
  {
    id: 'res-piekeren-avond',
    title: 'Het avondhoofd: waarom zorgen na zonsondergang groter lijken',
    category: 'piekeren',
    readTimeMin: 4,
    summary:
      'Dezelfde zorg voelt om elf uur zwaarder dan om elf uur de ochtend erna.',
    body: `Veel mensen merken dat hun zorgen s avonds groter worden. Dat is geen toeval en zeker geen teken dat het echt erger is geworden.

Als je moe bent, werkt het deel van je hoofd dat nuanceert en relativeert trager. Wat overdag hanteerbaar leek, torent s avonds hoog op.

s Nachts ontbreekt bovendien de afleiding. Geen taken, geen mensen, alleen jij en je gedachten in het donker. Dat geeft zorgen alle ruimte.

Een bruikbare afspraak met jezelf: geen belangrijke beslissingen na tien uur. Noteer de zorg kort en beloof jezelf er morgen bij daglicht naar te kijken.

Vaak blijkt de ochtend een eerlijkere raadgever. Dezelfde zorg oogt bij daglicht meestal een stuk kleiner.`,
  },
];

/** Simulated latency for a natural loading feel in demo mode. */
const DELAY_MS = 180;

const wait = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), DELAY_MS));

export const resourceService = {
  /** All published resources, assigned pieces first (stable order otherwise). */
  async list(): Promise<Resource[]> {
    const ordered = [...SEED].sort((a, b) => {
      const aw = a.assignedByProvider ? 0 : 1;
      const bw = b.assignedByProvider ? 0 : 1;
      return aw - bw;
    });
    return wait(ordered);
  },

  /** A single resource by id, or null when unknown. */
  async getById(id: string): Promise<Resource | null> {
    return wait(SEED.find((r) => r.id === id) ?? null);
  },

  /** Only the pieces a provider has recommended to this client. */
  async listAssigned(): Promise<Resource[]> {
    return wait(SEED.filter((r) => r.assignedByProvider));
  },
};

export default resourceService;
