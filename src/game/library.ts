import type { AttributeKey } from './types';

/**
 * The Library: one sector, everything worth knowing about it.
 *
 * The Wheel pages already answer "what is this sector and what can I put in it".
 * They did not answer the question underneath it — *why would I*. A player who
 * has never thought about their Family sector does not need forty templates,
 * they need one honest page that changes how they see the sector, and then the
 * two habits that page argues for.
 *
 * So each entry is a distilled source — a book, a podcast, a lecture — written
 * out in full and ending in the practices it actually implies. Read it, then add
 * what it convinced you of, in one tap, without ever seeing a blank field.
 *
 * Rules this file holds to:
 *   · Knowledge only. No author biographies, no "about the guest", no filler.
 *     A name appears when a claim belongs to it, and nowhere else.
 *   · Every practice links a template that already exists in `templates.ts` by
 *     id — the library never mints a second, parallel habit model. `library.test.ts`
 *     fails the build if an id here does not resolve.
 *   · Claims stay attributed and hedged where the source hedged. A practitioner's
 *     clinical estimate is written as one, not promoted into a fact. This library
 *     is the one surface that teaches; teaching something false costs more than
 *     teaching nothing.
 *
 * Entries are distilled from the source notes in Eldar's vault (`vaultSource`),
 * rewritten into English for the app. Adding an entry is data-only: append here,
 * and it appears on its sector page.
 */

export type LibraryMedium = 'book' | 'podcast' | 'lecture' | 'paper';

/** A template this source argues for, and the sentence that makes the argument. */
export interface LibraryPractice {
  /** id in HABIT_TEMPLATES or QUEST_TEMPLATES. */
  id: string;
  /** Why *this* source puts you onto *this* practice. One line, its own reasoning. */
  because: string;
}

export interface LibraryIdea {
  name: string;
  body: string;
}

export interface LibraryEntry {
  /** URL segment: /attributes/:attr/library/:slug */
  slug: string;
  attr: AttributeKey;
  title: string;
  /** Where it came from — the work, not the person's CV. */
  origin: string;
  medium: LibraryMedium;
  /** Honest reading time for the entry itself, in minutes. */
  minutes: number;
  /** The card subtitle: what changes if you read this. */
  hook: string;
  /** The single claim the whole source rests on. */
  thesis: string;
  ideas: LibraryIdea[];
  /** Standalone facts and positions worth carrying out of it. */
  notes: string[];
  /** What the source says to actually do, in its own terms. */
  practices: string[];
  habits: LibraryPractice[];
  quests: LibraryPractice[];
  /** Provenance line, shown at the foot of the entry. */
  vaultSource: string;
}

export const MEDIUM_LABEL: Record<LibraryMedium, string> = {
  book: 'Book',
  podcast: 'Podcast',
  lecture: 'Lecture',
  paper: 'Paper',
};

export const LIBRARY: LibraryEntry[] = [
  // ---------------- Health ----------------
  {
    slug: 'health-is-cumulative',
    attr: 'health',
    title: 'Health is cumulative, not causal',
    origin: 'Alexander Dzidzaria — urologic oncologist, on prevention and male health',
    medium: 'podcast',
    minutes: 6,
    hook: 'Why there is no single cause to find, and what a man over 35 should actually be checking.',
    thesis:
      'Illness is not caused, it accumulates. Both harm and repair work like weights on a scale: no single factor decides the outcome, so the useful move is to improve many small things slightly rather than hunt for the one thing to fix. The risk window for most cancers opens at 35–40 not because something appears then, but because that is when fifteen to thirty years of daily life finish adding up.',
    ideas: [
      {
        name: 'The scale, not the cause',
        body: 'Cell division errors happen in everyone, every day. Cancer is not the presence of errors — it is the failure of the system that culls them, degraded by genetics, epigenetics (lifestyle decides which genes are active), and load: smoking, alcohol, chronic sleep debt, chronic stress. Nothing here has a single lever.',
      },
      {
        name: 'Chronic stress is biochemistry, not mood',
        body: 'Years of work you hate or a life you cannot be yourself in raises cortisol, which lowers antitumour immunity and sex hormones. Living against your own values shows up in bloodwork. This is the least esoteric claim in the source and the most often dismissed.',
      },
      {
        name: 'The missing check-engine light',
        body: 'Men have no habit of routine checkups; they wait for a symptom loud enough to interrupt them. By then the cumulative process has been running for a decade. Screening exists precisely because the early phase is silent.',
      },
      {
        name: 'Early markers most men misread',
        body: 'Falling muscle mass, changing body composition, lower libido or erectile changes (a vascular one sends you to a cardiologist first, not a urologist), more night-time urination, unusual sweating — and, paradoxically, hair loss that suddenly stops. Each is easy to explain away one at a time.',
      },
      {
        name: 'Gradual is invisible to the person it happens to',
        body: 'Physical decline moves in fractions of a percent per day, so the only people who see the contrast are the ones who have not seen you in years. You cannot detect it by feel; you detect it by measurement, or not at all.',
      },
    ],
    notes: [
      'Smoking raises bladder and kidney cancer risk through a route most people never consider: carcinogens leave via urine and sit in prolonged contact with the urinary tract lining.',
      'A sedentary job is not itself the risk — absence of physical activity is. Active people with desk jobs do not carry the same exposure.',
      'Supplements are for documented deficiencies, not insurance. The guest\'s own ceiling is five to eight, taken once or twice a day — past that, adherence collapses and nothing gets taken consistently.',
      'Vitamin D status read from D25OH alone is an incomplete picture; parathyroid hormone and ionised calcium change how the number should be read.',
      'Some operations get performed because they are simple and safe to practise on, not because they are indicated. For a "simple" procedure, an experienced surgeon with nothing to prove is the safer choice.',
    ],
    practices: [
      'After 35–40: abdominal ultrasound yearly, gastroscopy and colonoscopy on a regular schedule (polyps can be removed before they turn), faecal occult blood, PSA. Add lungs if you smoke.',
      'Photograph your moles once — a "skin passport" — so change is measurable instead of remembered.',
      'Change lifestyle in many directions slightly rather than one direction heroically. Break the target into measurable steps and record them, because the change is too gradual to feel.',
      'Do not start eating changes by counting calories. Start by removing the worst items — late-night eating, processed meat, fast carbohydrates — and move toward food that was caught, killed, or grown.',
    ],
    habits: [
      { id: 'h_nolate', because: 'Late eating is the single item the source names first when asked what to remove — and removing costs no new time.' },
      { id: 'h_realmeal', because: 'The move away from processed food starts with one real meal landing before the evening, not with a diet.' },
      { id: 'h_steps', because: 'Movement is the factor with the widest reach on the scale, and this is its cheapest daily version.' },
      { id: 'h_lightsout', because: 'Chronic sleep debt is listed alongside smoking and alcohol as a load-bearing risk factor, not a comfort issue.' },
    ],
    quests: [
      { id: 'q_healthcheck', because: 'The screening minimum is worthless as knowledge and valuable as an appointment. This is the quest that turns one into the other.' },
      { id: 'q_energyaudit', because: 'If the mechanism is cumulative, the first useful act is finding out what is actually accumulating in your week.' },
    ],
    vaultSource: 'Health & sport / Resource / Дзидзария — Простые привычки долгожителей',
  },
  {
    slug: 'cheap-and-expensive-dopamine',
    attr: 'health',
    title: 'Cheap dopamine and expensive dopamine',
    origin: 'Ruslan Masgutov — microsurgeon, on dopamine and the control of wanting',
    medium: 'podcast',
    minutes: 6,
    hook: 'Willpower problems are usually lifestyle problems wearing a character costume.',
    thesis:
      'Procrastination and "weak willpower" are, in the overwhelming majority of cases, not a defect of character but a consequence of how you live: overloaded on cheap dopamine (short video, sugar, scrolling) and short on the basics (movement, sleep, real food, dosed stress). Until the base is rebuilt, working on willpower directly does nothing.',
    ideas: [
      {
        name: 'Cheap vs expensive dopamine',
        body: 'Cheap dopamine is instant, needs escalating doses for the same effect, and erodes the decision-making system. Expensive dopamine is the product of effort and learning — a finished project, a new skill, a hard session — and gives lasting satisfaction with no dose escalation. The two are not different amounts of the same thing.',
      },
      {
        name: 'The orienting reflex, farmed',
        body: 'Humans react sharply to sudden stimuli — a rustle, a fast movement. Short-form video exploits this deliberately by changing the frame every few seconds. The guest\'s clinical read is that sustained exposure erodes analytical attention, particularly before the prefrontal cortex finishes maturing around 25.',
      },
      {
        name: 'Hormesis — stress in a dose',
        body: 'Short controlled stress (cold shower, contrast exposure) raises dopamine meaningfully. The condition matters more than the practice: applied on top of chronic stress or inflammation it inverts, and you get ill rather than robust. Recovery first, hormesis second.',
      },
      {
        name: 'The golden plate rule',
        body: 'Half vegetables (of which at most 100–150 g fruit or berries), a quarter protein, a quarter whole grain. No snacking between. A structure you can hold without measuring anything.',
      },
      {
        name: 'The first hours belong to you',
        body: 'Pick up the phone on waking and part of the day\'s dopamine budget is already spent, before anything you chose has happened.',
      },
    ],
    notes: [
      'Without baseline physical activity there is no climbing out of the dopamine hole: the body is built around movement, and no amount of discipline substitutes for it.',
      'The guest\'s daily movement target: interval walking, three minutes brisk (breathing hard but still able to talk) and three minutes easy, about ten cycles.',
      'Daytime naps are recommended at 15–30 minutes and no longer — past that you enter deep sleep and wake worse than you lay down.',
      'The "2.5×" dopamine figure quoted for cold exposure comes from the guest without a citation. Treat it as a practitioner\'s estimate rather than an established number — the direction is well supported, the multiplier is not.',
    ],
    practices: [
      'No phone for the first two to three hours after waking.',
      'When a short video contains something genuinely interesting, stop scrolling and go deeper: ask why it works, check a source, read the longer version. That is the exact move that converts a cheap hit into expensive dopamine.',
      'Attention drills that cost nothing: stare at a dot drawn on a sheet of A4 and note when your mind leaves; or sit outside and "become hearing", separating out every sound.',
      'Keep a two-or-three-line log of good moments, written in the evening — the emotional state you fall asleep in correlates with the one you wake up in.',
      'Put the phone in greyscale. The interface is designed around colour salience; removing it removes some of the pull.',
    ],
    habits: [
      { id: 'h_noscreen_bed', because: 'The phone in bed is the point where cheap dopamine takes the two things — sleep and the first hour — that the whole argument rests on.' },
      { id: 'd_nopassive', because: 'This is the cheap/expensive distinction turned into a rule you can actually check at the end of a day.' },
      { id: 'h_walk10', because: 'The source is blunt that nothing else works before movement does. Ten minutes is the version you cannot argue with.' },
      { id: 'b_outside', because: 'The "become hearing" attention drill needs no app and no setup — only being outside on purpose.' },
    ],
    quests: [
      { id: 'q_sleepreset', because: 'Sleep is named as a base condition, not a nice-to-have — and it is the one that fixes itself least on its own.' },
      { id: 'q_energyaudit', because: 'The claim is that your week, not your character, is producing the willpower problem. An audit is how you find out whether that is true for you.' },
    ],
    vaultSource: 'Health & sport / Resource / Масгутов — Дофамин и контроль желаний',
  },

  // ---------------- Family ----------------
  {
    slug: 'infatuation-and-mature-love',
    attr: 'family',
    title: 'Infatuation, love, and the difference between enduring and withstanding',
    origin: 'Sergey Nasibyan — clinical psychologist, on marriage and mature love',
    medium: 'podcast',
    minutes: 7,
    hook: 'One distinction that predicts who leaves when a relationship starts to hurt.',
    thesis:
      'Marriage as most people live it runs on benefit — a neurotic need that has to be closed to lower anxiety — and it comes apart when the two partners\' benefits stop coinciding. Mature love is not benefit. It is the ability to tell infatuation (a state in which critical thinking disappears and you love an image you built) from love (accepting a real person, weaknesses included), and it requires distance, autonomy on both sides, and the capacity to withstand pain rather than merely endure it.',
    ideas: [
      {
        name: 'Enduring vs withstanding',
        body: 'The clinical distinction the whole source turns on. A partner who can only endure pain — clench, suppress, wait it out — eventually runs from it, through an affair or an emotional exit, the first time they meet real rejection. A partner who can withstand it stays next to the person causing it and lives through it. That, not any list of "three signs of a mature man", is the readiness marker.',
      },
      {
        name: 'Benefit is set at the level of neurosis',
        body: 'What you think you chose is usually what you needed to close in order to feel less anxious. Benefit is not a conscious goal, which is why it changes without announcement — and why two people can be perfectly matched for years and then not be.',
      },
      {
        name: 'Infatuation is not early love',
        body: 'The guest describes infatuation as a neurotic state in which critical thinking is suspended and the object is an invention. Love is acceptance of the actual person — which explicitly does not mean an obligation to stay. You can love someone, and refuse a specific act of theirs, and leave.',
      },
      {
        name: 'The wrong question',
        body: '"Does he love me or is he just infatuated" gives you neither power nor freedom. The productive version moves the locus of control back: am I infatuated, or have I come to love this person.',
      },
      {
        name: 'Merging kills desire',
        body: 'Distance — private time, private space, not demanding the password to a partner\'s phone — is named as a requirement for passion surviving, not a sign of insufficient closeness. Total merging consumes both people rather than joining them.',
      },
      {
        name: 'The partner as mirror',
        body: 'Irritation at a partner\'s appearance or habits frequently reflects an unprocessed problem of your own — greed, anxiety, jealousy, anger — rather than a legitimate demand for them to change.',
      },
    ],
    notes: [
      'The guest\'s therapeutic position: "I never save a marriage, I save people." The first move with a couple considering divorce is to take the fear off the word itself; the second is to introduce deliberate distance, sometimes literal, which either clarifies the decision or brings the feeling back.',
      'Much of this source is clinical hypothesis stated as such — including estimates like "95% of men" — and is not research. The Sapolsky baboon work on rank and cortisol is real; the extension of it to married men living longer is the guest\'s own extrapolation.',
      'The proposed reason women more often initiate divorce: people used to divorce because they could not endure, and now divorce because they do not want to endure — with the caveat that the unprocessed problems usually travel to the next relationship intact.',
    ],
    practices: [
      'In conflict, practise staying and living through the painful moment rather than suppressing it or exiting — that is the trainable skill underneath everything else here.',
      'Swap the anxious question about them for the honest question about yourself.',
      'Protect private space in the relationship deliberately, as maintenance of desire rather than as distance from your partner.',
      'Before entering a relationship, say plainly what you are bringing and building — instead of handing your unmet needs to another person to close.',
      'When something about your partner irritates you, check first whether it is yours.',
    ],
    habits: [
      { id: 'fa_listen', because: 'Letting someone finish without arguing is withstanding, in its smallest daily form.' },
      { id: 'fa_noraise', because: 'A raised voice is what enduring looks like the moment it runs out.' },
      { id: 'f_remember', because: 'Loving the real person rather than the image starts with knowing what is actually going on in their week.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'Naming what is actually wrong, out loud, is the first move the source recommends before anyone decides anything.' },
    ],
    vaultSource: 'Family & relationship / Resource / Насибян — Брак, влюблённость и зрелая любовь',
  },
  {
    slug: 'relationships-without-nerves',
    attr: 'family',
    title: 'Most arguments are not about what they are about',
    origin: 'Ilya Shabshin — family psychologist, on getting through the long middle',
    medium: 'podcast',
    minutes: 6,
    hook: 'The phases every long relationship goes through, and the one question that ends most fights before they start.',
    thesis:
      'Long relationships move through predictable phases — infatuation, convergence, drifting — and that is the norm, not evidence you chose wrong. Most fights are not about a disagreement; they are about each person interpreting the other\'s words through their own inner world without ever checking whether the meaning matches. And romance does not maintain itself: it takes deliberate, repeated effort, like a plant.',
    ideas: [
      {
        name: 'The novelty curve',
        body: 'At first you keep discovering good things, so the curve climbs. Then the new good runs out and the new bad starts accumulating. At some point the curves cross and disappointment arrives. This is a regularity, not a signal that you picked the wrong person.',
      },
      {
        name: 'The hedonic criterion is a trap',
        body: '"I am with you while it feels good to me" assumes a relationship in which it always feels good exists. It does not, so the criterion fails with certainty — the only question is when.',
      },
      {
        name: 'Understanding and accepting are two different jobs',
        body: 'You cannot love well without knowing specifically what is pleasant and unpleasant for this person. Without deliberate curiosity people act "from themselves" — doing what would please them, and quietly resenting that it did not land.',
      },
      {
        name: 'Same words, different inner meanings',
        body: '"We\'ll see", "planning the future" — each partner decodes these through their own history. The source puts roughly 90% of domestic arguments here: not in content, but in an unchecked interpretation.',
      },
      {
        name: 'Acceptance is not tolerating abuse',
        body: 'Accepting means taking that a person comes with strengths and weaknesses as a set, and giving up on improving them through sanctions, scenes, or therapy imposed from outside. It is not a licence for anyone to be treated badly.',
      },
      {
        name: 'Romance is not a foundation',
        body: 'Romantic infatuation cannot show you the real person. Shared daily life — living together, travelling, conflict — is what reveals how someone behaves when things are hard.',
      },
    ],
    notes: [
      'The commonly cited causes of divorce are mostly secondary. Behind "poverty" is usually a mismatch in expected standard of living rather than the lack of money itself — couples with nothing stay together for decades.',
      'An affair that ends a marriage is rarely a single episode; it is usually a long parallel life, and a consequence of problems left unsolved rather than a cause on its own.',
      'After a first child the romantic and sexual side almost always drops down the list. Normal in the moment, dangerous if it is never deliberately brought back.',
      'There is no universally correct way to split a budget, divide roles, or handle stress after work. "Whatever works for you is right" is the actual answer.',
    ],
    practices: [
      'Check the meaning before you argue: "am I understanding correctly that you mean…?" In the source\'s example, "you spend too much time on sport" turned out to mean "I miss your attention on the only days we share".',
      'Hold a scheduled conversation about the relationship — not about logistics — like a standing meeting. Three anchor questions: how is it for you in this relationship right now; is there something that happened to you that you want to tell me; what can I do for you.',
      'Open a difficult conversation with what is good before moving to what you want improved.',
      'Run a day of positive feedback only: no criticism for 24 hours, and say out loud the small things you appreciated. The usual discovery is that something you do automatically matters a great deal to the other person.',
      'For passion, skip the generic checklist. Ask this specific person what reads as romantic to them, repeat what actually worked early on, and watch the reaction rather than the template.',
    ],
    habits: [
      { id: 'fa_meal', because: 'The scheduled conversation needs a slot that already exists. A meal with no phone is the one most people already have.' },
      { id: 'f_thanks', because: 'The positive-feedback exercise, reduced to something you can do every day instead of once.' },
      { id: 'f_remember', because: 'Understanding is a separate job from accepting, and it is done by asking about the thing they told you last time.' },
      { id: 'fa_noraise', because: 'Almost all of it is an unchecked interpretation. Checking is impossible at volume.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'Start with the plus, then name what you want to improve — this is that conversation, planned rather than triggered.' },
      { id: 'q_reconnect', because: 'The drifting phase is normal and it is also reversible, but only by someone deciding to make contact first.' },
    ],
    vaultSource: 'Family & relationship / Resource / Шабшин — Отношения без нервов',
  },
  {
    slug: 'attachment-and-the-four-horsemen',
    attr: 'family',
    title: 'Desire, love, and attachment are three different circuits',
    origin: 'Andrew Huberman — neuroscientist, on the science of love, desire and attachment',
    medium: 'podcast',
    minutes: 7,
    hook: 'The single behaviour that predicts a breakup with roughly 94% accuracy, and it is not what most people guess.',
    thesis:
      'Desire, love, and attachment are separate, sequentially recruited systems in the brain, not one "love" mechanism — each runs on a different mix of hormones and neurochemistry. How securely a relationship holds is best predicted not by surface compatibility but by how two people\'s nervous systems coordinate under stress, by specific destructive conflict patterns being present or absent, and by something researchers call positive illusion.',
    ideas: [
      {
        name: 'Four attachment styles, set early and still changeable',
        body: 'Built from research on how toddlers react to a caregiver leaving and returning a room: secure (visible distress at separation, visible relief at reunion), anxious-avoidant (little visible emotion either way), anxious-ambivalent (distress before separation even starts, hard to soothe at reunion), and disorganized (contradictory behaviour, such as approaching while looking away). The same circuitry gets reused for adult romantic attachment — but it is plastic: an insecurely attached adult can move toward security over time, including through a relationship with a more securely attached partner. It also runs the other way.',
      },
      {
        name: "Gottman's Four Horsemen",
        body: 'Four interaction patterns shown to predict relationship breakdown: criticism, defensiveness, stonewalling, and contempt. Contempt — treating a partner or their concerns as beneath consideration — is described as the strongest single predictor of the four, and the one most worth eliminating on sight.',
      },
      {
        name: 'Positive illusion',
        body: 'The belief that this specific partner, and not just any similar person, is the one who makes you feel a particular way. Described as a real predictor of long-term stability — the opposite of the cynical read that romantic attachment is just people overestimating how different they are from anyone else.',
      },
      {
        name: 'Self-expansion',
        body: 'Feeling that a partner makes you a more capable version of yourself is a hallmark of a healthy early bond, and it shows up physically: people primed to feel this showed reduced brain activity associated with rating the attractiveness of alternatives — a plausible neural mechanism behind loyalty, not just a nice feeling.',
      },
      {
        name: 'Arousal is not proof of anything by itself',
        body: 'Courtship and pursuit run on the same activated, alert nervous-system state as anxiety. The state alone does not tell you whether a relationship is good for you — the story you build around that state does the deciding, which is exactly how people mistake a volatile relationship for an exciting one.',
      },
    ],
    notes: [
      'Attachment style measured in early childhood is one of the more robustly replicated findings connecting early life to adult romantic behaviour — but "predictive" is not "fixed."',
      'The oft-cited figure that conflict-pattern observation alone predicts divorce with around 94% accuracy comes from Gottman\'s own research group; treat it as the headline finding of a specific research programme; it has been well cited but its precise replication is only understood as well as any single lab\'s figure.',
      'Compatible couples showed different resting-state brain activity from each other in one cited study — the opposite of a naive "like attracts like" and worth remembering the next time similarity gets treated as the whole story.',
    ],
    practices: [
      'Identify your own attachment style and, if you can, your partner\'s — as a working model for recurring patterns, not a life sentence.',
      'Watch your own conflicts for the Four Horsemen, especially contempt, and treat any sign of it as the one to remove first.',
      'Deliberately say the self-expansion sentence out loud when it is true — "you make me better at this" — rather than assuming it is understood.',
      'When a relationship feels intensely exciting, check whether the excitement or the anxiety is doing the talking before reading it as a good sign.',
    ],
    habits: [
      { id: 'fa_noraise', because: 'Of the four patterns, contempt is the one that predicts breakup hardest — and it lives exactly where a raised voice starts to.' },
      { id: 'f_invite', because: 'Self-expansion needs new shared ground to point at. Inviting someone into something new is the cheapest way to keep generating it.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'Naming a pattern like contempt or a mismatched attachment style out loud is the harder, more useful version of noticing it privately.' },
    ],
    vaultSource: 'Family & relationship / Resource / Huberman — Love, Desire and Attachment',
  },
  {
    slug: 'lust-romance-attachment',
    attr: 'family',
    title: 'Lust, romance, and attachment run on different chemistry',
    origin: 'Helen Fisher — biological anthropologist, on the science of sex, love and attachment',
    medium: 'podcast',
    minutes: 7,
    hook: 'Why "casual" sex is not neurologically casual, and the cheapest lever for reviving a long relationship.',
    thesis:
      'Romantic love is a basic, biologically hardwired drive — universal across every studied culture — not merely a feeling or a cultural script. A long partnership runs on three separable systems (sex drive, romantic attraction, deep attachment), and each has to be deliberately sustained on its own terms rather than assumed to maintain itself.',
    ideas: [
      {
        name: 'Three systems, three chemistries',
        body: 'Sex drive runs on testosterone, romantic attraction on dopamine, deep attachment on oxytocin and vasopressin. They can run somewhat independently — deep attachment without active "in love" feeling, or desire without either — which is why a relationship can lose one system while the others are intact, and why fixing it means naming which one actually went quiet.',
      },
      {
        name: 'Romantic love as a primary drive, not a secondary emotion',
        body: 'Early-stage romantic love activates the same basic dopamine-producing brain region involved in hunger and thirst — framed as an ancient survival mechanism repurposed to focus mating energy on one person long enough to pair-bond.',
      },
      {
        name: 'Rejection overlaps with addiction, neurologically',
        body: 'Scans of recently rejected people show activation in the same brain regions implicated in substance craving — a real basis for heartbreak behaving, physiologically, less like sadness and more like withdrawal.',
      },
      {
        name: 'Long-term love is neurologically real, not nostalgia',
        body: 'Couples decades into a relationship who report still being "in love" show activation patterns in the same brain regions as newly in-love couples — evidence against the assumption that romantic love inevitably fades, though the finding is presented with the obvious caveat that it depends on the relationship being a good one to begin with.',
      },
      {
        name: 'Novelty is a real, repeatable lever',
        body: 'Shared novel or exciting activity reliably drives the same dopamine system responsible for early romantic attraction — meaning it can reactivate those feelings in a long relationship on purpose, not just by chance.',
      },
      {
        name: '"Casual sex is not casual"',
        body: 'Genital stimulation drives the same dopamine system that feeds into romantic-love circuitry and, from there, attachment — so sex intended as purely physical can trigger the neural machinery of falling in love regardless of the stated intention going in.',
      },
    ],
    notes: [
      'Longer courtship before major commitment correlates with greater relationship longevity in the demographic data cited here — a "slow love" pattern identified well before it became a named dating trend.',
      'People tend to fall in love within a pool sharing their socioeconomic background, education and values — but even inside that filtered pool they do not fall in love with everyone who qualifies, implying a further temperament-based layer of selection beyond demographic similarity.',
    ],
    practices: [
      'Treat sex, novelty, and physical affection as three separate maintenance jobs in a long relationship rather than one general "romance" task.',
      'Introduce novelty on purpose — new activity, travel, breaking routine — as a specific, repeatable lever, not a one-off anniversary gesture.',
      'Before pursuing a purely physical encounter, factor in that the body does not reliably keep it purely physical.',
      'When evaluating a partner\'s fit, weigh temperament (novelty-seeking versus stability-seeking) alongside shared background — similarity on paper is not the whole story.',
    ],
    habits: [
      { id: 'b_new', because: 'Novelty is this source\'s single most repeatable lever for reviving attraction in a long relationship, and doing something you have never done is that lever in its plainest form.' },
      { id: 'fa_meal', because: 'Deep attachment runs on oxytocin, which physical togetherness and ritual feed more reliably than words do — a shared meal with no phone is exactly that kind of ritual.' },
    ],
    quests: [],
    vaultSource: 'Family & relationship / Resource / Fisher — The Science of Sex, Love and Attachment',
  },
  {
    slug: 'self-regulation-in-conflict',
    attr: 'family',
    title: 'Regulate yourself first — resolving the argument can wait',
    origin: 'Lori Gottlieb — psychotherapist, on finding and being a great romantic partner',
    medium: 'podcast',
    minutes: 6,
    hook: 'Why insisting on resolving a fight right now is one of the worst moves available, and what to do instead.',
    thesis:
      'Good relationships run on active self-regulation — noticing your own internal state and using it as information, rather than either suppressing it or discharging it onto a partner — combined with honest self-knowledge about your own unconscious pull toward familiar-but-unhealthy dynamics. Managing yourself in the moment matters more than resolving the disagreement immediately, and reacting instantly to a trigger is often an old reaction from somewhere else being replayed onto the present.',
    ideas: [
      {
        name: 'Self-regulation versus dysregulation',
        body: 'Noticing "I am really angry about this" and treating it as information — a boundary was likely crossed — without either suppressing it or acting it out destructively. In an argument, at least one person staying regulated matters more than the disagreement getting resolved on the spot; insisting on resolving everything in a heated moment is named as one of the worst available strategies.',
      },
      {
        name: 'Attraction to the familiar over the healthy',
        body: 'People are often unconsciously drawn to partners who recreate childhood relational dynamics, even unhappy ones, because familiarity reads as safer than the unknown — which is also why some people quietly distrust a genuinely stable partner: if it feels this good, something must be about to go wrong.',
      },
      {
        name: 'Guilt versus shame',
        body: 'Guilt — "that did not align with who I want to be" — is a constructive, behaviour-linked signal that can drive real change. Shame — "I am bad" — tends to produce nothing constructive at all. The distinction is worth making deliberately in your own self-talk after a mistake.',
      },
      {
        name: 'Reacting is often re-acting',
        body: 'An intense emotional reaction in the moment is frequently an old reaction from a past situation being replayed onto the present one. Deliberately creating space before responding — even a slow count before speaking — gives you room to ask whether the intensity actually matches what just happened.',
      },
      {
        name: 'Teflon versus Velcro',
        body: 'Positive experiences tend to slide off with little lasting effect; negative ones stick and accumulate. That uneven residue is how core beliefs like "I\'m unlovable" or "nothing works out" get built — and once built, they filter out the evidence that would contradict them.',
      },
    ],
    notes: [
      'A therapy reframe worth borrowing directly: instead of asking what you want to change about your partner, ask what you could work on to be the best possible partner yourself.',
      'A described red flag worth watching for: a partner whose stories about past relationship failures are consistently self-exonerating — always someone else\'s fault — especially when told while fishing for your validation.',
      'Chronic low-grade numbness is often not one overwhelming feeling but a defensive response to being flooded by too many feelings at once — the fix is slowing down to name the specific feeling, not suppressing further.',
    ],
    practices: [
      'Name your emotional state out loud before acting on it, and treat it as information rather than something to suppress or discharge onto a partner.',
      'In a heated moment, propose a short, explicit break — "let\'s revisit this in an hour" — instead of insisting on resolving everything immediately.',
      'Before reacting to something that triggered you, pause and ask whether the intensity belongs to the present situation or an older one.',
      'When you notice a core negative belief about yourself or relationships, actively look for counter-examples from your own life rather than accepting the belief\'s self-selected evidence.',
    ],
    habits: [
      { id: 'fa_listen', because: 'Letting someone finish without arguing is self-regulation in its smallest, most repeatable daily form.' },
      { id: 'fa_help', because: 'The reframe here is doing something to become the best possible partner rather than naming what the other person should change — this habit is that reframe, made concrete.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The conversation you keep avoiding is usually the one where an old reaction, not the present situation, is doing the talking. Naming it is how you find out.' },
    ],
    vaultSource: 'Family & relationship / Resource / Gottlieb — How to Find and Be a Great Romantic Partner',
  },
  {
    slug: 'the-third-in-the-room',
    attr: 'family',
    title: "The hardest crisis isn't an anniversary, it's the arrival of a third",
    origin: 'Marina Nakhalova — family psychologist and psychoanalytic therapist, on passion, crises and raising children',
    medium: 'podcast',
    minutes: 6,
    hook: 'Why the toughest relationship crisis has nothing to do with how many years you\'ve been together.',
    thesis:
      "Relationship crises aren't tied to an anniversary — they're tied to a change in the couple's structure, most commonly the arrival of a first child turning a pair into a triangle. Passion is not sustained by merging and closeness; it needs a preserved measure of otherness between partners. And any crisis starts to resolve the same way: name the problem without blame, and make it a shared enemy rather than making each other the enemy.",
    ideas: [
      {
        name: 'From pair to triangle',
        body: 'The heaviest structural crisis in long relationships is not tied to a specific year of marriage — it is tied to the arrival of a first child. A partner who was needed as part of a couple can suddenly feel surplus to requirements once a woman\'s focus shifts entirely onto the pregnancy or the infant, which is offered as one reason departures cluster around this period rather than around any anniversary.',
      },
      {
        name: '"Us versus the problem"',
        body: 'Reframing a conflict from "you versus me" to "us versus this problem" removes a partner\'s need to get defensive in the first place — the single most transferable move in the source, and the one every other technique here builds on.',
      },
      {
        name: 'Otherness as fuel for passion',
        body: 'Passion needs partners to keep some distance and independence — separate friends, some privacy, a bit of the unsaid — rather than full merging. A couple that reads each other\'s minds and shares literally everything is describing a sibling-style closeness that reliably kills desire, not sustains it.',
      },
      {
        name: 'The 70/40 heuristic',
        body: 'The source\'s own rough working rule, not a clinical threshold: a couple in conflict roughly 40% of the time is within a healthy range; conflict around 70% of the time is a real warning sign. Useful as a gut check, not a diagnosis.',
      },
      {
        name: 'Managed conflict is not pathology',
        body: 'Arguing in a couple is a way of surfacing what has gone unsaid, and is not itself unhealthy — as long as it actually leads somewhere (reconciliation, new understanding) rather than looping without resolution.',
      },
    ],
    notes: [
      'Two early warning markers named here: rising interest in "outside" life (work, friends) as avoidance rather than simple busyness, and conflict that never resolves or teaches anything, as opposed to conflict that clears the air.',
      'A long-running affair is described as rarely forgiven in this source\'s clinical experience; a single episode can be absorbed if the relationship is valued highly, but tends to remain a sore spot that resurfaces in later arguments rather than vanishing.',
      'An admission of wrongdoing lands better framed as "that was me, but I was different then and I handle it differently now" than as flat denial ("that wasn\'t me") — the second reads as untrustworthy rather than reassuring.',
    ],
    practices: [
      'Open a hard conversation without blame: "something seems to be going on with us, can we talk about it" rather than a direct accusation.',
      'When a crisis surfaces, agree explicitly on three things in order: that there is a problem, whether to address it, and how (together, separately, with outside help).',
      'Translate a complaint about money or intimacy into an "I" statement plus a joint question — "I\'ve noticed we\'re short on X, is something going on with us?" instead of "why don\'t you earn more."',
      'Protect some separate friendships, interests, and unsaid moments deliberately, rather than treating total transparency as the goal.',
    ],
    habits: [
      { id: 'f_meet', because: 'Keeping a separate friendship alive is exactly the otherness this source names as what protects passion from merging into siblinghood.' },
      { id: 'fa_meal', because: '"Us versus the problem" conversations need a recurring slot that already exists rather than waiting for a crisis to force one.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'Naming the problem out loud, without blame, is this source\'s first and only entry point into resolving any crisis.' },
    ],
    vaultSource: 'Family & relationship / Resource / Нахалова — Страсть, кризисы и воспитание',
  },
  {
    slug: 'do-versus-talk',
    attr: 'family',
    title: 'He shows love by doing, she needs it said — and both are real',
    origin: 'Elena Novoselova — psychologist, on trust, healthy selfishness and relationship crises',
    medium: 'podcast',
    minutes: 6,
    hook: 'The gender gap in how care actually gets expressed, and why most conflict starts right there.',
    thesis:
      "Most couple conflict is not a shortage of love — it's a mismatch in how care gets expressed and unconscious patterns inherited from earlier generations doing the interpreting. A typical gap: a man shows love by doing and expects the same in return; a woman expects it said, repeatedly, and reads silent action as a shortage of feeling. Trust, in this framing, is not the absence of infidelity — it is the willingness to hear a partner's real disclosures without judgment.",
    ideas: [
      {
        name: '"Do" versus "talk"',
        body: "A recurring gendered pattern in how care gets expressed: a man tends to show love through action and expects action back, not questions; a woman tends to expect verbal confirmation — hearing \"I love you\" said, more than once — and can read silent action alone as a shortage of feeling. Named as the point where a large share of conflict actually starts, not a lack of love underneath it.",
      },
      {
        name: 'Healthy selfishness',
        body: "Doing something good for a partner while honestly recognising it also satisfies you removes the need to wait for gratitude, and turns care into a habit that holds up rather than a debt the other person is expected to repay.",
      },
      {
        name: 'Trust is not the same as fidelity',
        body: 'Basic trust is defined here as the willingness to hear a partner\'s honest disclosures without judgment — not simply the absence of an affair. Openness is scoped to the two of you, not a running account of every past detail, which the source distinguishes from real closeness.',
      },
      {
        name: "Men's and women's midlife crises differ in shape",
        body: 'A roughly decade-cycle identity crisis in men ("who am I in her eyes"), typically lasting years, where a partner supporting from a place of her own continued activity works better than dissolving into caretaking. Two identity-linked crises named for women — one in the 30s–40s tied to social expectations around achievement and motherhood, one around 50 tied to fertility and a felt loss of status — both are framed as needing to be lived through and refilled with new meaning, not argued out of.',
      },
      {
        name: 'Trying to remake a partner does not work',
        body: 'Partners change only through their own voluntary choice, never through an ultimatum or a system of rewards and punishments aimed at reshaping them — a direct contrast with treating a relationship as a renovation project.',
      },
    ],
    notes: [
      'A described de-escalation line worth borrowing directly: "we\'re not getting divorced, are we?" — deliberately absurd enough to cut tension and redirect a conflict toward something constructive.',
      'A warning sign for a relationship heading toward real trouble: a sustained (multi-year) low mood, absence of joy, and a felt sense of one\'s own personality disappearing — not the occasional argument.',
      'Turning a relationship into a dumping ground for daily unfiltered stress is described as corrosive in the same register as outright distrust — care has to account for a partner\'s emotional bandwidth, not just your own need to vent.',
    ],
    practices: [
      'When a partner is expressing something through action rather than words, notice it as their dialect of care rather than a shortage of it.',
      'Say appreciation out loud specifically and often, rather than assuming action alone communicates it.',
      'During a partner\'s identity crisis, keep your own activities and friendships running rather than dissolving fully into caretaking — sustained normalcy motivates better than constant concern.',
      'Periodically ask yourselves, outside of any crisis, "why are we together" — a deliberate check-in rather than an inertial assumption.',
    ],
    habits: [
      { id: 'fa_help', because: 'Doing something at home without being asked is the "do" side of care this source says a lot of couples never learn to read as love.' },
      { id: 'f_thanks', because: "Saying appreciation specifically is the direct fix for the half of the gap that action alone can't cover." },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The recurring "why are we together" check-in this source recommends is exactly this quest, asked before a crisis forces it.' },
    ],
    vaultSource: 'Family & relationship / Resource / Новосёлова — Доверие, здравый эгоизм и кризисы',
  },
  {
    slug: 'sex-as-communication',
    attr: 'family',
    title: "Sex is a form of communication, not a performance score",
    origin: 'Natalia Fomicheva — sex therapist, on the myths around sex, porn and infidelity',
    medium: 'podcast',
    minutes: 6,
    hook: 'Why there is no universal normal, and why waiting for spontaneous desire is the wrong strategy for most couples.',
    thesis:
      "Sexual desire is a psychological phenomenon, not a purely physiological one, and its normal range is individual to each person and each couple — there is no universal standard of frequency or duration to measure against. Most popular myths about sex (size, pornography, an inherent male drive toward polygamy) are cultural constructs rather than biological facts, and because sex is one layer of a couple's overall communication, a problem in it rarely stays isolated from the rest of the relationship.",
    ideas: [
      {
        name: 'Sex as one layer of communication',
        body: "Sexual connection sits alongside verbal and emotional communication as one level of how a couple relates — not first, not last, but linked. Discomfort here is not separate from discomfort elsewhere in the relationship; the two layers affect each other in both directions.",
      },
      {
        name: 'Individual norm and couple norm',
        body: 'There is no sexological standard for frequency or duration that applies across people — what counts as normal is whatever is genuinely comfortable for this specific person and this specific couple, not a number to hit.',
      },
      {
        name: 'Plan it, don\'t wait for it',
        body: 'Deliberately setting aside time for intimacy, the way you would for a date, rather than waiting for a spontaneous urge — described as increasingly necessary as a relationship or a family grows, when spontaneity naturally gets crowded out.',
      },
      {
        name: 'Porn is not automatically harmful',
        body: 'The clearest harm scenario named is porn preceding a person\'s actual sexual debut, where it can set unrealistic expectations and a distorted baseline. Outside that specific case, it is described as not inherently harmful unless it becomes compulsive.',
      },
      {
        name: 'Notice, name, then choose',
        body: 'For strong emotion generally — including shame or anxiety around sex — name what you are feeling rather than trying to suppress the feeling directly, since it originates in a part of the brain that does not respond well to direct control. Self-imposed limits that come from self-care hold up; ones that come from shame or self-criticism tend to end in a relapse into the exact behaviour being restricted.',
      },
    ],
    notes: [
      'A described clinical pattern (the source\'s own impression, not a formal statistic): a large share of the men she sees in practice present with performance anxiety — a spiral of worry, then a difficulty, then more worry — while a comparable share of women present with body-image anxiety, reinforced by industries that profit from manufactured insecurity.',
      'Cultural beauty and attractiveness standards are framed as historically relative — plumpness once signalled wealth where fitness signals it today — rather than as timeless, fixed preferences.',
      'A long-term affair, once discovered, is described as rarely something couples fully recover from — a third person\'s presence changes the couple\'s communication system even when the relationship visibly continues.',
    ],
    practices: [
      'Stop measuring your relationship against an assumed universal frequency or standard — check what is actually comfortable for the two of you specifically.',
      'Schedule intimacy deliberately during a busy stretch of life rather than waiting for it to arise spontaneously.',
      'If porn is a point of tension, ask specifically whether it is shaping unrealistic expectations rather than treating it as inherently the problem.',
      'When something about your own or a partner\'s sexuality causes discomfort, name specifically what feels off before assuming something is broken.',
    ],
    habits: [
      { id: 'f_invite', because: 'Planning intimacy instead of waiting for it starts with actually putting it on the calendar — inviting someone to something is that habit in its most literal form.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'A mismatch here rarely gets fixed by silence. Naming specifically what feels off is this source\'s own first move.' },
    ],
    vaultSource: 'Family & relationship / Resource / Фомичева — Секс, порно и измены',
  },

  // ---------------- Development ----------------
  {
    slug: 'atomic-habits',
    attr: 'development',
    title: 'You do not rise to the level of your goals',
    origin: 'Atomic Habits — James Clear (2018)',
    medium: 'book',
    minutes: 6,
    hook: 'The operating manual behind most of the habit library in this app.',
    thesis:
      'You do not rise to the level of your goals; you fall to the level of your systems. Behaviour change is not a motivation problem to be solved once but a design problem to be solved repeatedly — and the unit of design is a habit small enough that it never has to be negotiated.',
    ideas: [
      {
        name: 'The habit loop',
        body: 'Cue → craving → response → reward. Every technique in the book attaches to one of these four stages, which is why the model is worth memorising before any individual tactic.',
      },
      {
        name: 'The four laws',
        body: 'To build: make it obvious, attractive, easy, satisfying. To break: make it invisible, unattractive, difficult, unsatisfying. Eight rows, and every technique in twenty chapters lands in one of them.',
      },
      {
        name: 'The Two-Minute Rule',
        body: 'Scale the entry version down until it takes under two minutes. Not because two minutes changes your life, but because the version you cannot argue with is the version that establishes the identity — and identity is what carries the larger version later.',
      },
      {
        name: 'Habit stacking',
        body: '"After [current habit], I will [new habit]." A new behaviour attached to an existing one inherits its cue for free, which is the cheapest possible way to make something obvious.',
      },
      {
        name: 'Implementation intentions',
        body: 'A habit with a stated time and place gets done; a habit with an intention does not. "I will X at TIME in PLACE" outperforms resolve by a wide margin.',
      },
      {
        name: 'Identity over outcome',
        body: 'Outcome-based habits aim at what you want to get. Identity-based habits aim at who you want to become, and every completed rep is a vote for that identity. This is the layer the other techniques ultimately serve.',
      },
    ],
    notes: [
      'The book is deliberately an operating manual rather than a theory — every idea arrives with a concrete technique attached.',
      'Its model extends the classic stimulus → response → reward account with internal states: cravings, beliefs, identity. That addition is the reason it explains relapse better than the older version.',
      'Every habit template in this app names the mechanism it leans on. That vocabulary comes from here.',
    ],
    practices: [
      'Take any habit you have failed at and write its two-minute version. Do that version until it is automatic before you scale it.',
      'Attach each new habit to an anchor you already perform without thinking.',
      'State time and place, in writing, for anything you intend to start this week.',
      'Make one bad habit measurably harder to reach — distance, friction, a removed app — instead of relying on refusal in the moment.',
    ],
    habits: [
      { id: 'd_onepage', because: 'One page is the Two-Minute Rule applied to reading — the version that survives a bad day.' },
      { id: 'h_pushups', because: 'Ten push-ups is not a training programme. It is a vote for being someone who trains.' },
      { id: 'c_plan', because: 'Tomorrow planned tonight is an implementation intention for the whole next day at once.' },
      { id: 'd_notes', because: 'Writing what you read in your own words is what turns consumption into a rep that counts.' },
    ],
    quests: [
      { id: 'q_habitsystem', because: 'The book\'s actual deliverable is a stack, not a habit. This is the quest that builds one.' },
    ],
    vaultSource: 'Personal growth / Resource / Atomic Habits',
  },
  {
    slug: 'extreme-time-management',
    attr: 'development',
    title: 'Where the eight sectors came from',
    origin: 'Extreme Time Management — Mrochkovskiy & Tolkachev (2012)',
    medium: 'book',
    minutes: 5,
    hook: 'The source of this app\'s eight attributes, and the four rules it hangs off them.',
    thesis:
      'A life is a wheel of eight sectors, and a wheel with one tall sector and seven flat ones cannot roll. The neglected sectors do not sit quietly out of the way — they act as weights tied to the arms and legs of the one you are proud of.',
    ideas: [
      {
        name: 'The Wheel of Life',
        body: 'Eight sectors — health and sport, environment, relationships, career and business, finance, spirituality and creativity, personal growth, brightness of life — each scored 0 to 10. The book\'s diagnostic is the gap between them, not the height of any one. These are the eight attributes of this app, mapped one to one.',
      },
      {
        name: 'Eat the frogs first',
        body: 'The unpleasant task you keep deferring is a frog. Rule: eat every frog in the morning, while everyone else defers theirs to the last possible hour. The relief is not the reward — the rest of the day at full capacity is.',
      },
      {
        name: 'The 72-hour rule',
        body: 'If you have not acted on a new idea within 72 hours, the time, money and energy that went into acquiring it are written off. The authors attribute this to a US study they do not cite — treat the number as a working rule of thumb rather than a finding, and the discipline behind it as the real point.',
      },
      {
        name: 'Reserve blocks',
        body: 'A perfect plan always breaks. So put buffer blocks into the day on purpose. A crisis you have made room for is not a crisis; it is a normal working situation.',
      },
      {
        name: 'Plan tonight, act tomorrow',
        body: 'Tomorrow\'s plan is written before sleep, so the morning is for doing rather than deciding. Days are built from blocks by task type — analysis, calls and mail, clients, rest, quick tasks, reserve — with no interruptions permitted inside a block.',
      },
    ],
    notes: [
      'The book is a parable: a 27-year-old rebuilds his life in two months under a mentor, and each of the ten chapters ends in homework. The story is a delivery mechanism; the homework is the content.',
      'Quick tasks are best batched into a single hour a day rather than sprinkled through it. Tasks waiting on an external event should be forgotten until that event; stale ones should be crossed out rather than carried.',
      'The authors are business trainers and refer to their own paid courses throughout. Take the tools; skip the funnel.',
    ],
    practices: [
      'Draw your wheel, score all eight sectors, and write concrete two-month goals for each — the exercise the entire book is built around.',
      'Identify tomorrow\'s frog tonight, and do it first.',
      'Put a reserve block in the day before the day needs one.',
      'Silence notifications for the duration of a block. Interrupted work is worse work, not slower work.',
    ],
    habits: [
      { id: 'c_frog', because: 'The frog rule is the book\'s single most transferable instruction, and it only exists as a habit.' },
      { id: 'c_plan', because: 'Planning tomorrow before sleep is the mechanism that makes the frog findable in the morning.' },
      { id: 'd_review', because: 'A wheel scored once is a snapshot. Scored regularly, it is the diagnostic the book actually intends.' },
    ],
    quests: [
      { id: 'q_wheel', because: 'This is the book\'s homework from chapter one, and the reason this app has eight attributes at all.' },
    ],
    vaultSource: 'Personal growth / Resource / Экстремальный тайм-менеджмент',
  },

  // ---------------- Career ----------------
  {
    slug: 'porters-five-forces',
    attr: 'career',
    title: 'The five forces that decide whether a business can be profitable',
    origin: "Michael Porter's Five Forces, via Stephen Silbiger's MBA in 10 Days",
    medium: 'book',
    minutes: 6,
    hook: 'Before you compete on price, find out whether the industry even lets anyone win.',
    thesis:
      'Some industries make almost everyone in them unprofitable no matter how well they are run; others make mediocre operators rich. The difference is five structural forces — rivalry, supplier power, buyer power, new entrants, substitutes — and a business strategy is really just a plan for how to sit lightly under all five, then win through cost, differentiation, or a chosen niche rather than trying to do all three at once.',
    ideas: [
      {
        name: 'The five forces',
        body: 'Rivalry among existing competitors, the bargaining power of suppliers, the bargaining power of buyers, the threat of new entrants, and the threat of substitutes. Each force squeezes the profit available in an industry from a different direction — a business can be well run and still sit in a structurally bad spot.',
      },
      {
        name: 'Rivalry is worse where products are commodities',
        body: 'Many similar-sized competitors, a mature or shrinking market, products that are hard to tell apart, and high exit costs all push rivalry toward price competition, which is the fastest way to erase everyone\'s margin at once.',
      },
      {
        name: 'Entry barriers are what make an advantage last',
        body: 'Low capital requirements, no regulation, and an easily copied offering mean anyone can enter — which caps how much any single player can charge. Durable advantages come from brand, network effects, proprietary content or methods, and switching costs: the things a new entrant with money still cannot buy quickly.',
      },
      {
        name: 'Three generic strategies, not a blend of all three',
        body: 'Cost leadership wins by being the cheapest, which demands real operational efficiency and scale. Differentiation wins by being genuinely different and charging for it, which demands a real reason customers cannot get elsewhere. Focus wins by owning a specific segment fully rather than fighting for the whole market. Trying to be the cheap option and the premium option at once usually means losing both fights.',
      },
      {
        name: 'Durable advantage versus fragile advantage',
        body: 'A feature, a website, a price point — competitors copy these in months. A brand people already trust, a network that gets more valuable as it grows, and switching costs a customer would rather not pay for are the advantages that hold up under direct copying.',
      },
    ],
    notes: [
      'The threat of substitutes is often the most underestimated force, because a substitute does not have to be a competitor in the same category — it only has to solve the same underlying need more cheaply or conveniently.',
      'A niche strategy trades market size for lower competition and a more defensible position; the risk is a total addressable market too small to matter, or one that quietly shrinks.',
    ],
    practices: [
      'Name your industry\'s five forces specifically, in writing, before choosing a strategy — most people skip straight to tactics without checking whether the underlying structure can be profitable at all.',
      'Pick one generic strategy — cost, differentiation, or focus — and say what you would stop doing to commit to it.',
      'List your actual advantages and sort them into durable (hard to copy) and fragile (copied within a year). Invest further only in the durable column.',
      'Ask what would have to be true for a new entrant with capital to take your position in six months. If the honest answer is "not much," the advantage is not real yet.',
    ],
    habits: [
      { id: 'c_ship', because: 'Differentiation is a claim until someone outside your own head reacts to it. A weekly audience is how you find out if it holds.' },
    ],
    quests: [
      { id: 'q_portfolio', because: 'A visible body of work is exactly the kind of asset a new entrant cannot buy quickly — the framework\'s definition of a durable advantage, built one link at a time.' },
    ],
    vaultSource: 'Personal growth / Resource / Бизнес и менеджмент / Competitive Strategy',
  },
  {
    slug: 'unit-economics',
    attr: 'career',
    title: 'Does one sale make money? Prove that before you scale',
    origin: "Stephen Silbiger's MBA in 10 Days, on unit economics",
    medium: 'book',
    minutes: 6,
    hook: 'Growth does not fix a business that loses money on every single sale — it multiplies the loss.',
    thesis:
      'Unit economics asks one question at the smallest possible scale: for one customer, one order, one month of service, does the money coming in exceed the money going out? If the answer is no, no amount of growth repairs it — a thousand times a loss is a bigger loss, not a profit. Prove the per-unit math works before spending anything to acquire volume.',
    ideas: [
      {
        name: 'Revenue per unit minus cost per unit',
        body: 'The whole framework in one line: what a single unit — one order, one subscriber-month — actually brings in, minus what it actually costs to deliver, including realistic refunds, fees and failed charges rather than the list price.',
      },
      {
        name: 'Contribution margin has to cover overhead before it is profit',
        body: 'Revenue per unit minus direct cost per unit leaves a contribution margin — the pool that pays for marketing, salaries and rent. A healthy per-unit margin is not yet profit; divide it into fixed overhead to find how many units you actually need before anything is kept.',
      },
      {
        name: 'The CAC:LTV ratio',
        body: 'Customer acquisition cost against lifetime value. A ratio near 1:1 means you are working for free; the common rule of thumb is roughly 3:1 — three dollars of lifetime value for every dollar spent acquiring the customer — as the point where the model can absorb churn and still be worth running.',
      },
      {
        name: 'Three shapes of unit economics',
        body: 'Transactional (pay once, must re-acquire the customer every time), subscription (recurring revenue, acquisition cost recovered over the relationship), and marketplace (a commission on someone else\'s transaction). Each has a different lever to watch — repeat-purchase rate, churn, or take-rate.',
      },
    ],
    notes: [
      'A common failure mode is treating acquisition cost as a per-unit cost — it belongs in the lifetime-value calculation, amortised over the whole relationship, not subtracted from one sale.',
      'A second common failure is checking that revenue exceeds cost while ignoring gross margin as a percentage — a healthy margin band differs by business type, and a thin one leaves no room for anything going wrong.',
      'The ordering in the framework is deliberate: prove the unit is profitable, then reduce its cost, then raise its revenue, and only then spend on acquisition at scale. Reversed, it is the standard startup failure — scale first and discover the unit was never profitable once the funding runs out.',
    ],
    practices: [
      'Write down the actual revenue one customer generates in one month, and the actual cost to deliver it — not the list price, the realised one.',
      'Compute the contribution margin, then divide your fixed monthly overhead by it to find the real break-even customer count.',
      'Estimate your CAC:LTV ratio honestly. Anything under 3:1 is a warning, not a rounding error.',
      'Before spending anything on paid acquisition, fix the per-unit economics first — a cheaper acquisition channel cannot save a model that loses money per customer.',
    ],
    habits: [
      { id: 'm_log', because: 'You cannot compute a cost per unit without first knowing what things actually cost. This is where that number comes from.' },
      { id: 'c_reachout_pro', because: 'Referral and word-of-mouth are the cheapest acquisition channel the framework names — close to zero CAC, which is the fastest way to fix a weak ratio.' },
    ],
    quests: [
      { id: 'q_raise', because: 'Revenue per unit is the framework\'s first lever, and raising price is the fastest way to move it — faster than cutting cost or lowering acquisition spend.' },
    ],
    vaultSource: 'Personal growth / Resource / Бизнес и менеджмент / Unit Economics',
  },

  // ---------------- Development (2) ----------------
  {
    slug: 'seven-radicals',
    attr: 'development',
    title: 'Character is a style of adaptation, not a flaw to fix',
    origin: 'Practical Characterology: the Seven Radicals Method — Viktor Ponomarenko (2019)',
    medium: 'book',
    minutes: 7,
    hook: 'The theory behind this app\'s own radical-profile filter, and why "difficult personality" is not actually a thing.',
    thesis:
      'Character is not a fixed type but a style of adaptation: a person absorbs whichever behavioural patterns are easiest for their given nervous system, by a principle of minimal energy expenditure. A real character is a cocktail of several such tendencies — radicals — ranked in a hierarchy rather than a single textbook label, and no radical is inherently a flaw. What gets called a "difficult personality" is usually a task set against someone\'s grain, not a defect in the person.',
    ideas: [
      {
        name: 'Seven radicals, one hierarchy',
        body: 'The method names seven recurring tendencies — roughly: a need to be seen and admired, a drive for control and order, a single-minded pursuit of a goal, deep empathy and harmony-seeking, an unconventional and often solitary way of thinking, easy sociability and optimism, and a cautious, risk-averse steadiness. Almost no one is a pure type — a real profile ranks several of these from strongest to weakest.',
      },
      {
        name: 'The principle of minimal energy expenditure',
        body: 'Character forms from what was easiest to absorb, not what was chosen. The nervous system a person is born with makes certain behavioural patterns cost almost nothing and others cost a great deal — which is why advice that fits one person\'s grain perfectly can be nearly impossible for another to sustain.',
      },
      {
        name: 'Order matters: which radical sets the goal',
        body: 'In a pair of radicals, the first sets the goal and the second supplies the method — order over ambition versus ambition using order as its tool are different people even with the same two ingredients. A profile is a sequence, not a set.',
      },
      {
        name: '"Difficult personality" is usually a mismatch, not a diagnosis',
        body: 'The author\'s position: conflict is a protest against a situation that does not fit a person\'s radicals, not evidence of a flawed character. The useful move is finding and removing the mismatch between task and person, not trying to reshape the person.',
      },
      {
        name: 'Leadership and creativity trace to specific radicals',
        body: 'Real leadership, in this framework, derives specifically from the goal-driven radical — other radicals can imitate authority or impose discipline, but do not generate it the same way. Creativity is described as the near-forced mode of the unconventional-thinking radical: valuable exactly where something genuinely new is needed, and a liability where the task is to follow a template.',
      },
    ],
    notes: [
      'The method is explicitly non-test-based — it is built on observing real behaviour and, for self-diagnosis, analysing actual significant past decisions rather than hypothetical ones ("what did you choose, between what and what" — not "what would you do if").',
      'The author\'s biological explanations (specific claims about brain structure behind each radical) are offered as his own hypothesis and are flagged, including by the author himself, as not confirmed by neurophysiology. Treat the behavioural observations as the load-bearing part, and the biology as speculative framing.',
      'This is a classical, clinically-derived typology (in the lineage of Leonhard and Lichko), not a modern psychometric one — it has not been validated the way instruments like Big Five or HEXACO have. Useful as a descriptive lens; not a diagnostic instrument.',
    ],
    practices: [
      'Instead of asking which type you are, identify two or three genuinely significant past decisions and examine which tendency\'s logic actually won when it mattered — not how you would like to see yourself.',
      'Rank what you find rather than picking one label: which tendency set the goal, and which supplied the method, in each decision.',
      'When a task or environment keeps producing friction, check whether it is asking you to work against your own grain before concluding something is wrong with you.',
      'Use the profile to choose which tasks to take on, not to excuse avoiding ones that are simply uncomfortable — the method distinguishes a genuine mismatch from ordinary difficulty.',
    ],
    habits: [
      { id: 'd_review', because: 'The method\'s own self-diagnosis technique is a retrospective look at real decisions. A weekly review is that technique, run on a schedule instead of once.' },
      { id: 'd_notes', because: 'A profile that stays a feeling never gets used. Writing down what a decision actually revealed is what turns observation into something you can act on.' },
    ],
    quests: [],
    vaultSource: 'Personal growth / Resource / Практическая характерология — Методика 7 радикалов',
  },

  // ---------------- Health (2) ----------------
  {
    slug: 'energy-in-quarters',
    attr: 'health',
    title: 'Energy comes from four buckets, not one supplement',
    origin: 'Roman Terushkin — endocrinologist, on energy and chronic fatigue',
    medium: 'podcast',
    minutes: 6,
    hook: 'Why the supplement aisle caps out around 25% effectiveness, and what the other three quarters actually are.',
    thesis:
      'Chronic fatigue is almost never solved by one supplement, one diet, or one hormone. It usually traces back to hypoxia at the cellular level — mitochondria running in an inefficient mode because red blood cell quality is poor, itself driven by protein, iron, or B-vitamin deficiency, or an overloaded liver. Energy is built across four roughly equal quarters — sleep, food and hydration, physical and mental activity, and only last, supplements — and trying to fix it through supplements alone caps out near a quarter of what is actually needed.',
    ideas: [
      {
        name: 'Cellular hypoxia as the root of "low energy"',
        body: 'A mitochondrion running anaerobically produces a small fraction of the energy it would running aerobically. Anatomical causes contribute a minority of cases; most of the gap traces to blood quality — the number, size and function of red blood cells.',
      },
      {
        name: 'Four causes of poor blood quality',
        body: 'Protein deficiency (the raw material red blood cells are built from), iron deficiency (spent on stress and training, and close to unavoidable for menstruating women), B-vitamin deficiency (water-soluble, not stored, and consumed fastest under stress), and an overloaded liver (chronic viral load, gut issues, or poor sleep can push detox work to the point where nutrients cannot be used even when present).',
      },
      {
        name: '"Energy on credit"',
        body: 'Coffee and stimulants do not create energy — they borrow it, drawing down magnesium, B vitamins and iron that the body then has to repay. Tremor, anxiety and panic under chronic stimulant overuse are described as the interest on that loan, not a separate toxicity.',
      },
      {
        name: 'The 25/25/25/25 rule',
        body: 'Sleep, food and hydration, physical and mental activity, and supplements each carry roughly a quarter of the weight. The guest\'s own clinical observation — not a formal study — is that most patients try to solve fatigue through the smallest quarter alone, and get roughly a quarter of the result.',
      },
      {
        name: 'Self-observation as an early warning system',
        body: 'A weekly log of two or three indicators — energy, mood, libido — on a 0–10 scale, kept for at least eight weeks, separates a real trend from ordinary day-to-day noise. A genuine decline is the cue to test early, in what the guest calls the "pre-illness" window, rather than waiting for a diagnosis.',
      },
    ],
    notes: [
      'Melatonin is not recommended for regular use — the guest cites a study on veterans with PTSD in which long-term exogenous melatonin use correlated with faster brain aging, since it suppresses the body\'s own production. He treats it as an occasional tool for severe jet lag, not a nightly habit.',
      'Two to three cups of brewed coffee a day is described as neutral to beneficial; beyond three, the concern shifts to lithium depletion and adrenal load. Coffee mixed with milk, syrup or fresh juice is reframed as a dessert with a sugar spike, not a functional drink.',
      'Smoothies and fresh juice are, by this account, concentrated fructose with reduced or absent fibre — a fast glucose and insulin spike followed by a crash and rebound appetite, closer to a dessert than a healthy snack. Whole fruit does not carry the same effect.',
      'Walking past roughly 7,000 steps a day is where cardiovascular risk reduction becomes statistically meaningful, with each additional 1,000 adding further reduction — the guest\'s suggestion for beginners is to build up by about 1,000 steps a week rather than jumping straight to the target.',
      'Cutting something out abruptly (the guest\'s analogy is smoking) statistically ends in relapse more often than a gradual reduction over months — the same logic applied to any habit change, not just substances.',
    ],
    practices: [
      'Front-load protein at breakfast, especially after a poor night\'s sleep — a rough target across the day is 1.5–2g of protein per kilogram of body weight.',
      'Drink a glass of warm water before meals — a simple, no-lab-work lever for bile flow and downstream digestion and absorption.',
      'Build toward 7,000+ daily steps gradually, roughly 1,000 more per week, rather than starting at the target and risking injury or burnout.',
      'Keep sleep timing consistent across the whole week, weekends included, instead of running a deficit and trying to "catch up."',
      'Run an eight-week weekly log of energy, mood and libido on a 0–10 scale before concluding anything about a trend.',
    ],
    habits: [
      { id: 'h_water', because: 'Warm water before meals for bile flow is nearly this exact habit, anchored to a different moment of the day.' },
      { id: 'h_steps', because: 'The cheapest lever toward the 7,000-step threshold this source names as where cardiovascular risk actually starts dropping.' },
    ],
    quests: [
      { id: 'q_energyaudit', because: 'The eight-week log of energy, mood and libido is this quest\'s exact mechanism, run over a timeframe long enough to see a real trend instead of noise.' },
    ],
    vaultSource: 'Health & sport / Resource / Терушкин — Энергия и хроническая усталость',
  },

  // ---------------- Money ----------------
  {
    slug: 'rich-versus-wealthy',
    attr: 'money',
    title: 'Rich is what you spend. Wealthy is what you did not.',
    origin: 'Morgan Housel — on financial behaviour, independence and expectations',
    medium: 'podcast',
    minutes: 7,
    hook: 'The one distinction that changes what a savings target is even for.',
    thesis:
      'Financial outcomes are driven overwhelmingly by behaviour rather than intelligence or education — this is the rare field where an ordinary person with no training routinely outperforms the credentialed professional. The load-bearing distinction is between being rich (having money to spend on what you want) and being wealthy (independence — the money you did NOT spend, which buys control over your own time). Most financial damage comes not from stupidity but from ignorance in the literal sense: not knowing your own real income and outgoings.',
    ideas: [
      {
        name: 'Every dollar is a piece of your future, owned by someone',
        body: 'A dollar of debt is a piece of your future that belongs to a lender; a dollar saved is a piece of your future that belongs to you. Taken literally, saving $100 is not deferring pleasure — it is purchasing $100 of independence today.',
      },
      {
        name: 'Two buckets for every purchase',
        body: 'Every dollar spent does one of two things: makes you or your family happier, or impresses strangers who do not actually care. The source\'s sharpest observation is that people are impressed by the object, not its owner — each onlooker is imagining themselves driving the car, being envied. Seeing this clearly deflates most status spending on its own.',
      },
      {
        name: 'Savings is a bill, not a leftover',
        body: 'Housel files saving in the same budget category as rent and food — not "whatever remains". The concrete version is a 10% rule applied to any inflow of any size, automated at the transfer level so it never depends on willpower after the fact.',
      },
      {
        name: 'The moving goalpost',
        body: 'Happiness is the gap between expectations and reality, and expectations tend to rise faster than results — so chasing more, without stopping the goalposts, never registers as progress. Social media widened the comparison set from neighbours and colleagues to an algorithmic feed of the most successful people alive, permanently available.',
      },
      {
        name: 'Compounding is a function of time, not returns',
        body: 'The variable that matters is how long you can hold without selling, not the annual rate. Housel notes Buffett accumulated the overwhelming majority of his net worth after age 60. The claim attached: an average investor over a disproportionately long horizon ends up in the top percentile.',
      },
      {
        name: 'The metric is sleeping at night',
        body: 'Housel describes his own portfolio as more conservative than textbook-optimal, because the goal is not beating an index but not waking at 2am asking whether he has got it wrong. Asset allocation is treated as a question of temperament and circumstance rather than a universal formula.',
      },
    ],
    notes: [
      'Independence is a spectrum, not a threshold: the thought "why bother saving $20, it changes nothing" is the error. It is one small step of independence bought, not an all-or-nothing move.',
      'It is possible to be a multi-billionaire with no independence (wholly captive to others\' opinion) and to be independent on very little.',
      'The market\'s return is not free — the price is continuous volatility and uncertainty, not broker fees. Declining to pay it means accepting the predictable, lower return of a deposit.',
      'Before changing spending habits, ask what psychological hole a purchase is trying to fill. Usually the honest answer is none — the object\'s effect lasts a day or two while the payment lasts months.',
      'A deliberately boring habit — checking your account balance daily, ten seconds — is claimed to outperform elaborate apps and spreadsheets, because the failure it fixes is not knowing the numbers at all.',
      'Housel is a practitioner and writer rather than an academic researcher; the argument rests on documented public histories and observation, not controlled studies. Treat the specific figures as directionally credible rather than precise.',
    ],
    practices: [
      'Automate a fixed percentage off every inflow, however small, on the day it arrives — before any spending decision gets made.',
      'Run the two-bucket test on any non-trivial purchase: is this for me and mine, or to impress strangers?',
      'Check the account balance daily. The point is not control, it is ending the ignorance that most mistakes actually come from.',
      'State the long-term goal as an amount of independence rather than an amount of income.',
      'Practise gratitude deliberately: it closes the expectation gap more reliably than a raise does, because the gap is what happiness is measured against.',
    ],
    habits: [
      { id: 'm_checkbalance', because: 'The source names this exact habit — ten seconds a day — as the fix for the ignorance most financial mistakes actually come from.' },
      { id: 'm_payday', because: 'The 10% rule in its literal form: the transfer happens the day money arrives, before any spending decision competes with it.' },
      { id: 'm_waitlist', because: 'A day\'s delay is enough to answer the source\'s question — what hole is this purchase filling? — before the money is gone.' },
      { id: 'm_nodebt', because: 'If a dollar of debt is a piece of your future owned by someone else, then not borrowing is the cheapest way to keep it.' },
    ],
    quests: [
      { id: 'q_emergencyfund', because: 'This is "savings as a bill" made concrete — the first block of independence bought, rather than an amount left over at month end.' },
      { id: 'q_debts', because: 'If a dollar of debt is a piece of your future someone else owns, then facing the total is the act of finding out how much of your future is currently spoken for.' },
      { id: 'q_raise', because: 'The source treats income as the weaker lever than behaviour — but raising it is what makes a savings rate survivable rather than punishing.' },
    ],
    vaultSource: 'Finance & money / Resource / Housel — The Psychology of Money, Rich vs Wealthy',
  },

  // ---------------- Friends ----------------
  {
    slug: 'social-health-5-3-1',
    attr: 'friends',
    title: 'Social health is a pillar, and it has a number',
    origin: 'Kasley Killam — public-health researcher, on connection and loneliness',
    medium: 'podcast',
    minutes: 7,
    hook: 'Most loneliness is not circumstance. It is accumulated small avoidances — and there is a weekly target that fixes it.',
    thesis:
      'Social health is a distinct, measurable pillar of wellbeing alongside physical and mental health, and its absence carries mortality risk that researchers place in the range of smoking or obesity. The practical claim underneath: the majority of missed connection is not the result of genuine need but of small, repeated avoidances that feel justified in the moment — and the felt risk of reaching out is systematically higher than the real one.',
    ideas: [
      {
        name: 'Loneliness is a signal, not a defect',
        body: 'A study comparing the brains of people isolated all day with people who had not eaten all day found the same regions active — loneliness is framed as hunger-like, indicating an unmet need rather than something wrong with the person feeling it. The trap is that it is self-fulfilling: chronically lonely people enter social situations more guarded and primed for negative cues, which degrades the interaction itself.',
      },
      {
        name: 'The liking gap',
        body: 'When strangers were paired for a short conversation, both consistently underestimated how much the other liked them — while outside observers judged the rapport accurately. A parallel finding: people underestimate how much a friend will appreciate an unprompted message. The cost of reaching out is nearly always overestimated.',
      },
      {
        name: 'The 5-3-1 formula',
        body: 'Five different people per week (diversity of ties is itself protective, not just one close person), at least three close relationships, and a cumulative hour a day of connection. The hour need not be continuous or with one person — a minute with a barista, twenty with a partner, a ten-minute call all count. A work meeting does not, unless part of it is genuinely personal.',
      },
      {
        name: 'The stress-buffering hypothesis',
        body: 'Being with supportive people actively damps the cortisol and inflammation response rather than adding to it. The implication is counterintuitive: the moments you most want to withdraw — after a hard day, mid-burnout — are often exactly when connection would help most.',
      },
      {
        name: 'Four friendship styles',
        body: 'Butterfly (frequent, casual, easy in groups), wallflower (selective and infrequent, a natural listener, slow to warm), firefly (infrequent but deep, loves solitude, skips small talk entirely), evergreen (frequent and deep). Explicitly descriptive rather than evaluative — useful for knowing which settings will actually energise you, and for not reading a friend\'s different rhythm as a weaker bond.',
      },
      {
        name: 'Connection is a muscle with four modes',
        body: 'Stretch (seek new ties), rest (deliberately scale back when overconnected — solitude is legitimate), tone (deepen what exists), flex (enjoy and sustain what is already built). The analogy is fitness: it needs recovery as well as exertion.',
      },
    ],
    notes: [
      'Shared activity beats cold networking: joining something organised around a real interest, with a recurring touchpoint rather than a one-off, is named as the actual mechanism — it removes the pressure of a one-to-one first impression.',
      'For distance friendships, three tactics: micro-moments (a text when someone crosses your mind), "autopilot" (a standing recurring call that kills the scheduling negotiation), and prioritising real in-person time.',
      'When a friend seems to be pulling away, a direct caring check-in is recommended over silent worry — get curious instead of assuming it is personal.',
      'Closeness is defined by two properties: mutual (an even exchange over time, not within every conversation) and meaningful (room to be authentic rather than performing wellness).',
      'The claims come from a credentialed public-health researcher, but in interview form: the individual statistics are cited without authors or years, so treat them as directionally credible expert claims. The "excuse versus need" sorting is an editorial device, not research, and some of its calls are normative judgements.',
    ],
    practices: [
      'Sort your own recent cancellations into genuine needs and excuses. The source\'s finding is that needs are real but rare; most cancellations are the easier default.',
      'Use 5-3-1 as a weekly checklist rather than an aspiration to "be more social".',
      'In dead moments that default to scrolling — a queue, a commute, a meeting that ended early — message or call someone instead. The time was already unstructured.',
      'Identify your own friendship style, then stop reading a friend\'s different rhythm as a verdict on the friendship.',
      'When someone hits a life transition, name it and ask what staying connected could look like now, rather than letting it quietly fade.',
    ],
    habits: [
      { id: 'f_nodoom', because: '"Go for connection first" is precisely this: the dead moments that default to scrolling were already unstructured, so the swap costs nothing.' },
      { id: 'f_reachout', because: 'The liking gap means this message will land better than it feels like it will — the felt risk is the thing the research says is wrong.' },
      { id: 'f_meet', because: 'The cumulative hour and the three close relationships both need time in person; this is the leg of 5-3-1 that a phone cannot cover.' },
      { id: 'f_voice', because: 'Named directly as a micro-moment tactic for distance friendships — the spontaneous note when someone crosses your mind.' },
    ],
    quests: [
      { id: 'q_reconnect', because: 'Five people is exactly the diversity leg of 5-3-1, and the liking gap says every one of those messages will land better than it feels like it will.' },
      { id: 'q_hardconversation', because: 'The source\'s recommendation for sensed distance is a direct, caring check-in — this is that conversation, and silence is what the research says makes it worse.' },
    ],
    vaultSource: 'Social & friends / Resource / Killam — Social Health, the 5-3-1 Formula and Four Friendship Styles',
  },

  // ---------------- Spirituality ----------------
  {
    slug: 'the-virtue-that-hides-the-flaw',
    attr: 'spirituality',
    title: 'The virtue you already have can hide the one you lack',
    origin: 'Omar Suleiman — lecture on wholesomeness, sincerity and self-deception',
    medium: 'lecture',
    minutes: 7,
    hook: 'Why doing more of what you are already good at can be a way of avoiding the thing that actually needs fixing.',
    thesis:
      'Wholeness is the balance between practice and character, and the central danger is specific: a quality that comes naturally to you can become cover for a fundamental flaw you are refusing to look at. The pattern is compensation — answering a known defect by intensifying an already-strong virtue, so that the effort feels like growth while the one thing that needed correcting stays untouched.',
    ideas: [
      {
        name: 'The child who vacuums instead of washing up',
        body: 'Asked to do the dishes, the child vacuums the living room and mows the lawn instead — good things, but not the thing that was required. The spiritual analogue: praying more, fasting more, giving more, as a way of not confronting the single specific fault that was asked of you.',
      },
      {
        name: 'Introspection as the clearest mirror',
        body: 'The exercise: imagine you are your own friend, someone who has watched you closely for the last five or six months, and must now give honest, uncomfortable advice. Reflection is described as a clearer mirror than even an honest friend — because you are the only one who sees yourself all day, every day.',
      },
      {
        name: 'The handover of responsibility for your own faith',
        body: 'There is a point at which care for your own practice must pass from parents to you — you rise before anyone knocks on the door. The analogy given: parents can buy the best school and the best teachers, but the student still has to sit at the desk. Without that, the best institution changes nothing.',
      },
      {
        name: 'Unexpected pairings of quality and station',
        body: 'The figures held up are notable for virtues their position did not require: Dawud, a wealthy and powerful prophet-king, remembered for night prayer and alternate-day fasting; Uthman ibn Affan, exceptionally wealthy yet the most modest person in the room; Luqman, celebrated for eloquence yet distinguished by knowing when to stay silent; Umar ibn al-Khattab, commanding and imposing, yet never too proud to accept correction from a child.',
      },
      {
        name: 'Al-Ghazali on the delusion of the devout',
        body: 'Four groups are named as most vulnerable to spiritual self-deception precisely because of their piety: scholars who reduce religion to theory and do not practise what they teach; worshippers who add extra devotions while holding on to a major fault with no intention of correcting it, developing contempt for "sinners"; those who believe they have reached a station exempting them from ordinary obligations; and the wealthy, practising a "chequebook religion" — giving just enough to be called generous, and changing nothing else.',
      },
      {
        name: 'Good deeds are easier than leaving a sin',
        body: 'Citing Ibn al-Qayyim: good deeds resonate with innate nature, which is why they feel good to perform and why anyone at all is capable of them. Abstaining from what is forbidden requires sincerity, because it offers no immediate reward. The real sacrifice is not adding another good deed — it is stopping the thing you know to be wrong, precisely when that is uncomfortable.',
      },
    ],
    notes: [
      'The culture of a religious circle can normalise a fault — "he does it too, so it cannot be that serious" is named explicitly as a mechanism of drift.',
      'Detachment can be inherited from example rather than status: Sulayman is described as inheriting not only his father\'s wealth but his distance from it.',
      'Khadija is cited as choosing a husband for truthfulness and trustworthiness rather than standing, despite having wealth, beauty and rank herself — and spending her fortune freeing slaves and providing dowries for poor brides.',
      'The lecture is a structured talk by a named, credentialed scholar drawing on classical sources; it is teaching within a tradition rather than empirical research, and is best read on those terms.',
    ],
    practices: [
      'Do the friend exercise honestly: what would someone who watched you closely for six months tell you, that you would not enjoy hearing?',
      'Name the one fault you have been compensating for. Then check whether your recent effort has gone into it, or into something you were already good at.',
      'Treat leaving one wrong thing as worth more than adding one more good thing — it is the harder act, and the one that requires sincerity.',
      'Watch for the four delusions in your own practice, especially the two most socially rewarded: teaching what you do not do, and giving enough to be praised.',
    ],
    habits: [
      { id: 'd_review', because: 'The mirror exercise needs a standing slot: the honest friend cannot give you uncomfortable advice if you never sit down to hear it.' },
      { id: 's_dhikr', because: 'Reflection is called the clearest mirror — five quiet minutes before the day is the smallest version that still counts as looking.' },
      { id: 'f_nogossip', because: 'A concrete instance of the lecture\'s core move: leaving one wrong thing, which it argues is worth more than adding another good deed.' },
      { id: 's_forgive', because: 'Letting something go is the harder, less rewarded act the source contrasts against the easy satisfaction of a good deed.' },
    ],
    quests: [
      { id: 'q_anchor', because: 'The handover of responsibility is described exactly as a daily practice you hold yourself, before anyone reminds you — which is what anchoring the day to one practice means.' },
      { id: 'q_learnfaith', because: 'The lecture\'s warning about scholars who know about God without knowing God is an argument for studying something properly rather than collecting fragments.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Omar Suleiman — Wholesomeness, Sincerity and Spiritual Delusion',
  },

  // ---------------- Brightness ----------------
  {
    slug: 'the-curse-of-knowledge',
    attr: 'brightness',
    title: 'The curse of knowledge',
    origin: 'Steven Pinker — cognitive scientist, on why clear writing is rare',
    medium: 'podcast',
    minutes: 6,
    hook: 'Bad writing is almost never malice or stupidity. It is one specific blind spot — and it hides itself.',
    thesis:
      'Most bad writing is not obfuscation and not low intelligence: it is the curse of knowledge, the inability to imagine what it is like not to already know what you know. Nearly every concrete technique for writing clearly is a countermeasure against that single root cause — which matters because the blind spot cannot be detected by introspection, since the thing hiding it is the very knowledge you cannot unsee.',
    ideas: [
      {
        name: 'Hanlon\'s razor, applied to prose',
        body: 'Never attribute to malice what is adequately explained otherwise. Most impenetrable academic and technical writing comes from intelligent, well-meaning people who simply cannot model what their audience does not know — not from a wish to gatekeep or sound impressive.',
      },
      {
        name: 'Four seconds to lose a room',
        body: 'A brilliant molecular biologist at a conference lost several hundred people almost immediately by opening with jargon-heavy findings, never framing the problem or why it mattered — and was visibly the only person in the room who could not tell.',
      },
      {
        name: 'The symptoms are structural, not stylistic',
        body: 'The curse shows up as unexplained abbreviations, jargon known only to a small clique, and needless abstraction. Pinker\'s example of the last: "the level of the stimulus was proportional to the intensity of the reaction" in place of "kids look longer at a bunny than a truck".',
      },
      {
        name: 'You cannot introspect your way out',
        body: 'Trying to imagine the reader\'s ignorance helps, but is fundamentally unreliable — the blind spot conceals itself. The only dependable correction is external: show the draft to intelligent, well-read people outside your specialty and watch where they stumble.',
      },
      {
        name: 'The clique is smaller than you think',
        body: 'Even sub-specialists inside the same department can become unintelligible to one another once each has been immersed in a small group\'s private vocabulary. "Written for experts" is rarely a real defence.',
      },
    ],
    notes: [
      'Concrete and visual language outperforms abstraction not as a matter of taste but because it gives the reader something to actually simulate.',
      'Examples are not decoration — they pin down what a generalisation actually claims, which is the thing an unfamiliar reader cannot reconstruct on their own.',
      'This source differs in kind from craft advice given by novelists: it explains from cognitive science why the techniques work, rather than describing one writer\'s personal process.',
    ],
    practices: [
      'Give the draft to someone intelligent and well read but outside your field, and note precisely where they slow down. Do not explain — watch.',
      'Open by framing the problem and why it matters, before any finding, term or abbreviation.',
      'Replace abstraction with the concrete thing it stands for wherever the sentence still means what you intended.',
      'Attach an example to every generalisation you are asking a reader to accept.',
    ],
    habits: [
      { id: 'c_ship', because: 'This is the countermeasure itself. The blind spot cannot be found by introspection — only by watching one real reader stumble.' },
      { id: 'd_teach', because: 'Explaining something to a non-specialist is the fastest way to discover which parts of what you know you cannot actually put into words.' },
      { id: 'd_notes', because: 'Rewriting a source in your own words is where abstraction gets swapped for the concrete thing it stood for, at low stakes.' },
    ],
    quests: [
      { id: 'q_makeweekly', because: 'The countermeasure only works on a finished draft in someone else\'s hands — which requires actually finishing one thing you made.' },
      { id: 'q_portfolio', because: 'Putting work where it can be found is what recruits the outside readers whose stumbles are the only reliable detector of your own blind spot.' },
    ],
    vaultSource: 'Memories & Fun / Resource / Steven Pinker — The Curse of Knowledge and the Science of Clear Writing',
  },
  {
    slug: 'focus-then-rest',
    attr: 'development',
    title: 'Focus, then rest. The rewiring happens in the second part.',
    origin: 'Andrew Huberman — neuroscientist, on plasticity, focus and self-regulation',
    medium: 'podcast',
    minutes: 7,
    hook: 'Focused work is supposed to feel bad at the start. Expecting flow is why people conclude they are doing it wrong.',
    thesis:
      'Adult neuroplasticity requires two things in sequence: intense focus, which is inherently uncomfortable because agitation is a byproduct of the stress system doing its job, followed by deep rest or sleep, where the actual rewiring occurs. Dopamine is not a reward at the finish line — it is released at any recognised milestone along the way, and its function is to suppress the norepinephrine buildup that otherwise makes people quit.',
    ideas: [
      {
        name: 'Focus tags, rest rewires',
        body: 'Focused attention releases acetylcholine from a brainstem structure that marks the active neurons for change — but the change itself happens later, in deep rest or sleep. Focus without adequate rest afterwards does not produce plasticity; the two are one mechanism in sequence, not alternatives.',
      },
      {
        name: 'Duration, path, outcome — and why it feels bad',
        body: 'Real focus requires the brain to work out how long something will take, what the path is, and what the outcome will be. That is effortful by design and throws off genuine agitation as a side effect. Expecting focused work to feel good from the start sets you up to think you are failing at the exact moment you are doing it correctly.',
      },
      {
        name: 'Dopamine marks the path, not the arrival',
        body: 'The model given is a thirsty deer finding a stream partway to the lake: the signal reinforces the route, not only the destination. So rewarding real intermediate progress is a genuine performance lever rather than a mood boost — though it has to attach to actual effort, not to detached positive self-talk.',
      },
      {
        name: 'Why people quit, mechanically',
        body: 'Sustained effort accumulates norepinephrine in the brainstem; past a threshold it shuts down voluntary motor control and the behaviour stops. Dopamine pushes that level back down, buying more capacity before the quit point. Marking milestones is therefore how you extend the runway.',
      },
      {
        name: 'Action changes thought, not the other way round',
        body: 'The causal direction runs from behaviour to mood and thought more reliably than the reverse. Waiting to feel motivated before acting has the sequence backwards — behaviour is the entry point when stuck.',
      },
      {
        name: 'Adult plasticity has to be triggered deliberately',
        body: 'Childhood plasticity is largely passive; the brain resists change past roughly twenty-five by design. Adult learning means actively re-creating the same focus-then-rest mechanism that ran automatically in childhood.',
      },
    ],
    notes: [
      'Perception is a spotlight and is controllable; sensation is not. The nervous system\'s core job is described as matching internal state to external demand — impatience, on this model, is an internal pulse running faster than the situation calls for, rather than a character flaw.',
      'Urgency is required for plasticity, and Huberman is explicit that motivation from love and from fear converge on the same acetylcholine/norepinephrine pathway — he makes no claim they are interchangeable for wellbeing, only for triggering the mechanism.',
      'Down-regulation in real time: two nasal inhales and one long exhale. Rapid cyclic breathing is the opposite tool, for when you are under-aroused and need activation.',
      'Huberman is a publishing Stanford neuroscientist and several claims trace to citable work, but this is a long-form conversational podcast: figures are given from memory without in-episode sourcing. He flags the physiological-sigh protocol as an in-progress study at the time of recording, and the self-reward synthesis as his own extrapolation rather than a published finding — worth carrying those hedges rather than dropping them.',
    ],
    practices: [
      'Treat early agitation in a focus block as the mechanism working, not as evidence the task is wrong or flow is unreachable.',
      'Reward real milestones inside a larger goal, not only the finish — that is what extends capacity before the quit threshold.',
      'When stuck, start with the behaviour rather than waiting to feel ready.',
      'Take deliberate defocus breaks between blocks — look at something far away, not a screen — to preserve capacity for the next block.',
      'Before a hard conversation, lower physiological arousal first: listening is gated by autonomic state, not by good intentions.',
    ],
    habits: [
      { id: 'c_plan', because: 'Duration, path and outcome are exactly what planning tomorrow settles — done the night before, so the focus block does not have to spend its energy there.' },
      { id: 'd_nopassive', because: 'The direct application of action-before-motivation: make something first, and let the mood follow the behaviour rather than gating it.' },
      { id: 'd_review', because: 'Milestones only suppress the quit signal if you actually notice them — a standing review is where intermediate progress gets recognised instead of passing unmarked.' },
    ],
    quests: [
      { id: 'q_habitsystem', because: 'Focus-then-rest is a structure, not a mood; building the stack is how the rest half stops being whatever is left over.' },
      { id: 'q_skill', because: 'Adult plasticity has to be deliberately triggered, which needs one concrete skill to aim the focus at over a real stretch of time.' },
    ],
    vaultSource: 'Personal growth / Resource / Huberman — Neuroplasticity, Focus and Self-Regulation',
  },
  {
    slug: 'minimum-effective-dose-strength',
    attr: 'health',
    title: 'There is no threshold. There is a gradient.',
    origin: 'Andy Galpin — exercise scientist, on strength training and fast-twitch loss',
    medium: 'podcast',
    minutes: 6,
    hook: 'One session a week is not a compromise. It is most of the benefit.',
    thesis:
      'Strength training has a gradient dose-response, not a threshold: there is no cutoff below which it does not count. The jump from zero sessions to one is larger than any later increment, and each added day gives real but diminishing further benefit. The reason to lift specifically — rather than only walk or do cardio — is that fast-twitch fibres activate only under genuine load, and are preferentially lost with age if never recruited, regardless of how generally active you are.',
    ideas: [
      {
        name: 'Do not let perfect be the enemy of good',
        body: 'One session a month beats never, though not by much. One a week produces a large measurable jump against zero across longevity, bone, cardiovascular and mental-health markers. Around three a week is described as roughly "best-ish" as a lifelong average. The instruction that follows: never let an inability to hit the ideal frequency become the reason to do nothing.',
      },
      {
        name: 'Why walking cannot substitute',
        body: 'Slow-twitch fibres are fatigue-resistant and low-force — they cover standing, walking, chewing. Fast-twitch fibres produce high force and fatigue quickly, and are recruited only under real effort. Ageing strips the fast-twitch preferentially precisely because ordinary daily movement never calls on them. That is the mechanism behind an otherwise active older person who suddenly cannot lift a case overhead or catch themselves in a fall.',
      },
      {
        name: 'Hardish, not maximal',
        body: 'Fixing it does not require a one-rep max or training to failure — only periodic exposure to genuinely hardish relative load. Modern life no longer demands that, so it has to be deliberately engineered.',
      },
      {
        name: 'Three components, none substitutable',
        body: 'A full week has baseline activity (steps and general movement, with no real upper limit), at least one structured cardiovascular session, and at least one structured strength session. Heavy load in one component can lower the minimum needed in another, but nothing else reaches the force production, connective tissue and bone adaptations that strength work does.',
      },
      {
        name: 'Program the days you have, minus one',
        body: 'The coaching method shown: ask how many days are actually available, not how many the person wishes they had — then subtract one as a buffer against overcommitment and dropout. If they say four, program three.',
      },
    ],
    notes: [
      'Reps in reserve: stop sets meaningfully short of failure, especially as a beginner. Next-day soreness above roughly 2–3 out of 10 is a signal to back off, not evidence of a good session.',
      'Soreness as a measure of effectiveness, training to failure, and standing desks as a fix are all addressed as myths rather than tactics.',
      'On a day when a full session is impossible, do the smaller substitute — a walk, light movement, stretching — rather than skipping. "Make a dollar, not zero."',
      'A protein reference point of roughly 2 g/kg/day is given, and creatine at 5 g/day is named as the one supplement worth considering. Both are general-population figures: anyone with a relevant medical condition should treat them as a question for a clinician rather than an instruction.',
      'Galpin directs a university human-performance centre and coaches professionally. The physiology is described as backed by many labs but is not individually cited in the episode, and he flags his own live coaching example as simplified. Recovery and deficit percentages are his working heuristics, not sharp cutoffs.',
    ],
    practices: [
      'Put one genuine strength session in the week before optimising anything else about training.',
      'Use compound pairs — a leg movement and an upper-body movement — as supersets, two sets of eight, with whatever minimal equipment you have.',
      'Stop each set short of failure and treat heavy next-day soreness as a signal you overshot.',
      'On a day the session will not happen, do the reduced version instead of nothing.',
      'Decide the week from the days you actually have, then subtract one.',
    ],
    habits: [
      { id: 'h_pushups', because: 'The whole argument in its smallest honest form: fast-twitch fibres need real load, and this recruits them without a gym or a program.' },
      { id: 'h_steps', because: 'Component one of the three — baseline activity, the part with no real upper limit on benefit and the one that carries a bad week.' },
      { id: 'b_sport', because: '"Make a dollar, not zero" — the structured cardiovascular leg is easier to keep when it is something you would do anyway.' },
      { id: 'h_stretch', because: 'The named substitute for a day when the full session is not happening, so the week does not become all-or-nothing.' },
    ],
    quests: [
      { id: 'q_habitsystem', because: 'The days-minus-one rule is a scheduling decision, not a motivation problem — which is exactly what building the stack settles in advance.' },
      { id: 'q_energyaudit', because: 'The three components can only be balanced against a real picture of where the week\'s capacity currently goes.' },
    ],
    vaultSource: 'Health & sport / Resource / Galpin — Minimum Effective Dose Strength Training, Fast-Twitch Fiber Loss and Creatine',
  },
  {
    slug: 'the-delta-and-the-debt',
    attr: 'money',
    title: 'Your standard of living is your spending, not your income',
    origin: 'Kuralay Mukhamizhanova — financial consultant, on debt, the gap and capital',
    medium: 'podcast',
    minutes: 6,
    hook: 'Earning and spending are two processes. The third one — the gap between them — is the only one that builds anything.',
    thesis:
      'There are three independent processes: earning, spending, and managing the gap between them. Most people run only the first two and therefore never form capital. Income is never guaranteed — illness, redundancy, a dry month all remove it — while spending is guaranteed always, which is why standard of living is set by the expense base rather than the income. Income equal to spending is a slow road to poverty; spending above income is a fast road to insolvency.',
    ideas: [
      {
        name: 'Pay yourself first',
        body: 'The rule is order, not amount: the first action on any income is setting aside a share, and you live on the remainder — never spend-then-save-the-leftover. The psychological argument is that 90% and 100% of a given sum are subjectively indistinguishable, so the felt drop in living standard is close to nothing while the compounding difference is not.',
      },
      {
        name: 'The delta is the whole game',
        body: 'Income equal to spending means no delta, no capital, and poverty at retirement. Income below spending means bankruptcy. Only income above spending creates the delta that savings and investment are built from — and it can be widened from either side, by cutting spending or raising income, ideally both.',
      },
      {
        name: 'Compounding runs both directions',
        body: 'The same mechanism works against a borrower and for an investor, and the dominant variable is time rather than the sum. The source\'s illustration: $200/month for twenty years beats $400/month for ten, despite identical capital contributed. Starting small immediately beats waiting for the right moment and a bigger amount.',
      },
      {
        name: 'Instalments feel free because the pain is deferred',
        body: 'An instalment plan reads as costless because the first payment belongs to next month. The pleasure of the purchase fades quickly while the payment runs for a year or two — so an instalment on a trip or an experience means paying, at length, for a joy that has already faded. Retail instalment plans frequently carry an interest component the buyer never sees stated.',
      },
      {
        name: 'Snowball versus avalanche',
        body: 'Snowball: rank debts smallest balance first, pay minimums on everything else, attack the smallest — the first closure arrives quickly and creates momentum. Avalanche: rank by highest interest rate and attack the most expensive, which is mathematically optimal and minimises total overpayment. The choice is a trade between psychology and arithmetic.',
      },
    ],
    notes: [
      'When income falls, spending falls more slowly — that lag is where credit traps are actually born.',
      'The first step out of debt is structural rather than financial: stop adding new borrowing, or none of the rest holds.',
      'List debts by real outstanding balance, not by monthly payment. The monthly figure is what makes a total feel survivable while it grows.',
      'The consultant is a practitioner rather than a researcher, and the advice tracks standard personal-finance practice. "Pay yourself first" comes from the popular finance canon rather than original research; the compound-interest-as-eighth-wonder line is an apocryphal attribution; and the specific hidden-interest figure for local instalment products is a reasonable claim given without published data.',
    ],
    practices: [
      'Write every debt down at its real remaining balance, in one list, before choosing any strategy.',
      'Pick snowball or avalanche deliberately — momentum if you need a visible first win, avalanche if you can hold out for the lower total.',
      'Set aside a fixed share the day income arrives, and live on the rest.',
      'Treat an instalment offer as a loan with a hidden rate, and refuse it for anything whose pleasure will fade before the payments do.',
      'Track the expense base, since that — not income — is what your standard of living actually is.',
    ],
    habits: [
      { id: 'm_payday', because: 'This is "pay yourself first" as a mechanism rather than an intention: it happens on arrival, before the remainder gets claimed.' },
      { id: 'm_log', because: 'Standard of living is the expense base, and the expense base cannot be managed while it is unmeasured.' },
      { id: 'm_subs', because: 'Recurring charges are the part of the base that grows without a decision — the instalment logic applied monthly and invisibly.' },
      { id: 'm_nospend', because: 'The delta can be widened from either side; this is the cheapest available move on the spending side.' },
    ],
    quests: [
      { id: 'q_debts', because: 'Snowball and avalanche both require the same first artefact — every debt at its real balance, in one place.' },
      { id: 'q_emergencyfund', because: 'Because income is never guaranteed and spending always is, the buffer is what stops the next gap becoming new borrowing.' },
    ],
    vaultSource: 'Finance & money / Resource / Мухамижанова — Долги, рассрочки и формирование капитала',
  },
  {
    slug: 'manage-emotions-dont-control-them',
    attr: 'friends',
    title: 'Manage the emotion. Do not control it.',
    origin: 'Victoria Shimanskaya — on emotional intelligence as a skill',
    medium: 'podcast',
    minutes: 6,
    hook: 'One sentence structure that separates the feeling from you — and changes it in the process.',
    thesis:
      'Emotional intelligence runs in three stages: recognise and name the emotion, separating it from yourself ("I feel anger", not "I am angry"); understand what caused it; then choose the response from that cause. The distinction the whole account rests on is managing rather than controlling — control is felt in the body as clamping down and tends toward psychosomatic cost, while management feels like flexibility and choice. There are no bad emotions, only signals carrying energy and a function; only the expression can be wrong.',
    ideas: [
      {
        name: 'The same feeling, different causes, different handling',
        body: 'Anxiety from a nutrient deficiency, from bad news, and from fear of speaking in public are the same sensation with three different origins — and the correct response differs in each case. Skipping the cause stage means treating all of them identically, which is why generic advice about emotions so often fails.',
      },
      {
        name: 'The three-part formula',
        body: '"I feel X, because Y, and I would like Z." It executes all three stages in one sentence: it names the emotion apart from the identity, states the cause, and converts the state into a request. The claim is that the wording does not merely describe the state but changes it — "I am upset" degrades how you feel, while "I feel off, give me five minutes" is already a route out.',
      },
      {
        name: 'Language fuses feeling and identity',
        body: 'Everyday grammar quietly does the merging — "you are angry" instead of "you are feeling anger". Separating the two in how you speak is the practical form of separating them in how you experience it.',
      },
      {
        name: 'A stop-word is preventive, not emergency equipment',
        body: 'A personal trigger word, said instead of the automatic reaction, buys the pause in which "why do I feel this right now?" can be asked. It only works if trained in advance — reaching for it for the first time mid-emotion does not work.',
      },
      {
        name: 'Vocabulary widens perception',
        body: 'Six basic emotions combine into compound ones — disappointment, for instance, as sadness plus surprise, arising specifically from a gap between expectation and reality. The exercise is to write out sixteen distinct shades of a single emotion. The analogy offered: the more names for colours a person knows, the more shades the eye actually distinguishes.',
      },
    ],
    notes: [
      'Control is associated with blocked digestion and a stress response that shows up later as evening overeating; management leaves the option of deciding whether the emotion is needed now, and letting it go if not.',
      'Asking "but why" down to a third or fourth level is offered as the diagnostic that gets past the surface answer — past "he is an idiot" or "I am just lazy" to the cause the response should actually address.',
      'Boundaries with someone who reliably pushes you into unwanted behaviour work better formulated in advance than improvised at the moment of pressure.',
      'The author is a practising specialist with mainstream-published books rather than an academic researcher. Plutchik\'s wheel, Vygotsky and Gardner are used appropriately; the neurophysiology is broadly correct at a general level but uncited; and the proprietary diagnostic and role-model framework should be taken as a useful practitioner\'s frame rather than an independently validated instrument.',
    ],
    practices: [
      'Replace "I am upset" with "I feel X, because Y, I would like Z" — in conflicts at home and in negotiations alike.',
      'Choose a stop-word now, while calm, and rehearse it. It is preventive equipment.',
      'When irritated, ask why three or four times rather than stopping at the first answer.',
      'Build the vocabulary deliberately: name several distinct shades of one emotion instead of reusing one word for all of them.',
      'Decide a boundary with a difficult person in advance, in words, rather than improvising under pressure.',
    ],
    habits: [
      { id: 'f_remember', because: 'Asking about what someone told you last time is the outward half of the same skill — reading another person\'s state well enough to know what mattered to them.' },
      { id: 'f_thanks', because: 'Naming specifically what someone did is the same precision the shades exercise trains, pointed outward instead of inward.' },
      { id: 'f_nogossip', because: 'Talking about someone who is absent is expression without the cause stage — the exact failure mode the three-stage model is meant to catch.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The formula and the pre-formulated boundary are built for precisely this conversation, which is why having it is the test of whether they work.' },
    ],
    vaultSource: 'Social & friends / Resource / Шиманская — Эмоциональный интеллект как навык управления, а не контроля',
  },
  {
    slug: 'the-pleasure-pain-balance',
    attr: 'development',
    title: 'Pleasure and pain share one set of scales',
    origin: 'Anna Lembke — psychiatrist, on dopamine, indulgence and honesty',
    medium: 'podcast',
    minutes: 7,
    hook: 'The comedown is not a side effect. It is the same system rebalancing — and waiting it out is the whole skill.',
    thesis:
      'Pleasure and pain are processed by the same brain structures and behave like scales seeking equilibrium: any stimulus on one side produces an equal tilt to the other. Under repeated indulgence the rebound gains the advantage — the brain compensates by down-regulating its own dopamine transmission — and if the balance is never allowed to recover, a person settles into a chronic dopamine deficit that is subjectively indistinguishable from clinical depression.',
    ideas: [
      {
        name: 'Deviation from baseline, not absolute level',
        body: 'Dopamine is tied to movement as much as to reward, and is released tonically at a baseline. What matters is the deviation from that baseline rather than the absolute figure — and there is evidence that in depression the tonic baseline itself may sit lower.',
      },
      {
        name: 'Why the pain side wins',
        body: 'After a large dopamine release the brain immediately compensates downward by reducing receptor sensitivity. That compensation is the hangover, and the moment of wanting to repeat. Wait for the feeling to pass and the balance restores itself; keep indulging before it recovers and the result is anhedonia — anxiety, irritability, insomnia, dysphoria, intrusive thoughts of using.',
      },
      {
        name: 'Addiction is one circuit, not many diseases',
        body: 'The same loop can attach to almost any substance or behaviour. That is why the mechanism generalises across things that look unrelated from the outside.',
      },
      {
        name: 'Impulsivity is a risk factor, not a vice',
        body: 'The inability to find space between wanting and acting genuinely raises addiction risk — but is not bad in itself: in intimacy or in danger it is exactly what serves. Many traits currently framed as disorder would be advantages in a different environment; the mismatch is with this world, not with the person.',
      },
      {
        name: 'Pleasure often turns into avoidance',
        body: 'Even when the pursuit begins as pleasure-seeking, motivation shifts over time toward avoiding withdrawal and consequence — which is why "pleasure" cannot be treated as one single thing.',
      },
      {
        name: 'Modern life is hard because it is boring',
        body: 'With survival needs largely met, people have to manufacture their own friction — effort and challenge. How much friction someone needs varies widely, and those who need a lot and do not build it deliberately tend to find it in worse ways.',
      },
    ],
    notes: [
      'Abstinence long enough to reset the circuit is put at roughly thirty days on average — presented as clinical experience generalised, not as a measured constant.',
      'Complete honesty, including in small things, is named as a load-bearing part of recovery rather than a moral extra — and as a daily, checkable marker of progress.',
      'Vigilance matters most when things are going well. Success is itself a trigger, not protection.',
      'Rather than waiting to discover a calling, the recommendation is to look at what actually needs doing right now, nearby.',
      'Lembke is a practising psychiatrist running a dual-diagnosis clinic; the pleasure-pain homeostasis mechanism is settled neurobiology rather than a contested position. Specific figures quoted from memory in conversation — including a recovery percentage attributed to a real study — are worth checking before being relied on precisely.',
    ],
    practices: [
      'When the rebound hits, wait it out instead of resolving it with more of the same. That pause is the entire mechanism.',
      'Plan phone and social media use in advance — set hours off, physical no-phone zones — rather than deciding in the moment.',
      'Practise honesty in small things as the daily marker, not only in the large ones.',
      'Raise vigilance when things are going well, not only in a crisis.',
      'When apathetic or bored, look around for what actually needs doing instead of waiting for inspiration.',
    ],
    habits: [
      { id: 'd_nopassive', because: 'The cheapest available source of the exact rebound described — and putting making before consuming is the self-binding rule in its smallest form.' },
      { id: 'f_nodoom', because: 'A pre-committed barrier rather than an in-the-moment decision, which is precisely the form the source says actually works.' },
      { id: 'b_nocompare', because: 'Scrolling other people\'s lives is the indulgence whose rebound is hardest to notice, because it does not feel like one while it happens.' },
    ],
    quests: [
      { id: 'q_declutter', because: 'Self-binding is environmental before it is psychological — the barriers have to exist in the room, not only in the intention.' },
      { id: 'q_habitsystem', because: 'Manufacturing deliberate friction is a structural job: if the effort is not scheduled, the scales get tipped by whatever is nearest.' },
    ],
    vaultSource: 'Personal growth / Resource / Лембке — Баланс удовольствия-боли, зависимость и правда',
  },

  {
    slug: 'resist-less',
    attr: 'brightness',
    title: 'The point is not to try harder. It is to resist less.',
    origin: 'Anne Lamott — on attention, permission and the first draft',
    medium: 'podcast',
    minutes: 6,
    hook: 'Most creative blocks are not a skill problem. They are an attention problem, and they have a different fix.',
    thesis:
      'Most problems that present as a deficit of skill are really a deficit of attention. Being blocked is usually being empty — and the remedy is noticing the world more closely, not accumulating more experiences, because what a piece needs is generally already available to anyone paying attention. Editing is a separate matter entirely: a mechanical, learnable craft of cutting and strengthening whatever a permissive first draft produced.',
    ideas: [
      {
        name: 'Headlights in fog',
        body: 'Borrowed from Doctorow — driving at night, you see only a little way ahead and can still make the whole journey — with fog added. You do not need the ending or even the next chapter, only the next couple of sentences; arriving at them reveals what follows.',
      },
      {
        name: 'Empty, not blocked',
        body: 'When a novelist friend reported writer\'s block, Lamott\'s reply was that she was not blocked but empty — all the sand had run out of the sack. The accompanying image is a "ragbag" collector who gathers noticed scraps (a colour, a texture, an overheard line) into a mental quilt and hands it over only once there is enough material. The fix is better attention, not chasing more experience, which only adds pressure.',
      },
      {
        name: 'Resist less',
        body: 'The line she uses as her core discipline reframes the work as agreeing to notice and receive rather than forcing output. Trying harder is the wrong axis.',
      },
      {
        name: 'Attention is raw material, and it need not be yours',
        body: 'She does not need to have lived a thing to write it: the exact greenish-yellow centre of someone else\'s orchid can later become a character\'s eyes. The craft is capturing observed specifics as they happen — a pen and index card, or phone notes — because writing something down makes it nearly indelible even if never used.',
      },
      {
        name: 'The inner critic is a character you can negotiate with',
        body: 'Locate where the critical voice physically sits, bring it forward, and ask directly who hired it, why, and when. The practice is not to silence or defeat it — it once served a protective function — but to thank it for that and ask it to step aside while you work.',
      },
      {
        name: 'Three drafts, three different jobs',
        body: 'The child\'s draft gets everything down permissively, firm but friendly with yourself and without judgement; it will be too long and partly bad. The later passes are where cuts and stronger verbs happen, and then the final line edit. Conflating the three is what makes first drafts impossible.',
      },
    ],
    notes: [
      '"Tell me a story, make me care" works as a compact test for anything you make: is there a real stake and a recognisably human, flawed subject, or is it only information delivery?',
      'Lamott is a long-established published author speaking about her own documented method; this is high-reliability craft opinion rather than research, and the personal anecdotes are self-reported and not load-bearing.',
      'One quotation in the source is misattributed in transcription — the line about surviving childhood giving you enough to write about belongs to Flannery O\'Connor. Flagged rather than quietly corrected.',
    ],
    practices: [
      'When stuck, treat the diagnosis as "pay closer attention", not "try harder".',
      'Carry something to capture specifics the moment you notice them — writing it down is what makes it available later.',
      'Give yourself an explicitly bad first pass, then do the cutting in a separate, later session.',
      'Name the inner critic and ask it to step aside for the duration of the draft rather than trying to win the argument.',
    ],
    habits: [
      { id: 's_makecreate', because: 'The permission model only works if there is a regular, low-stakes place to put a bad first pass — twenty minutes is the size that survives a busy week.' },
      { id: 'b_play', because: 'The ragbag fills through undirected noticing, which is exactly what doing something with no purpose protects time for.' },
      { id: 'd_notes', because: 'Writing an observation down in your own words is the capture step she says makes a detail nearly indelible, whether or not it ever gets used.' },
    ],
    quests: [
      { id: 'q_makeweekly', because: 'The three-draft model is meaningless until one thing gets carried all the way to finished — that is where the second and third passes actually happen.' },
    ],
    vaultSource: 'Memories & Fun / Resource / Anne Lamott — Writing Advice and the Craft of Attention',
  },
  {
    slug: 'escalate-dont-subvert',
    attr: 'brightness',
    title: 'Finish it first. Diagnose later.',
    origin: 'Brandon Sanderson — on promises, escalation and broken stories',
    medium: 'lecture',
    minutes: 6,
    hook: 'The instinct to tell "stuck" from "fundamentally broken" is earned by finishing things, not by thinking harder.',
    thesis:
      'Subplots, twists and hooks all pass or fail on one test: do they escalate the stakes and honour the promises already made to the audience, or do they merely surprise and delay without paying off? And the ability to tell an ordinary stuck patch from a genuinely broken structure only develops after finishing several complete pieces — which is the argument for finishing rather than diagnosing mid-draft.',
    ideas: [
      {
        name: 'The promise is the contract',
        body: 'The failure in a badly received subplot is usually not the digression itself but an abandoned promise. The worked negative example opens by stating an explicit goal — I need to get to my friend — then immediately drops it for an unrelated errand. Breaking the promise, not the detour, is what the audience actually registers.',
      },
      {
        name: 'Twists must escalate, not merely subvert',
        body: 'A twist is good only insofar as it expands the scope or stakes of a conflict that already exists. The canonical example works because it is a natural escalation of a conflict the story had been building toward, with real foreshadowing — not because it was unexpected.',
      },
      {
        name: 'Every subplot deserves its own promise-and-progress',
        body: 'In a large cast, audiences will always rank favourites and least-favourites; that is unavoidable rather than a fixable bug. The lever is treating each secondary arc with the same discipline as the main one, so it reads as its own story rather than a detour.',
      },
      {
        name: 'There is no master list — build your own',
        body: 'He says plainly that he has never found a satisfying catalogue of plot archetypes beyond reductive lists. The alternative is deliberate pattern-matching: consume work while asking what sub-genre and beat pattern it belongs to, and accumulate a personal, growing catalogue of reusable patterns.',
      },
      {
        name: 'The threshold of tolerance, and what earns it',
        body: 'Every audience tolerates a different amount of slow setup before leaving, and that tolerance is extended by trust an author has already earned. The practical rule for openings: establish the character\'s head, the tone, and their relationship to the coming conflict as fast as possible. Nobody has ever complained that something started too interesting.',
      },
    ],
    notes: [
      'Sanderson is unusually explicit about the limits of his own frameworks — he admits an unsolved structural problem in a published book and a years-long struggle to fix another. That makes him a useful calibration against more dogmatically stated craft "laws".',
      'This is a working practitioner teaching a university course, not a content-creator take; the frameworks are offered as heuristics rather than measured findings.',
    ],
    practices: [
      'Before adding a thread, state its promise to the audience in one sentence — then check later whether that exact promise was honoured.',
      'Test every planned reveal with: does this deepen a conflict they already care about, or is it surprise for its own sake?',
      'Finish the draft before deciding it is broken. The diagnostic instinct is a product of completed work.',
      'Build your own catalogue of patterns by asking, of everything you consume, what shape it actually is.',
    ],
    habits: [
      { id: 'c_ship', because: 'Whether a promise was honoured is not knowable from inside your own head — it needs one person who did not watch you make it.' },
      { id: 's_makecreate', because: '"Finish it first" is a claim about accumulated volume, and volume is made of ordinary sessions rather than inspired ones.' },
    ],
    quests: [
      { id: 'q_makeweekly', because: 'This is the thesis as a task: the judgement he describes is only earned by carrying something all the way to done.' },
      { id: 'q_portfolio', because: 'Tolerance is extended by trust already earned — which requires the earlier work to exist somewhere findable.' },
    ],
    vaultSource: 'Memories & Fun / Resource / Sanderson — Viewpoint, Escalation and Diagnosing a Broken Story',
  },

  {
    slug: 'heart-soul-body-mind',
    attr: 'spirituality',
    title: 'Treating the symptom is not the same as treating the soul',
    origin: 'Rania Awaad — psychiatrist, on al-Ghazali\'s model of the psyche',
    medium: 'podcast',
    minutes: 7,
    hook: 'Two opposite errors — faith instead of treatment, and treatment with no soul in it. The source rejects both.',
    thesis:
      'Islamic psychology is presented not as adding scripture to an existing Western model but as a discipline built from its own sources, in which the psyche cannot be treated while the soul is left out. The clinical position is explicitly neither of the two available extremes: refusing medicine on the grounds that faith should be sufficient, and full medicalisation with no spiritual component, are both named as failures.',
    ideas: [
      {
        name: 'Al-Ghazali\'s model, used clinically',
        body: 'At the centre sits the qalb — the metaphysical heart, not the organ — connected bidirectionally to the ruh (soul), the nafs (here meaning behavioural inclination rather than simply "self"), the jasad (body) and the aql (mind). All four interact, so intervening on behaviour alone or cognition alone produces symptom reduction rather than healing.',
      },
      {
        name: 'The stated goal is fitra, not symptom scores',
        body: 'Therapy aims at returning a person toward their original given state. Work that never touches the ruh is described as operating on the surface layer — real, but partial.',
      },
      {
        name: 'Grief and trauma are different processes',
        body: 'Grief is bounded in time and naturally weakens. Trauma is the state in which the same circumstances still spontaneously trigger a person long afterwards — and if that is not happening, the source calls it a difficulty rather than trauma in the clinical sense. Untreated trauma does not fade; it goes deeper and resurfaces at full intensity.',
      },
      {
        name: 'The hadith cited against refusing treatment',
        body: 'Asked whether one should seek treatment when ill, the Prophet answered yes, and added that Allah does not send an illness without also sending its cure. On that basis the source sharply criticises the claim that a believer does not get depressed as contradicting both the Sunnah and the evidence.',
      },
      {
        name: 'Depression is multifactorial',
        body: 'Reducing its cause to weak faith ignores biological, hormonal, genetic and environmental factors. Postnatal depression — affecting roughly one in five women — is given as a largely hormonal condition unrelated to strength of iman, and blaming the woman\'s faith is named as direct harm.',
      },
      {
        name: 'Therapy is a period, not an identity',
        body: 'It is framed as time-bounded, with the goal that a person becomes their own therapist rather than indefinitely dependent on one specialist — a useful marker for whether a process is actually going somewhere.',
      },
    ],
    notes: [
      'Historically, the argument is that psychiatric care was first institutionalised inside a hospital system in the Islamic world, and that the model was integrated: architecture, music, diet, talking therapy and spiritual care working together rather than separately.',
      'A useful self-check offered on wealth: the question is not the size of the income or the ambition, but where the heart\'s priority actually sits.',
      'The author is a practising psychiatrist with an academic post and classical religious training, and states those positions openly as the basis for trust. The historical section is her own archival argument advancing a specific thesis rather than independently verified here, and the hadith is conveyed by meaning without a chain analysis in the interview.',
    ],
    practices: [
      'Before interpreting a hard state spiritually, account for the biological, hormonal and environmental factors — especially postnatally.',
      'Distinguish grief from trauma by whether the triggers still return at full intensity long afterwards; if they do, seek structured help rather than waiting it out.',
      'Judge a therapeutic process by whether it is making you more able to handle yourself, not by how long it has lasted.',
      'Check where the heart\'s priority sits rather than auditing the income figure.',
    ],
    habits: [
      { id: 's_dhikr', because: 'The model\'s whole claim is that leaving the ruh untouched gives symptom reduction rather than healing — this is the smallest daily version of not leaving it out.' },
      { id: 'd_review', because: 'Grief that fades and trauma that keeps returning can only be told apart by noticing the pattern over weeks, which needs a standing look rather than memory.' },
      { id: 's_gratitude', because: 'Naming what went right is the practical form of the source\'s reframe: relationship built on recognising what is already there rather than on what is missing.' },
    ],
    quests: [
      { id: 'q_learnfaith', because: 'The model is only usable if actually understood — and the source\'s own argument is that doubts do not clear without deliberate study.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Rania Awaad — Бимаристан, модель психики по Газали и границы медикализации',
  },
  {
    slug: 'the-map-and-the-support',
    attr: 'spirituality',
    title: 'Feeling lost is a signal, not a verdict',
    origin: 'Belal Assaad — lecture on guidance and its five components',
    medium: 'lecture',
    minutes: 6,
    hook: 'Guidance splits into two kinds — and confusing them is what makes "guides whom He wills" sound arbitrary.',
    thesis:
      'Guidance is a two-way process rather than something imposed or withheld arbitrarily. One kind is universal — the map, given to everyone without exception. The other is the support that comes to those who took the map up. Feeling lost is therefore read as a signal to return to five concrete elements of practice rather than as a verdict already passed.',
    ideas: [
      {
        name: 'Two kinds of guidance',
        body: 'Guidance-as-direction is universal and does not depend on acceptance — the map is issued to everyone. Guidance-as-support is subjective and arrives only after the first is taken up. The apparent tension in "guides whom He wills" resolves once the phrase is read as applying to the second kind.',
      },
      {
        name: 'Being left in your own choice',
        body: 'Correspondingly, misguidance is presented not as active pushing off the path but as being left in the choice you insisted on — the same logical structure as the freedom to jump or not.',
      },
      {
        name: 'Recitation with tadabbur, not as an oracle',
        body: 'The first component is remembrance, at best through the Qur\'an read reflectively — rereading a single verse many times and going deeper — explicitly against superstitious use. The cautionary anecdote is a man opening the Mushaf at random and reading the first words as a sign, which produced a verse about Musa\'s serpent in answer to a question about marriage.',
      },
      {
        name: 'The five components',
        body: 'Remembrance; conviction in belief, meaning going back and studying what one actually holds, since doubts do not resolve without deliberate study; the obligatory acts first and then the voluntary ones; charity, which explicitly includes a service, an embrace, a smile, or listening to someone\'s pain; and good company that reminds you.',
      },
      {
        name: 'The "222" minimum',
        body: 'For the voluntary night prayer: two units, two tears of sincerity, at two in the morning, for two minutes. Offered as the smallest possible version that still counts — a deliberately low floor rather than an ideal.',
      },
      {
        name: 'Gratitude as the opening move',
        body: 'A story about rereading the Qur\'an and rediscovering the meaning of its first word — praise — as an invitation into relationship through recognising blessings already present, rather than through what is lacking.',
      },
    ],
    notes: [
      'Charity is defined broadly enough that having no money removes no excuse: a service, a smile, or listening counts.',
      'A recurring caution: do not judge someone\'s religiosity by outward behaviour observed in a moment — including your own earlier practice.',
      'The speaker is a preacher rather than an academic; much of the material is personal narrative and practical exhortation rather than strict exegesis. Hadith are attributed to their collections but given by meaning without chains examined, and at least one fiqh position is flagged by the speaker himself as contested rather than settled.',
    ],
    practices: [
      'Read feeling lost as an instruction to check the five components rather than as evidence about your standing.',
      'Reread one verse repeatedly for meaning instead of covering volume — and do not use the text as an oracle for decisions.',
      'Secure the obligatory acts before adding voluntary ones.',
      'Use the smallest viable version of the night prayer rather than an ideal you will not keep.',
      'Treat company as part of the practice, not as background.',
    ],
    habits: [
      { id: 's_fivedaily', because: 'The order in the five components is explicit: the obligatory acts come first, and the voluntary ones are built on top rather than instead.' },
      { id: 's_quran', because: 'One page read with tadabbur is the component named first — and the format the source argues for, against covering volume.' },
      { id: 'm_charity', because: 'Charity here explicitly includes a service, a smile or listening, which makes the daily version possible regardless of what is in the account.' },
    ],
    quests: [
      { id: 'q_anchor', because: 'The five components only function as a returnable structure if at least one of them is fixed to the day rather than negotiated each morning.' },
      { id: 'q_learnfaith', because: 'Component two is exactly this: doubts are described as not clearing on their own, only through deliberate study of what you actually hold.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Belal Assaad — Хидая, пять слагаемых руководства и вопрос обращённых',
  },

  {
    slug: 'goal-audience-format-moment',
    attr: 'career',
    title: 'One goal, then audience, format and moment',
    origin: 'Nina Zvereva — communications trainer, on speaking and being remembered',
    medium: 'podcast',
    minutes: 6,
    hook: 'A thousand goals means no goal — and eight seconds decides whether anyone is still listening.',
    thesis:
      'A talk or an important conversation works only if it starts from one clearly formulated goal — the expected result — and that result only lands if three further factors are respected: the audience, the format, and the moment. Any one of the three can collapse the communication entirely, even when the goal is perfectly stated. The speaker\'s actual job is not saying things well; it is being remembered.',
    ideas: [
      {
        name: 'A thousand goals means no goal',
        body: 'The goal is the expected result, stated as one thing. Everything downstream — what to include, what to cut, how to open — is decided by it, which is why an unfocused goal produces an unfocused talk no amount of delivery can rescue.',
      },
      {
        name: 'Said it, proved it',
        body: 'Any claim has to be backed by a fact, an example or a story, or it will not be remembered. But proof has a ceiling too: too many stories and figures dissolve the thread of the claim they were meant to support.',
      },
      {
        name: 'The eight-second rule',
        body: 'A speaker has roughly eight seconds to hook an audience — by analogy with how quickly a viewer decides whether to keep watching. The practical consequence is specific: learn the first sentence by heart rather than preparing a general plan, because that sentence decides whether the rest gets heard.',
      },
      {
        name: 'Prepare triggers, rehearse aloud, not at a mirror',
        body: 'Do not write the talk out in full — prepare a notebook of trigger words meaningful only to you. Record yourself, since recorded speech always runs shorter than live delivery, where pauses appear. Do not rehearse at a mirror: your own frightened eyes amplify the anxiety. Rehearsing aloud in front of family or friends is already a real rehearsal.',
      },
      {
        name: 'Turn the nerves into drive rather than removing them',
        body: 'Pre-talk nerves are not a defect to eliminate but a sign of being alive and charged — the stated position is that it will be a bad sign when the nerves stop. The task is converting them into drive without letting them take your tongue.',
      },
      {
        name: 'The moment is uncontrollable and cannot be ignored',
        body: 'The moment is whatever is happening here and now that you do not control — noise next door, a piece of news everyone is carrying, a match on everyone\'s mind. Walking out and behaving as though it does not exist loses the room; sometimes cancelling is the better call. The worked example is a speaker arriving crumpled after a night at the maternity hospital who simply named why — and had the audience immediately.',
      },
    ],
    notes: [
      'Announcing the format explicitly at the start — "I will take N minutes of your time" — saves time and sets the frame for any meeting, not only a talk.',
      'An I-statement instead of a direct accusation is offered as a general de-escalation technique, not a family-specific one.',
      '"Do the surplus" as a principle: try more variants than are formally required, so you have earned the right to have some of them fail.',
      'This is a practising trainer with decades of broadcast and coaching experience. The central formula is presented as her own find that nobody has yet disproved — a practical instrument from one successful trainer rather than a validated model, and worth taking on those terms.',
    ],
    practices: [
      'Before anything that matters, write one goal, then check it against audience, format and moment.',
      'Write and memorise the opening sentence. Prepare the rest as trigger words only.',
      'Rehearse out loud to a person, and record yourself — never to a mirror.',
      'Name the moment out loud when there is one, rather than performing around it.',
      'State the format up front so nobody is guessing how long this will take.',
    ],
    habits: [
      { id: 'c_plan', because: 'Goal, audience, format and moment are four decisions best made the night before, not in the corridor on the way in.' },
      { id: 'c_ship', because: 'Rehearsing aloud to one real person is named as a full rehearsal — and it is the only way to find out what actually landed.' },
      { id: 'd_askquestion', because: 'Audience is half the formula, and the fastest way to stop guessing at it is to ask the question you would normally skip.' },
    ],
    quests: [
      { id: 'q_skill', because: 'Speaking is treated here as a craft with a protocol rather than a trait — which makes it a concrete skill to take on deliberately.' },
      { id: 'q_promise', because: 'The eight-second rule and the moment can only be practised in front of actual people, which requires committing to a date you cannot quietly drop.' },
    ],
    vaultSource: 'Business & career / Resource / Зверева — Формула ЦАФМ, правило 8 секунд и волнение как кураж',
  },
  {
    slug: 'psychology-over-technique',
    attr: 'career',
    title: 'Perfect technique with broken psychology is worth nothing',
    origin: 'Anatoly Tremzin — professional player, on preparation, tilt and leaks',
    medium: 'podcast',
    minutes: 5,
    hook: 'Knowing your weakness does not remove it, because the decision has already been made automatically.',
    thesis:
      'At an elite level the asymmetry is explicit: flawless technique paired with failing psychology gives no chance of success. The corollaries are unglamorous — sleep ranks above nutrition and training in the preparation hierarchy, the cost of high performance is a specific sacrifice consciously accepted rather than resented, and known weaknesses persist because decisions are made automatically, long before the knowledge can intervene.',
    ideas: [
      {
        name: 'Everything has a price, and accepting it is what makes it bearable',
        body: 'World-class performance is described as requiring a concrete sacrifice — in his case an inverted sleep schedule. The claim is that it stays comfortable precisely because it was chosen consciously as the price, rather than experienced as an imposed restriction.',
      },
      {
        name: 'Flexible planning beats rigid planning',
        body: 'Rigid planning fixes the day and follows it regardless. Flexible planning holds an approximate plan and deliberately changes it when something more valuable appears. For an unpredictable working life, the flexible mode is presented as the healthier one.',
      },
      {
        name: 'Sleep is priority one',
        body: 'The stated hierarchy puts sleep above both nutrition and physical training when preparing for a demanding stretch. His personal threshold: six hours is not enough to reset, seven is the minimum.',
      },
      {
        name: 'Leaks — known weaknesses that resist being fixed',
        body: 'A "leak" is a weakness the player already knows about. The observation that matters is that awareness is not enough: decisions become mechanical and automated — the button is pressed, and only afterwards does the recognition arrive. Closing the gap between knowing and doing needs targeted practice, not more understanding.',
      },
      {
        name: 'Catch the emotion first',
        body: 'The first step in handling tilt is recognising the emotion in the moment — a general self-regulation technique that transfers well beyond the game, since naming it in the moment is what lowers the odds of an impulsive decision.',
      },
      {
        name: 'Top 1% in several fields, deliberately',
        body: 'An explicit alternative to trying to be the single best at one thing: aim for the top percentile in more than one area at once, as a stated strategy for distributing effort across several active projects.',
      },
    ],
    notes: [
      'Preparation includes studying recordings of specific future opponents — mood, tactics, patterns — before the stage where the real stakes sit.',
      'At the top the contest is recursive reading of intent and deliberate exploitation of noticed patterns, rather than strategy knowledge alone.',
      'Play strictly within a predetermined budget — bankroll management generalises to any decision made under real risk.',
      'The speaker has a verifiable public record and is openly candid about his own gambling addiction and long struggle with it. Claims about typical earnings and industry structure come from personal experience rather than external statistics.',
    ],
    practices: [
      'Name the price your goal actually requires and accept it explicitly, or drop the goal.',
      'Hold the plan loosely enough to trade up when something genuinely more valuable appears.',
      'Protect sleep ahead of diet and training when a demanding stretch is coming.',
      'Attack a known weakness with targeted practice — understanding it does not disarm an automatic decision.',
      'Catch and name the emotion before acting on it.',
    ],
    habits: [
      { id: 'h_lightsout', because: 'The stated hierarchy puts sleep above nutrition and training — this is that priority made into a decision you only take once.' },
      { id: 'c_plan', because: 'Flexible planning still needs a plan to deviate from; without one, every interruption looks equally valuable.' },
      { id: 'c_onelesson', because: 'Leaks close through targeted practice, and targeting requires noticing what actually worked rather than reconstructing it later.' },
    ],
    quests: [
      { id: 'q_skill', because: 'The gap between knowing a weakness and acting differently is closed by deliberate practice over a real stretch of time, not by insight.' },
    ],
    vaultSource: 'Business & career / Resource / Тремзин — Психология как 100%, гибкое планирование и топ-1% в двух сферах',
  },

  {
    slug: 'budget-from-facts',
    attr: 'money',
    title: 'Build the budget from transactions, not from memory',
    origin: 'Caleb Hammer — on budget audits and the share-of-income view',
    medium: 'podcast',
    minutes: 6,
    hook: 'Everyone agrees with the principles. The statement is where the disagreement actually shows up.',
    thesis:
      'Financial trouble rarely looks like not knowing the principles — it looks like agreeing with every one of them and immediately producing a reason to keep spending. The diagnostic that cuts through: build the budget from actual transactions rather than from a person\'s account of themselves, and convert every category into a percentage of income, because that is the only view in which small purchases visibly outweigh the large obvious ones.',
    ideas: [
      {
        name: 'Facts before principles',
        body: 'The method is to take a full month\'s statement, sort every transaction into categories, and compute the reality before arguing about discipline. In the worked case the self-description ("I pay my own bills") and the statement disagreed on nearly every point.',
      },
      {
        name: 'Share of income is the diagnostic language',
        body: 'Each category is expressed as a percentage of total income. The reference point offered: if rent alone is consuming most of the income, the conversation about spending discipline is secondary — the problem is structural, and no amount of restraint on small categories will reach it.',
      },
      {
        name: 'A credit limit is not a credit debt',
        body: 'Confusing the maximum you may spend with what you actually owe is presented as a basic literacy gap that looks trivial until it has produced thousands in real debt.',
      },
      {
        name: 'The reserve rule, deliberately harsher',
        body: 'The floor is set as the greater of six months of essential spending or a fixed nominal sum — deliberately stricter than the common three-to-six-months rule, on the reasoning that a real emergency (medical, vehicle) does not scale down just because the income is small.',
      },
      {
        name: 'Help without a change of behaviour removes the trigger',
        body: 'Clearing someone\'s debt without requiring anything to change is argued to remove the only effective prompt for change and to set up a predictable repeat of the same debt.',
      },
    ],
    notes: [
      'Check whether you are paying for a version of something that has a free equivalent — a quick, painless audit that usually finds something.',
      'The mechanics of repayment given: total the required minimums, subtract all genuine essentials from income, and direct everything left at the debt.',
      'Watch for the pattern of agreeing in one sentence and contradicting it in the next — useful as a test on your own internal monologue, not only on other people.',
      'The format is a deliberately confrontational entertainment audit. The host\'s interrupting, sarcastic style is the genre, not a model for how to hold this conversation with your own family.',
      'The reserve figure and the rent threshold are standard American personal-finance reference points, not universal constants — cost of living, currency and available social provision all change them.',
      'The framing of family help as straightforwardly harmful is a culturally specific "tough love" position. It sits in real tension with traditions that treat supporting family as an obligation, and is worth holding as one view rather than a verdict.',
    ],
    practices: [
      'Pull one full month of transactions and categorise every line before drawing any conclusion about your habits.',
      'Convert each category to a percentage of income — that is where the small recurring things become visible.',
      'Know the difference between your limit and your balance, in numbers, today.',
      'Set the emergency floor by the harsher of the two rules, and treat it as the target you move toward rather than a demand for right now.',
      'If you give or receive help, attach a change in behaviour to it rather than repeating it unconditionally.',
    ],
    habits: [
      { id: 'm_log', because: 'The whole method depends on the transaction record existing — a budget built from memory is exactly the thing the audit disproves.' },
      { id: 'm_checkbalance', because: 'Limit versus balance is the confusion at the centre of the worked case, and this is the ten-second habit that makes it impossible to hold.' },
      { id: 'm_subs', because: 'The paid-where-a-free-version-exists check is a recurring-charge problem, and recurring charges only surface if something looks at them weekly.' },
    ],
    quests: [
      { id: 'q_emergencyfund', because: 'The reserve rule is the source\'s one hard number — and it is deliberately set above the common advice because emergencies do not scale with income.' },
      { id: 'q_debts', because: 'Minimums first, then everything spare at the balance, requires the same artefact the audit does: every debt, at its real number.' },
    ],
    vaultSource: 'Finance & money / Resource / Caleb Hammer — Аудит бюджета, ловушка доли дохода и семейное потворство долгам',
  },
  {
    slug: 'investing-is-not-trading',
    attr: 'money',
    title: 'Investing is not trading, and chasing yield is how capital dies',
    origin: 'Kladko — investor, on diversification rules and the pull of fast returns',
    medium: 'podcast',
    minutes: 6,
    hook: 'The loss did not come from a bad market. It came from deciding a good return was too slow.',
    thesis:
      'Investing and trading are different activities with different costs: investing aims at long-term return at risk only slightly above a deposit and needs a few minutes of attention a month, while trading requires continuous market attention and is a full working day. "Trader is a profession; anyone can be an investor." The characteristic failure is not a bad market but the decision that an adequate return is too slow — which is the doorway to schemes built for exactly that impulse.',
    ideas: [
      {
        name: 'The loss followed the good months, not the bad ones',
        body: 'After three or four successful months of active trading, the judgement that the returns were too small led to searching online for something better — and to losing nearly the entire capital in a pyramid scheme. The lesson taken from it was a permanent move to long-term strategy and an end to chasing quick profit.',
      },
      {
        name: 'Numeric diversification limits',
        body: 'Concrete ceilings rather than principles: no more than a set share of capital in a single country, a hard cap on any one company inside a fund, and a small ceiling on speculative assets. The point of numbers is that they still work on a day when conviction is high.',
      },
      {
        name: 'The rollback after a jump in income',
        body: 'A sharp rise in income was followed by a collapse the next month. The explanation offered: a new income level demands a matching level of responsibility, energy, environment and projects, and without accumulated capacity for it the rollback is predictable. The useful part: each rollback is proportionally smaller than the rise, so the level ratchets upward rather than returning to zero.',
      },
      {
        name: 'Money solves money problems, and no others',
        body: 'The first large sum is described as producing exactly one thing — expenses of the same size — and roughly half a year of reckoning with the fact that the expected transformation did not arrive.',
      },
      {
        name: 'Why she left profitable trading',
        body: 'Three reasons given, none financial: it adds no value and serves nobody; one participant\'s gain is another\'s loss; and the psychological damage she observed in traders directly, including someone carrying enormous debt while outwardly composed.',
      },
    ],
    notes: [
      'One year, one field in focus, the rest held steady — offered as a concrete alternative to running everything at once.',
      'A morning practice of writing goals before opening messages, and a rule against heavy financial reading first thing, are both given as zero-cost and immediately available.',
      'The speaker is a practising investor and adviser with an evident commercial interest — courses are promoted in the episode. The early-biography details carry noticeable self-presentation and are not verifiable.',
      'The diversification numbers are reasonable and match standard risk-management practice; some of the supporting market history is simplified and given without a source.',
      'Her firm position that regularly supporting parents inverts the family hierarchy and harms both sides is a personal conviction, not a consensus of family psychology — and stands in direct tension with traditions treating that support as an obligation. Useful as one viewpoint, not as a diagnosis.',
    ],
    practices: [
      'Decide which activity you are actually doing — investing or trading — and price the time it demands honestly.',
      'Write the diversification ceilings as numbers before you have a position you feel strongly about.',
      'Treat "this return is too slow" as the warning sign it is; it is the sentence that precedes the loss.',
      'Expect a rollback after a jump, and plan for the level rather than the peak.',
      'Keep one field in focus per year and hold the others steady instead of running all of them.',
    ],
    habits: [
      { id: 'm_waitlist', because: 'A day\'s delay is the cheapest possible defence against "this return is too slow", which is the exact impulse the schemes are built to catch.' },
      { id: 'm_nodebt', because: 'The rollback after an income jump is described as predictable — borrowing against the peak is how a temporary drop becomes permanent.' },
      { id: 'm_owed', because: 'Her hardest claim is about money inside a family inverting the hierarchy; naming what is actually owed, in either direction, is where that gets handled rather than accumulated.' },
    ],
    quests: [
      { id: 'q_emergencyfund', because: 'A buffer is what makes the long-term strategy survivable — without it the first shock forces the sale the strategy depends on not making.' },
    ],
    vaultSource: 'Finance & money / Resource / Кладько — Правила диверсификации, психология финансовых пирамид и деньги как иерархия в семье',
  },

  {
    slug: 'notice-the-manipulation',
    attr: 'friends',
    title: 'A request that does not allow "no" is not a request',
    origin: 'Safin — psychologist, on manipulation, boundaries and communication',
    medium: 'podcast',
    minutes: 6,
    hook: 'Manipulation is in every conversation in some dose. The skill is not removing it — it is seeing it, including your own.',
    thesis:
      'Manipulation is conscious or unconscious pressure on another person\'s picture of the world that makes them more compliant, and it is present in some dose in all communication. The goal is not to eradicate it but to notice it — in other people\'s speech, and in your own. Most conflicts, at work and at home, are not about the thing being argued over: they are about goals that have drifted out of sync or a communicative function nobody named.',
    ideas: [
      {
        name: 'Double binds',
        body: 'A sentence with two layers: on the surface a compliment or a neutral remark, underneath a compulsion or a devaluation — "you\'re a clever person, you must understand" carrying "if you don\'t, be ashamed". Spotting them in others protects you; spotting them in yourself lowers your own toxicity.',
      },
      {
        name: 'The straw-man request',
        body: 'Asking while denying the other person permission to refuse is manipulation: it places them where "no" reads as betrayal. The healthy form makes refusal explicit — "can I ask you for X? If not, that\'s completely fine." Learning to ask this way is described as muscular rather than intellectual: it needs daily reps over weeks, not an insight.',
      },
      {
        name: 'Naming an emotion makes it manageable',
        body: 'Saying "this is awkward for me" out loud before a request already converts it from something passively suffered into something being handled. The supporting image: a painter cannot use a colour they have never seen — you cannot manage a state you have no name for.',
      },
      {
        name: 'The formula for a drifted agreement',
        body: '"As I understand it the situation is A, though we agreed B. I suggest we pause and discuss how you see it." It works because it states the fact without an accusation and explicitly invites a conversation rather than a confrontation.',
      },
      {
        name: 'The body governs the thought',
        body: 'When someone is chemically carried away by a strong emotion, verbal technique does not work — physiological regulation has to come first, and only then the conversation. A practical marker offered: the stronger the awkwardness about refusing, the more reliably it signals that refusal is the right answer.',
      },
      {
        name: '"I am good enough" as the starting position',
        body: 'Working on yourself does not require first agreeing that you are insufficient. Holding that you and others are fundamentally fine does not remove the need to grow — it removes self-flagellation as the fuel for it. If an idea is still beyond you, that is about readiness, not worth.',
      },
    ],
    notes: [
      'A register of unfinished business — conversations left hanging, things unresolved — is offered as a concrete exercise rather than a metaphor.',
      'Separating the roles someone occupies (friend, creditor, business partner) is treated as a prerequisite for talking clearly with them, since an unnamed role mix is where most of the confusion lives.',
      'This is a practising psychologist working from an Ericksonian and transactional-analysis lineage rather than academic psychology, and he presents the material explicitly as a set of viewpoints rather than an axiom. Some terminology is standard systemic family therapy rather than original to him, though not cited as such.',
    ],
    practices: [
      'Phrase requests so that "no" is explicitly available, and mean it.',
      'Say the awkward thing out loud before the request rather than working around it.',
      'When reality has drifted from an agreement, name the gap and invite discussion instead of accusing.',
      'Regulate the body first when emotion is high — the words do not work until it is down.',
      'Watch your own sentences for the two-layer version, not only other people\'s.',
    ],
    habits: [
      { id: 'f_nogossip', because: 'Talking about someone absent is where the second layer lives unchecked — the same double bind you would notice instantly if it were aimed at you.' },
      { id: 'f_thanks', because: 'Naming something specific is the plain-speech counterpart to the two-layer sentence: nothing underneath it, nothing to decode.' },
      { id: 'm_owed', because: 'Money between friends is the most common drifted agreement there is, and the formula is built exactly for naming a gap without an accusation.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The desync formula only proves itself in the conversation you have been postponing — which is the one it was designed for.' },
      { id: 'q_debts', because: 'Separating a friend from a creditor requires knowing the actual numbers first; the roles cannot be untangled while the amount is vague.' },
    ],
    vaultSource: 'Social & friends / Resource / Сафин — Манипуляции, границы и коммуникация',
  },
  {
    slug: 'comparison-is-learned',
    attr: 'friends',
    title: 'Comparison is a learned habit, not a need',
    origin: 'Nasibyan — psychologist, on fear, comparison and boundaries',
    medium: 'podcast',
    minutes: 5,
    hook: 'Anxiety is fear projected onto a future that does not exist — which is why it never resolves on its own terms.',
    thesis:
      'Suffering comes less from not knowing than from holding a model of the world that hurts and refusing to revise it. Fear of change is, underneath, fear of death. Anxiety is fear projected onto a non-existent future and is therefore neurotic by construction. And comparing yourself with others is not an innate need but a cognitive process learned in childhood — which means it can be dismantled.',
    ideas: [
      {
        name: 'The question is not whether it is true',
        body: 'The useful question about a belief you are holding is not "is this true" but "does holding this make me happy — and if not, why am I holding on to it?" Suffering is framed as knowing wrongly rather than not knowing.',
      },
      {
        name: 'Square breathing, and nerves as a signal of significance',
        body: 'Four heartbeats in, four held, four out, four held. He reports his own pulse still hitting 130 before every talk after years of practice — the aim is not removing the fear but not being run by it. His stated view: if the anxiety before teaching disappeared, it would mean he had stopped finding it interesting.',
      },
      {
        name: '"Why" taken to its limit',
        body: 'Fear of having lived pointlessly comes from nobody ever helping you formulate your own why. The practice is to push any goal through repeated "why" until the real motive is exposed — not "to earn" but "to become a professional". Goals that extend beyond your own life make any current task automatically meaningful.',
      },
      {
        name: 'Irritation as a reflection',
        body: 'What reliably irritates you in another person is offered as diagnostic information about yourself — a cheap and uncomfortable instrument.',
      },
      {
        name: 'Criticism and hate are different inputs',
        body: 'Distinguishing the two is presented as a practical requirement for anyone doing anything public, along with the claim that an inability to tolerate criticism is itself a signal of stagnation.',
      },
    ],
    notes: [
      'Knowing a decision was better or worse is only available retrospectively — which is an argument for letting time run rather than trying to compute everything in advance.',
      'A value vacuum is described as what appears when an externally imposed meaning collapses: not freedom but a gap, filled with anxiety and consumption.',
      'This is a rapid-answer interview format, so the depth on any single point is limited. Several concepts are the speaker\'s own free interpretation of philosophical and religious systems rather than sourced positions, one cited statistic is used rhetorically rather than as fact, and his position on religion is a personal thesis rather than an empirical finding.',
    ],
    practices: [
      'Ask of a belief you are suffering under: what is it doing for me, and why am I keeping it?',
      'Use square breathing before anything that frightens you, with the aim of not being run by the fear rather than removing it.',
      'Push a goal through "why" until you reach a motive you actually recognise.',
      'Treat what irritates you in someone else as information about you.',
      'Separate criticism from hate before responding to either.',
    ],
    habits: [
      { id: 'b_nocompare', because: 'If comparison is learned rather than innate, then the feed that trains it daily is the first thing to remove — the habit is the dismantling.' },
      { id: 'f_nodoom', because: 'Anxiety here is fear aimed at a future that does not exist, and scrolling is the most reliable supplier of imagined futures to be afraid of.' },
      { id: 's_gratitude', because: 'Naming what actually happened is the direct counterweight to a mind working on a projected future instead of the day that occurred.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'Boundaries are a theme he keeps returning to, and the strength of your reluctance is described as the signal that the conversation is the necessary one.' },
    ],
    vaultSource: 'Social & friends / Resource / Насибян — Страх, сравнение и границы',
  },

  {
    slug: 'three-sources-of-fatigue',
    attr: 'health',
    title: 'Training is only one of three things tiring you out',
    origin: 'Mike Israetel — sport physiologist, on recovery and what does not aid it',
    medium: 'podcast',
    minutes: 7,
    hook: 'Most recovery is subtraction. Several of the most popular recovery tools do not repair anything.',
    thesis:
      'Fatigue comes from three independent sources — training, all non-training physical activity across the day, and psychological stress — and most people account only for the first, which is why they systematically misjudge how recovered they are. All three draw on the same finite capacity. The second reframe: recovery is mostly subtraction rather than addition, and several popular recovery tools do not accelerate tissue repair at all.',
    ideas: [
      {
        name: 'The three sources',
        body: 'Training is obvious. Everyday movement is not: conscientious people who walk constantly and cannot sit still quietly drain recovery capacity without ever connecting it to their training results, while naturally sedentary athletes recover easily almost by accident. The third — described as the biggest surprise of his own doctoral training — is psychological stress: chronic relationship conflict, work anxiety and rumination measurably degrade performance and body composition, roughly in proportion to severity.',
      },
      {
        name: 'The nervous system is the actual gate',
        body: 'Being physically still does not start recovery if the nervous system stays sympathetically dominant — lying on the sofa while scrolling and getting angry counts as rest on paper and not in the body. Recovery unlocks at parasympathetic dominance, which is why stress can silently block it while sleep hours, food and rest time all look correct.',
      },
      {
        name: 'Why stress wrecks sleep quality without shortening it',
        body: 'A stressed nervous system deliberately keeps sleep shallower as a vigilance adaptation — more micro-awakenings, lighter stages — so duration can be entirely normal while the restoration is not.',
      },
      {
        name: 'Acute versus cumulative fatigue, as debt',
        body: 'Acute fatigue clears in hours to days. Cumulative fatigue builds when training frequency outruns recovery, never fully clearing between sessions, and after several weeks of hard work reaches a point that has to be addressed deliberately. One easy day is a small payment against a balance that is still there and still dragging — which is the argument for a periodic planned deload rather than an improvised one.',
      },
      {
        name: 'Masking is not repairing',
        body: 'Cold plunges, extensive stretching, foam rolling and most supplements are presented as not accelerating tissue repair — they reduce the sensation of fatigue, or actively blunt the inflammatory process that performs the repair. Useful if you enjoy them; not a substitute for sleep, food and less load.',
      },
    ],
    notes: [
      'A default question for handling stress: what can I actually do about this? If there is an action, take it or schedule it and then disengage deliberately; if there is none, further rumination carries no additional signal.',
      'Judge recovery by trackable numbers — reps, loads, any measurable personal-best-adjacent metric — rather than by how you feel on the day.',
      'He holds a doctorate in sport physiology and coaches competitive athletes; the repair-versus-masking distinction reflects mainstream sport-science consensus rather than a fringe position. Specific numbers are stated confidently without in-episode citation, and the hard-work-culture commentary is labelled by him as personal philosophy rather than a finding.',
    ],
    practices: [
      'Count everyday movement and psychological stress as training load, because your body already does.',
      'Get the nervous system down before calling it rest — stillness with your jaw clenched is not recovery.',
      'Schedule a lighter week periodically instead of waiting until performance forces one.',
      'Use cold, stretching and rolling because you like them, not as a substitute for sleeping and eating.',
      'Ask what action is available; take it or drop it, rather than continuing to turn it over.',
    ],
    habits: [
      { id: 'h_lightsout', because: 'Sleep is the intervention the whole model rests on — and the one the other two fatigue sources quietly degrade the quality of.' },
      { id: 'f_nodoom', because: 'Scrolling and getting angry is the exact example given of rest that never reaches parasympathetic dominance, so it never becomes recovery.' },
      { id: 'b_noalarm', because: 'A regular unforced day is the smallest version of the deload — a scheduled payment against cumulative fatigue rather than an emergency one.' },
    ],
    quests: [
      { id: 'q_sleepreset', because: 'If stress keeps sleep shallow while its duration looks fine, then the fix is structural rather than a matter of going to bed earlier once.' },
      { id: 'q_energyaudit', because: 'The three sources compete for one budget, and there is no way to see that competition without actually logging where the week goes.' },
    ],
    vaultSource: 'Health & sport / Resource / Israetel — Recovery as Machine Maintenance, the Three Sources of Fatigue and Why Cold Plunges Don\'t Recover You',
  },
  {
    slug: 'plaques-and-risk-factors',
    attr: 'health',
    title: 'Atherosclerosis is a process, not an event',
    origin: 'Utin — cardiologist, on plaques, clots and misfiled anxiety',
    medium: 'podcast',
    minutes: 7,
    hook: 'The goal was never to remove the plaques. It is to stop them rupturing.',
    thesis:
      'Cardiovascular disease leads causes of death because infections were defeated and four risk factors were not: smoking, inactivity, obesity and untreated hypertension. Atherosclerosis is not a single event but a process running from birth — cholesterol deposits in the artery wall in everyone, and the only questions are how fast and whether a plaque ruptures. Treatment therefore aims not at removing plaques but at making them safe.',
    ideas: [
      {
        name: 'Good and bad cholesterol is about packaging',
        body: 'Cholesterol is not good or bad in itself — the distinction describes how it is packaged for transport. The loosely packed form oxidises easily, sticks to the artery wall and gets inside. Macrophages arrive, gorge, and die, forming a plaque: a fibrous cap over a liquid core of cholesterol and dead immune cells.',
      },
      {
        name: 'How a plaque becomes a clot',
        body: 'If the liquid core breaks through into the vessel lumen, blood clots on the plaque surface and blocks it — a heart attack if the vessel serves the heart, a stroke if it serves the brain. Which is why the therapeutic goal is described as stabilising the core rather than clearing the deposit.',
      },
      {
        name: 'Three different places clots form',
        body: 'In arteries, almost always on a ruptured plaque. In leg veins, via slowed flow, wall damage and changes in clotting — a detached clot travels to the lung, and the warning sign given is one leg suddenly thicker and redder than the other plus sudden breathlessness. In the left atrium during atrial fibrillation, from where a clot travels to the brain.',
      },
      {
        name: 'Thick blood is not the mechanism',
        body: 'Clot formation is a chemical process — platelet aggregation and fibrin polymerisation — not blood being too thick and sitting still. Blood-thinning drugs do not change the consistency of blood; they act on those chemical steps.',
      },
      {
        name: 'The plate, in practice',
        body: 'Half the plate vegetables and fruit across the colour range, a quarter whole grains, a quarter protein; olive oil rather than sunflower. Roughly one steak of red meat a week rather than daily; cold-water fish once or twice a week; a small daily portion of nuts, counted, because they are calorie-dense.',
      },
      {
        name: 'A diagnosis used as a wastebasket',
        body: 'His second theme is that a widely used functional diagnosis in the region operates as a bin for untreated anxiety and panic disorders, keeping people looking for a cardiac cause instead of being referred appropriately.',
      },
    ],
    notes: [
      'Salt intake in the region runs at roughly two to three times the WHO reference; the first step named is taking the salt cellar off the table. Pink and sea salt are described as marketing rather than a health difference.',
      'Distinguishing cardiac pain from anxiety or muscular spasm: cardiac pain relates to exertion and tends to press; spasm and anxiety tend to worsen on inhalation and lack the link to exertion.',
      'Dried fruit as a potassium source, collagen supplements and pink salt are named as myths without demonstrated effect.',
      'On alcohol he cites the position that there is no safe dose.',
      'Notably not a promotional source — he is openly sceptical of sponsored content and pseudo-diagnoses. The specific figures quoted are given without in-episode references; they align with widely cited cardiology literature but cannot be checked from the conversation itself, and he flags the evidence on harm-reduction alternatives to smoking as still developing.',
    ],
    practices: [
      'Take the salt off the table before changing anything else about the diet.',
      'Build the plate by proportion rather than by counting: half vegetables and fruit, a quarter whole grains, a quarter protein.',
      'Measure resting blood pressure properly once a year — sit still for several minutes first. It costs nothing.',
      'Get a full cholesterol panel once to learn your inherited baseline, independent of how you currently eat.',
      'Stop hunting for a cardiac explanation for symptoms that behave like anxiety, and get the anxiety treated as anxiety.',
    ],
    habits: [
      { id: 'h_nosmoke', because: 'It heads the list of the four unbeaten risk factors — and it is the only one on that list you can act on in a single decision.' },
      { id: 'h_realmeal', because: 'The plate is a proportion rather than a calculation, which makes it something a single honest meal a day can actually carry.' },
      { id: 'h_steps', because: 'Inactivity is named as a risk factor in its own right, sitting alongside smoking and untreated hypertension rather than below them.' },
    ],
    quests: [
      { id: 'q_healthcheck', because: 'A resting blood pressure reading and one full cholesterol panel are the two cheap numbers that turn a lifelong silent process into something visible.' },
      { id: 'q_energyaudit', because: 'Two of the four risk factors are lifestyle patterns rather than events, and patterns only become addressable once the week is actually written down.' },
    ],
    vaultSource: 'Health & sport / Resource / Утин — Атеросклероз, тромбы и ВСД',
  },

  {
    slug: 'critical-mass-of-a-habit',
    attr: 'development',
    title: 'Habits end by accumulation, not by breakage',
    origin: 'Alipov — neuroscientist, on how habits actually end',
    medium: 'podcast',
    minutes: 6,
    hook: 'People quit for years-long habits without rehab or a dramatic trigger. That is a mechanism, and it can be used deliberately.',
    thesis:
      'The popular model — a substance breaks the reward system, so a person cannot stop until an overdose or forced intervention — does not match how people actually quit smoking, games or scrolling. They do it themselves, without treatment. The alternative offered: every interaction leaves an emotional trace (guilt, disappointment, time lost); those traces accumulate slowly, like memory, until they cross a threshold and the person simply asks what they are getting from it.',
    ideas: [
      {
        name: 'Goal-trackers and sign-trackers',
        body: 'In a conditioning experiment, some animals wait at the food bowl (orienting on the biologically meaningful object) and others at the lamp that predicts it (orienting on the surrogate symbol). The sign-trackers are experimentally more prone to forming dependencies — a predisposition that appears innate rather than the result of meeting a bad stimulus.',
      },
      {
        name: 'Recall the actual ending, not the idealised one',
        body: 'His own technique, at the moment the hand reaches for the app: ask what exactly you are about to get, and deliberately recall not the imagined pleasure but the real emotions the last session ended in. Memory selectively preserves the good, so the negative has to be reconstructed on purpose rather than trusted to surface.',
      },
      {
        name: 'The bed rule',
        body: 'Remove every competing activity from the bed so no conditioned reflex forms between lying down and reaching for the phone. The bed is for sleep, and the association is built by what you repeatedly do there rather than by intention.',
      },
      {
        name: 'Timeboxing beats "less"',
        body: 'A hard window for the thing works where a general resolution to do less of it does not — the same mechanism as work expanding to fill the time available.',
      },
      {
        name: 'Manufactured competition as a motivation switch',
        body: 'When interest in the task itself is not enough, an artificial competitive frame is offered as a working substitute — not as a virtue, but as a lever that reliably moves people who are otherwise stuck.',
      },
      {
        name: 'Build the routine around your own confirmed limits',
        body: 'The explicit antidote to copying other people\'s extreme regimes: construct the schedule around limits you have actually verified in yourself rather than around someone else\'s published routine.',
      },
    ],
    notes: [
      'A technique credited to psychiatry for making a distant consequence usable: instead of listing abstract risks, walk the person concretely and emotionally through the future that inaction produces.',
      'The same neuroscientist appears elsewhere in a more structured format; this is a personal, confessional podcast, which yields more tested techniques and fewer direct references to studies.',
      'He marks the critical-mass model of addiction himself as an open question rather than a settled finding — worth carrying as a practitioner\'s working hypothesis, not established fact.',
    ],
    practices: [
      'At the moment of reaching, ask what you are actually about to get — and recall how the last one ended rather than how it started.',
      'Keep the bed for sleep alone, so the association never forms.',
      'Give the habit a hard window instead of resolving to do less of it.',
      'When interest fails, borrow a competitive frame rather than waiting for motivation.',
      'Build your schedule from limits you have confirmed on yourself, not from someone else\'s routine.',
    ],
    habits: [
      { id: 'h_lightsout', because: 'The bed rule in its enforceable form: the association is built by what you repeatedly do there, so the fix is a boundary rather than a resolution.' },
      { id: 'f_nodoom', because: 'A hard window beats "less" — and this is the version of the window that protects the part of the day the habit is most likely to swallow.' },
      { id: 'd_nopassive', because: 'Every session adds to the pile of traces; making something first is what stops the pile being the only thing accumulating.' },
    ],
    quests: [
      { id: 'q_habitsystem', because: 'Timeboxing and the bed rule are structural changes, and structure does not survive being reinvented each evening.' },
      { id: 'q_declutter', because: 'The bed rule is really about the room: the competing activities have to physically leave, not merely be resisted.' },
    ],
    vaultSource: 'Personal growth / Resource / Алипов — Критическая масса привычки, конкуренция как топливо и правило кровати',
  },
  {
    slug: 'mindlessness-and-novelty',
    attr: 'development',
    title: 'Mindfulness is noticing novelty, not sitting still',
    origin: 'Ellen Langer — psychologist, on mindlessness and the mind-body unit',
    medium: 'podcast',
    minutes: 6,
    hook: 'Most rules you live by were set by someone, once. The question nobody asks is who.',
    thesis:
      'Mind and body are treated as one system rather than two connected objects — the dualism is called a mistaken habit of thought rather than a fact. Mindfulness here is not meditation but a way of being: continually noticing novelty and acknowledging that the situation is uncertain, as against mindlessness, which is acting mechanically on rules absorbed in childhood without noticing you are doing it.',
    ideas: [
      {
        name: 'Mindlessness is unexamined rules, not low intelligence',
        body: 'It is defined as accepting rules absorbed early — someone said it once and it became absolute — without ever asking who decided. Even basic "facts" turn out to be statistical probabilities rather than laws, which a single contrary observation is enough to expose.',
      },
      {
        name: 'Placebo and nocebo as direct evidence',
        body: 'Placebo is described as the most effective medicine precisely because it shows that belief produces a physical effect with no substance involved. In the cited hotel-housekeeper study, one group was told their work already constituted exercise and the other was not; both worked identically and ate the same, and only the informed group showed measurable changes.',
      },
      {
        name: 'Perceived time changes physiology',
        body: 'Two results are cited: wound healing tracked perceived rather than real elapsed time in front of deliberately altered clocks, and blood sugar in people with type 2 diabetes followed the perceived rather than actual time passed during a task with a falsified clock.',
      },
      {
        name: 'Expecting failure produces it',
        body: 'On a standard eye chart the letters shrink downward, building an expectation that you are about to stop seeing. With the chart reversed, people read letters they had not managed on the standard version — the expectation, not the eyesight, had been setting the limit.',
      },
      {
        name: 'Tragedy or inconvenience',
        body: 'Offered as the first question to ask under stress, before any attempt to solve the problem — a reproducible action rather than an instruction to feel differently.',
      },
    ],
    notes: [
      'The novelty practice is concrete: notice two or three new details in a familiar setting, or in a person you know well, daily. The same claim applies to travel — looking for novelty at home works as well as going somewhere new.',
      'On a hard decision: rather than spending the time hunting for the right option, choose and then invest the energy in making the choice work.',
      'Fifty years of her own research at Harvard, and most claims point at specific studies from her lab — but methodology, sample sizes and replication are not given in an interview format.',
      'She explicitly marks the boundary of her own data: her claim that stress outweighs genetics, diet and treatment is flagged by her as personal conviction she has not run the study for. That distinction is worth preserving rather than flattening.',
    ],
    practices: [
      'Notice two or three genuinely new things about something familiar, every day.',
      'Ask "is this a tragedy or an inconvenience?" before trying to solve the stressful thing.',
      'When a rule is running you, ask who decided it and whether it was ever true.',
      'Make the decision, then spend the energy on making it work rather than on verifying it was optimal.',
    ],
    habits: [
      { id: 'b_new', because: 'Noticing novelty is the whole definition being used here — and the reliable way to guarantee some is to put something unfamiliar in the day.' },
      { id: 's_gratitude', because: 'Naming what actually happened forces attention onto the specifics of the day, which is the opposite of running it on absorbed rules.' },
      { id: 'b_morningjoy', because: 'A small deliberate pleasure is a daily instance of attending to the present rather than executing the morning mechanically.' },
    ],
    quests: [
      { id: 'q_tryfive', because: 'The novelty practice scaled up from noticing to doing — and her own claim is that unfamiliarity at home counts as much as unfamiliarity abroad.' },
      { id: 'q_wheel', because: 'Scoring your own life is the structured version of asking which of your rules you have never actually examined.' },
    ],
    vaultSource: 'Personal growth / Resource / Langer — Осознанность, единство разума и тела и сила неопределённости',
  },

  {
    slug: 'yes-comma-but',
    attr: 'brightness',
    title: 'Yes, comma, but',
    origin: 'Diarmaid MacCulloch — historian, on honesty, bias and sense of place',
    medium: 'podcast',
    minutes: 6,
    hook: 'A person taken over by lies is no longer sane — and the same is true of a society.',
    thesis:
      'The ethical claim: technical disciplines can get you to the moon without making you a sane person, and that job falls to history alongside philosophy and literature. A society that sanitises its own record to fit a comfortable narrative is not merely dishonest but losing its grip — and the working method that defends against it is a structural refusal to resolve tension too early.',
    ideas: [
      {
        name: 'Be sceptical, then be sympathetic',
        body: 'The core instruction: read any source with scepticism first, since everyone has an agenda and you can only gradually tell which — but pair it with genuine interest in the person as a human being. Scepticism without sympathy produces cynicism; sympathy without scepticism produces credulity.',
      },
      {
        name: 'Yes, comma, but',
        body: 'Acknowledge the conventional version honestly — yes, I see that — then add the complicating truth: but I also see this. It prevents idolising the past as a standard the present is unfairly judged against, and his claim is that the result is more satisfying precisely because it is truer, even though it pleases less immediately than the simplified version.',
      },
      {
        name: 'Read the clichés before you try to correct them',
        body: 'He deliberately read the great earlier syntheses before going to primary sources — not to adopt their conclusions but to know what the standing clichés are, so he would recognise them rather than unconsciously reinvent them later.',
      },
      {
        name: 'Two thirds of the day, deliberately',
        body: 'Fixed hours, nothing before mid-morning, nothing past early evening, no evening work at all, a substantial midday break and an unembarrassed nap. The rule credited to his supervisor: divide the day in thirds and work only two. Not working the third is what removes the guilt of should-be-working and makes the other two productive.',
      },
      {
        name: 'Declare your standpoint',
        body: 'He opens his own books by stating who he is and where he stands, so readers can weigh passages knowing it. No historian is neutral, and pretending otherwise deprives the reader of data they need — self-disclosure is treated as respect, not weakness.',
      },
      {
        name: 'Sense of place changes the account, not the decoration',
        body: 'Filming inside a cathedral whose ground plan is calm and symmetrical on paper, he found the lived interior claustrophobic and vertiginous, and rewrote his script on the spot — the revision survived into the book. Enormous amounts can be researched without travel, but the felt experience of a specific space genuinely cannot.',
      },
    ],
    notes: [
      'On the boundary between history and fiction: a novelist may write "and" where a historian must write "may have" — filling the gap outright rather than flagging the uncertainty.',
      'His sharp division between the humanities and the sciences on who makes a person sane is a stated personal conviction rather than a neutral description, and a scientist would likely contest it.',
      'A senior credentialed historian speaking from decades of practice — strong on method and craft; the collaboration account is a first-person recollection used as illustration rather than a general claim.',
    ],
    practices: [
      'State the conventional version honestly before complicating it — do not lead with the contrarian take alone.',
      'Say where you stand, up front, so people can weigh what follows.',
      'Learn the existing consensus before forming an objection to it, or risk reinventing one already answered.',
      'Work two thirds of the day and genuinely stop for the third.',
      'Go and stand in the place when the felt experience of it might change what you would say.',
    ],
    habits: [
      { id: 'c_shutdown', because: 'The two-thirds rule only works if the third is really off — an unenforced stop is what turns it back into guilt about not working.' },
      { id: 'd_read', because: 'Knowing the standing clichés before objecting to them is a reading habit before it is a research method.' },
      { id: 'd_notes', because: 'Yes-but is a structure you have to be able to state, and putting a source in your own words is where you find out whether you can.' },
    ],
    quests: [
      { id: 'q_makeweekly', because: 'Declaring a standpoint and holding a tension are decisions that only get made in a finished piece, not in notes.' },
      { id: 'q_tryfive', because: 'Sense of place is his one claim that cannot be met by research — some things require going and standing there.' },
    ],
    vaultSource: 'Memories & Fun / Resource / MacCulloch — The Historian as Guardian of Sanity, Sense of Place and the \'Yes, But\' Motto',
  },
  {
    slug: 'morphology-of-the-tale',
    attr: 'brightness',
    title: 'Thirty-one functions, seven characters, one order',
    origin: 'Eidelman — on Propp\'s morphology, myth and the coded initiation',
    medium: 'lecture',
    minutes: 6,
    hook: 'Behind apparently endless variety sits a fixed order — and it is a rite, not a literary device.',
    thesis:
      'The wonder tale is not a children\'s genre by origin but a weakened myth: the same archaic structure moved from the scale of the whole world down to one family and one hero. Propp showed that behind seemingly endless variety sits a rigid structure — thirty-one functions in fixed order and only seven character types — and that the structure encodes a rite of initiation rather than a storytelling technique.',
    ideas: [
      {
        name: 'Myth and tale, distinguished',
        body: 'Myth is sacred, concerns the whole community, explains the origin of the world and is bound to ritual. The tale is less sacred and eventually not sacred at all, individual, focused on one family and one hero. The formulation quoted: a tale is a weakened myth — not worse, but different in scale and function.',
      },
      {
        name: 'The trickster as a desacralised culture hero',
        body: 'The culture hero of myth is a divine figure performing a feat for all humanity. The trickster of the tale — the hare, the raven, the fool — is the same structural type stripped of sanctity: small, sly, local. A visible illustration of myth contracting into tale.',
      },
      {
        name: 'Functions hold their order',
        body: 'Working by hand through thousands of recorded tales in the 1920s, Propp found the plot decomposes into thirty-one functions — struggle, abduction, difficult tasks — in an order that never changes. Functions may be absent, but they never swap places.',
      },
      {
        name: 'Seven roles, freely cast',
        body: 'Hero, villain, false hero, donor, helper, dispatcher and princess-as-reward. One character can hold several roles at once — a stepmother may be both villain and dispatcher — and one functional type can appear as wildly different figures, so that a witch and a talking apple tree are both donors.',
      },
      {
        name: 'The forest is the world of the dead',
        body: 'The wood the hero enters is not scenery but the realm of ancestors. Behaving correctly with the beings met there, eating the food of the other world, passing the tests and returning with a reward and a mark are the elements of an initiation rite preserved inside the plot.',
      },
      {
        name: 'Structure over props',
        body: 'Both of Propp\'s own definitions deliberately avoid mentioning magical objects: the flying carpet is not what makes a wonder tale. The structure matters and the equipment does not.',
      },
    ],
    notes: [
      'Each era rewrites folklore to fit its own anxieties and tastes rather than neutrally recording it — which makes a translation a mirror of its translator\'s period as much as of the original.',
      'A folklorist\'s comparison of the distribution of one motif against archaeological migration routes suggests extreme antiquity for some plots — the lecturer explicitly marks this as needing confirmation rather than settled.',
      'The lecturer is a history populariser rather than a folklorist, but leans consistently on named, established specialists, and flags the uncertain claims as uncertain — an unusually clean piece of popular scholarship.',
    ],
    practices: [
      'Look for the function a character is performing rather than the costume they are wearing.',
      'When a story is not working, check whether a required function is missing rather than adding more invention.',
      'Read the structure of old material before borrowing its surface.',
      'Treat a translation as a document of its own era, and know whose optics you are reading through.',
    ],
    habits: [
      { id: 'd_read', because: 'The argument is that the structure is only visible across many tales — which is a reading volume problem before it is an analytical one.' },
      { id: 'd_notes', because: 'Functions are noticed by writing them down: the fixed order only appears once you have restated several plots in the same terms.' },
      { id: 's_makecreate', because: 'A structure this explicit is meant to be used — and it only becomes yours when something gets built on it.' },
    ],
    quests: [
      { id: 'q_learnfaith', because: 'This is a canonical, still-cited body of work rather than a summary to skim — the sort of thing the quest means by studying one thing properly.' },
      { id: 'q_makeweekly', because: 'The morphology is a tool for making, and the fastest test of whether you have understood it is finishing something built with it.' },
    ],
    vaultSource: 'Memories & Fun / Resource / Эйдельман — Сказка, миф и морфология Проппа',
  },

  {
    slug: 'means-not-end',
    attr: 'spirituality',
    title: 'A good life, not a rich one — and poverty is not a virtue',
    origin: 'Ustaz lecture on wealth, provision and intention',
    medium: 'lecture',
    minutes: 7,
    hook: 'Wanting more is not the problem. Confusing the means with the goal is.',
    thesis:
      'Success in the Qur\'anic vocabulary is a good life rather than a rich one — and the recurring frame is that work, money, family and property are means, never the goal. Confusing the two is named as the root of most of the difficulty people have with earning. But the corollary cuts the other way too: poverty is not treated as a virtue, and wanting out of it is legitimate.',
    ideas: [
      {
        name: 'A good life, not a wealthy one',
        body: 'The textual observation offered: the promise made is of a good, pleasant life rather than a rich or provided-for one. The word chosen for the successful person in the hadith cited is the one meaning sufficiency — contentment with what there is — rather than the word for abundance.',
      },
      {
        name: 'Poverty is not praiseworthy',
        body: 'An explicit rebuttal of a view common among some practising people: the Prophet is described as asking for protection from poverty specifically, in the daily morning and evening remembrances. Poverty is inevitable in any society but not spiritually commendable, and wanting to escape it is legitimate.',
      },
      {
        name: 'Wealthy companions as precedent',
        body: 'Answering the charge that an ambitious believer is chasing the world: several of the ten companions promised paradise were very wealthy, and one financed the equipping of an entire army alone. The stated conclusion is that the problem is never the wealth but the ordering — someone who earns a great deal while not knowing the basics of their religion has misordered priorities, not too much money.',
      },
      {
        name: 'Means versus goal',
        body: 'The formula repeated throughout: work, money, family and property are the instrument, and the goal is God\'s pleasure. Everything else must serve that rather than compete with it. This is offered as the single diagnostic to run on your own ambitions.',
      },
      {
        name: 'Provision is set; forbidden means change the risk, not the sum',
        body: 'The theological position given: the total provision is already determined, so pursuing it through forbidden means does not increase the amount — it increases the exposure. Interest is described as erasing blessing even where the number on the statement has grown.',
      },
      {
        name: 'Tie the camel, then trust',
        body: 'The sequence is explicit and in that order: take preparation to its maximum, and only then stop being anxious about the outcome. Trust is not offered as a substitute for the preparation.',
      },
    ],
    notes: [
      'Sharia is contrasted with utopian ideology: it does not promise universal equality but states plainly that poverty, illness and crime persist in any society, and supplies conduct for the poor, for the rich, and for living alongside both.',
      'Against the argument "I earn a lot in order to lift the community": if the real intention is vanity dressed as service, the framing does not repair it.',
      'Maintaining kinship ties is the one action named as linked to both increased provision and long life.',
      'Direction of comparison as a quick diagnostic: downward in material things, upward in spiritual ones — against envy in one direction and stagnation in the other.',
      'A practising teacher answering mostly through direct citation with explicit references, relying on widely transmitted material rather than marginal positions. Some historical and economic details come without academic sourcing and are best read as transmitted tradition rather than documented history.',
    ],
    practices: [
      'Run the means-versus-goal check regularly: has the current target quietly become the point rather than the instrument?',
      'Prepare to the maximum, then deliberately stop carrying the outcome.',
      'Change your physical state — posture, ablution, prayer, a pause — before any decision being made on emotion.',
      'Keep kinship ties actively, not as sentiment but as a named priority.',
      'Compare downward in material matters and upward in spiritual ones.',
    ],
    habits: [
      { id: 'f_remember', because: 'Maintaining kinship ties is the single action the source names as tied to both provision and long life — and it is made of small specific attention, not sentiment.' },
      { id: 'm_charity', because: 'Giving is the cleanest daily proof that the money is being held as a means rather than as the goal.' },
      { id: 's_gratitude', because: 'Sufficiency rather than abundance is the stated definition of success, and gratitude is how sufficiency gets noticed at all.' },
    ],
    quests: [
      { id: 'q_learnfaith', because: 'The misordering the source warns about is precisely earning a great deal while never studying the basics — this is the corrective it prescribes.' },
      { id: 'q_debts', because: 'Interest is described as erasing blessing even when the figure grows, which makes the real exposure something you have to actually look at.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Богатство, искушения, кредиты — успех как хорошая жизнь, ризк как предопределённый и харам как источник риска',
  },
  {
    slug: 'the-prayer-of-yunus',
    attr: 'spirituality',
    title: 'When every cause fails at once',
    origin: 'Lecture on the prayer of Yunus and the habit of self-justification',
    medium: 'lecture',
    minutes: 6,
    hook: 'Explaining yourself is not a small flaw of character. The source calls it worship of the self.',
    thesis:
      'The prayer of Yunus is read as the model of any trial: swallowed by a fish, in a storm, at night — three created things threatening at once, with every ordinary cause simultaneously stripped of any power to help. What remains is the One who governs the causes themselves. The general law drawn from it: a trial is not primarily there to be solved through causes but to make their powerlessness undeniable.',
    ideas: [
      {
        name: 'The Causer of causes',
        body: 'Causes are described as having no influence of their own — they are entirely subject to what governs them. The distinction drawn is between knowing this as a general formula, which almost every believer does, and holding it with enough certainty that it changes the reaction to a specific difficulty.',
      },
      {
        name: 'Two paths through a trial',
        body: 'Either fixate on the causes — fearing them, hoping in them, waiting for mercy from them — which is described as only increasing the pressure; or move attention immediately from the causes to the relationship with the Creator, ask why this is happening, find the fault, and repent. The second is presented as changing the situation rather than only the reaction to it.',
      },
      {
        name: 'Self-justification as worship of the self',
        body: 'The sharpest claim in the source. The verse cited is "do not justify yourselves", with attention drawn to a grammatical lengthening in the original conveying intensity — that our justifications are many. The self by nature loves only itself and refuses to concede its faults, spending even the capacities given for worship on serving itself.',
      },
      {
        name: 'Knowing and being convinced are different states',
        body: 'The practical version of the whole lecture: the question is not whether you can state the belief, but whether it changes what you actually do the next time something goes wrong.',
      },
      {
        name: 'The world as a place of service',
        body: 'Framed as somewhere one is present for work and service rather than for enjoyment — a formulation the source arrives at from a second, independent direction rather than by repeating an earlier argument.',
      },
    ],
    notes: [
      'The concrete exercise offered: catch the moment you explain your action instead of simply admitting it — regardless of how convincing the explanation happens to be.',
      'This is a preacher transmitting a recognised theological tradition, with personal interpretation and anecdote in the interludes. Hadith are conveyed by meaning without chains examined.',
      'The lecture also uses a deliberately jarring rhetorical contrast that the source itself qualifies immediately afterwards; it is a homiletic device rather than a doctrinal position, and is left out here because it does not survive separation from its delivery.',
    ],
    practices: [
      'Notice when you are explaining rather than admitting, and stop at the admission.',
      'In a difficulty, move attention off the causes early rather than after they have been exhausted.',
      'Ask whether your conviction changes what you do next, or only what you can say.',
      'Take the trial as a question about the relationship rather than only as a problem to be routed around.',
    ],
    habits: [
      { id: 'd_review', because: 'Catching self-justification requires looking back over the week, since in the moment the explanation is always the most convincing thing available.' },
      { id: 's_dhikr', because: 'The turn described is from the causes to their Author — and five quiet minutes before the day is where that turn is practised while nothing is on fire.' },
      { id: 's_forgive', because: 'Letting a thing go without first constructing a case for yourself is the same muscle the self-justification test is trying to build.' },
    ],
    quests: [
      { id: 'q_anchor', because: 'The difference between knowing and being convinced is closed by daily practice, not by agreeing with the argument once.' },
      { id: 'q_learnfaith', because: 'The source\'s own distinction — a formula everyone can state versus a conviction that changes behaviour — is an argument for studying rather than collecting.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Из мрака к свету — Молитва Юнуса, нафс как идол через самооправдание и мир как служение',
  },

  {
    slug: 'beliefs-under-habits',
    attr: 'career',
    title: 'Willpower is short-term. The belief underneath is not.',
    origin: 'Seisembayev — entrepreneur, on beliefs, mission and real wealth',
    medium: 'podcast',
    minutes: 6,
    hook: 'Change a habit without changing the belief it grew from and you are fighting your own picture of the world.',
    thesis:
      'Habits are roughly ninety per cent of the autopilot a life runs on, and attacking them directly with will is close to useless because they sit at the end of a chain: belief forms a picture of the world, which produces values, then principles, then rules, then skill, then character. The lever is at the root. Willpower is a short-term instrument, useful for crossing a gap, not for holding a position.',
    ideas: [
      {
        name: 'The chain, in order',
        body: 'A belief forms on contact with reality — the kettle was hot, so it must not be touched. On that belief a picture of the world is built, and it is inside that representation, rather than in reality, that a person spends most of their life. Values sit on the picture, principles generalise the values, rules apply them to specific situations, and habit and character are what is left downstream.',
      },
      {
        name: 'Identity is memory, and autopilot is not remembered',
        body: 'What is lived on autopilot is not stored, and therefore, functionally, was not lived. That gives the ninety-per-cent figure its bite: it is not only about efficiency but about how much of a life is actually retained.',
      },
      {
        name: 'Where money shame comes from',
        body: 'On the figures cited, a majority of people first encounter money through petty theft — small change taken from a parent — forming an early association between money and guilt, which is offered as an explanation for why money later "does not stay in the hands".',
      },
      {
        name: 'The belief inherited from a father',
        body: 'A child watching an exhausted parent earn through hard physical work forms the belief that money equals brutal labour — and as an adult unconsciously rejects every easier route as a scam. Those who earn hard and see others earn easily must explain it as fraud, a good marriage, or a secret, but never as something they could also do, because that would require giving up a self-protective identity.',
      },
      {
        name: 'Mission by organic growth, not analysis',
        body: 'The recommendation is to let a hobby grow until it demonstrates its own commercial viability rather than forcing monetisation early — and to find the mission by progressive narrowing, striking out categories you are certain you do not want, rather than trying to state it correctly in one attempt.',
      },
      {
        name: 'Real wealth is opportunities minus obligations',
        body: 'The closing formula: wealth is the gap between what you can do and what you owe, rather than a quantity of money. On that definition an income rise that arrives with matching obligations is not an increase.',
      },
    ],
    notes: [
      'On acting under pressure: emotions are described as a signalling function aimed at other people, and therefore useless when nobody is there — the account given is of ignoring them entirely while executing a sequence where each action gets exactly one attempt.',
      'A personal interview rather than an academic source, from a speaker with a pattern of confidently delivered personal theory, including theological claims that cannot be checked empirically.',
      'The statistic about childhood money and theft is given without a source — plausible, unverified, and better carried as an illustration than as a number.',
    ],
    practices: [
      'Before forcing a habit, ask which belief is producing the resistance — then argue with that instead.',
      'Let a side project grow on its own until it proves it can pay, rather than monetising it early.',
      'Find the direction by elimination: cross out what you are sure you do not want, repeatedly.',
      'Measure a gain as opportunities minus obligations, not as income.',
    ],
    habits: [
      { id: 'd_review', because: 'The chain is only visible looking backwards — a belief shows itself in the pattern of a week, never in the moment it is operating.' },
      { id: 's_makecreate', because: 'The mission is supposed to emerge from something grown rather than analysed, and growth needs regular hours before it needs a plan.' },
      { id: 'c_onelesson', because: 'What is run on autopilot is not remembered; writing down the one thing that worked is how a day stops being lost to the ninety per cent.' },
    ],
    quests: [
      { id: 'q_skill', because: 'Progressive narrowing only converges if each round is tested against something real rather than imagined.' },
      { id: 'q_portfolio', because: 'A hobby proves its own commercial case by being found — which requires it to exist somewhere other than your own machine.' },
    ],
    vaultSource: 'Business & career / Resource / Сейсембаев — Убеждения как источник привычек, поиск миссии через хобби и формула истинного богатства',
  },
  {
    slug: 'the-idea-is-a-multiplier',
    attr: 'career',
    title: 'The idea is a multiplier, not the source',
    origin: 'Tokovinin — entrepreneur, on management as a craft and choosing a niche',
    medium: 'podcast',
    minutes: 6,
    hook: 'Managing people is described as the highest-paid skill on earth — and as something nobody can teach you, only let you learn.',
    thesis:
      'The traits that make a good entrepreneur — protest, self-direction, vanity, ambition, nerve — are described as the same traits that can put someone under a bridge, and what separates the outcomes is circumstance, environment and chance rather than character. Against that, the practical claim: the idea is a multiplier rather than the source, which makes selling and managing the things worth building because they work with any idea.',
    ideas: [
      {
        name: 'Rebellion as fuel rather than defect',
        body: 'The account given is of deliberately becoming the worst student in the school to differentiate from a high-achieving older sibling — and of the same qualities later becoming the engine. The explicit caution attached is not to underestimate chance, probability and environment in deciding which way those qualities resolve.',
      },
      {
        name: 'Marks may measure compliance rather than ability',
        body: 'Offered as a hypothesis with the survivorship bias openly acknowledged: school grades often mark willingness to comply rather than knowledge. But compliance is not written off — the same passage states you will not reach great heights without being able to listen and to serve.',
      },
      {
        name: 'The marshmallow test, reread',
        body: 'A counterintuitive reframe: both the diligent and the indifferent child can wait for a future reward. The difference is not willpower but whose approval is at stake — a teacher and parents in one case, peers in the other.',
      },
      {
        name: 'Management is a craft, learned by being allowed to ruin things',
        body: 'It is called the highest-paid skill on earth and one nobody teaches, because it is a craft rather than a body of knowledge. The only route described is someone experienced choosing to invest in you specifically and patiently permitting the bad hires, the bad firings and the badly set tasks until the hand is trained.',
      },
      {
        name: 'Entrepreneur and manager are two different people',
        body: 'The entrepreneurial role is creative — conceive the product, read the market. Management is a separate skill of persistence and system. The pairing is presented as a tandem rather than a progression.',
      },
      {
        name: 'Timing a niche by consumption, not by enthusiasm',
        body: 'Two heuristics: a topic having gone stale among the earliest enthusiasts is a timing signal, and before betting on a trend, check whether the pattern of consumption has actually changed — look for new consumers without the old habit rather than trying to re-educate the existing ones.',
      },
    ],
    notes: [
      'A capital formula is offered as the filter for choosing a direction: money, people and knowledge together — rather than picking whichever idea is most attractive in the abstract.',
      'Because the idea is a multiplier rather than the source, the antidote to paralysis while hunting for the perfect idea is to build sales and management, which pay off under any idea.',
      'A practising entrepreneur speaking in the first person about specific decisions, sums and failures, with open self-irony — he calls several of his own decisions disgraceful failures and admits a nine-year unsuccessful push abroad. Company figures are deliberately vague, which he says outright.',
    ],
    practices: [
      'Choose a direction by money, people and knowledge rather than by the appeal of the idea.',
      'Stop hunting for the idea and build the two skills that work regardless of which one you land on.',
      'Before betting on a trend, look for consumers with no prior habit rather than trying to convert the existing ones.',
      'Seek out someone willing to let you make management mistakes on purpose — that permission is the training.',
    ],
    habits: [
      { id: 'd_build', because: 'A craft is learned by producing bad work under supervision — which requires actually building with the thing rather than reading about it.' },
      { id: 'c_onelesson', because: 'If management is trained by ruining things, then the training only compounds when what went wrong gets written down while it is still fresh.' },
      { id: 'd_askquestion', because: 'Both niche heuristics are questions asked of other people — whether the consumption pattern moved, and who is buying without the old habit.' },
    ],
    quests: [
      { id: 'q_skill', because: 'Selling and managing are named as the skills that pay off under any idea, which makes them the concrete thing to take on while the idea is still unsettled.' },
      { id: 'q_promise', because: 'Nerve is treated as the fuel, and a commitment made publicly is the cheapest way to find out whether you have any.' },
    ],
    vaultSource: 'Business & career / Resource / Токовинин — Бунтарство как топливо, ремесло менеджмента и выбор ниши как выбор судьбы',
  },

  {
    slug: 'the-bottom-is-still-your-life',
    attr: 'friends',
    title: 'Is this thought coming from the healthy part or the other one?',
    origin: 'Zhukova — gestalt therapist, on hitting bottom and climbing out',
    medium: 'podcast',
    minutes: 6,
    hook: 'The dangerous stage is not the fall. It is when the damage you are doing yourself exceeds the damage of the situation.',
    thesis:
      'Two moments decide a slide. The first is ignoring the signal — sensing that a situation or a person should no longer be trusted, and writing the unease off as tiredness or shame. The second, more dangerous, is active self-drowning: knowing things are bad and choosing destructive ways to cope, rationalised as "it is already bad, it cannot get worse". The clear marker of the second stage is that the harm from your own behaviour has overtaken the harm from the original situation.',
    ideas: [
      {
        name: 'A crisis is a segment, not a cancellation',
        body: 'The reframe the whole conversation rests on: time at the bottom does not stop being your life — it is a specific, often hard stretch of it. The technique offered is drawing a timeline from nought to a hundred and marking the peaks and troughs, so the present crisis appears as one segment of a line rather than as the whole line.',
      },
      {
        name: 'Healthy part or dependent part',
        body: 'The daily test: before a small decision in a hard period, ask which part of you the thought is coming from. It is fast, requires no insight, and is meant to be used on ordinary choices rather than saved for large ones.',
      },
      {
        name: 'Three silver bullets',
        body: 'Formulate three minimal actions that are genuinely doable today, in the direction of the basic goals — instead of waiting for strength or motivation to arrive. The size is the point: they have to survive a day with nothing in the tank.',
      },
      {
        name: 'Defences amplify exactly when they help least',
        body: 'In an acute crisis psychological defences intensify: a person may swing into harsh self-flagellation, or land in an environment that answers real distress with "just pull yourself together" — which reliably worsens it.',
      },
      {
        name: 'Devaluing the past is a symptom, not an assessment',
        body: 'The pattern where someone in crisis declares everything they previously did worthless is treated as a regressive intensification of a general tendency to devalue — information about the state, not about the record.',
      },
      {
        name: 'Compare with yourself in crisis, not yourself at your peak',
        body: 'Offered as the specific defence against self-criticism during a depleted period: the comparison class has to match the conditions, or the verdict is guaranteed in advance.',
      },
    ],
    notes: [
      'Why saying "I am not okay" out loud is hard: patterns absorbed early — boys do not cry, a man should be resilient — collide with the public image someone has built.',
      'A useful check on delay: if you are waiting until you have more reach or more resources, ask what specifically will be different at the larger number. It separates genuine unreadiness from self-deception.',
      'A practising gestalt therapist specialising in dependency, who explicitly separates clinical experience from her own history. The format is a live interview with a rapid-fire segment, so some advice is personal opinion rather than protocol — and one clinical claim about which couples therapy performs best is worth checking separately rather than taking from a conversation.',
    ],
    practices: [
      'Ask which part of you a thought is coming from, before acting on it.',
      'Name three minimal actions that are actually possible today, and do those instead of waiting to feel able.',
      'Draw the timeline and mark where this stretch sits on it.',
      'Compare yourself to yourself in the same conditions, not to your best year.',
      'Say it out loud to one person, rather than waiting until it can be said well.',
    ],
    habits: [
      { id: 'f_reachout', because: 'Isolation is what lets the second stage run unobserved — and the source is explicit that the hard part is saying it out loud at all.' },
      { id: 's_gratitude', because: 'Devaluing everything already done is named as a symptom; writing down what went right is the cheapest daily correction to it.' },
      { id: 'b_morningjoy', because: 'The three-bullet principle applied to the day itself: something small and genuinely possible, rather than waiting for the tank to refill.' },
    ],
    quests: [
      { id: 'q_reconnect', because: 'The environment decides whether distress is met with help or with "pull yourself together" — which makes who you are actually in contact with a practical variable.' },
      { id: 'q_hardconversation', because: 'Asking for help is described as the hardest sentence to say, and this is the quest that turns it into a specific conversation with a specific person.' },
    ],
    vaultSource: 'Social & friends / Resource / Жукова — Дно как часть жизни, здоровая vs зависимая часть психики и три серебряные пули',
  },
  {
    slug: 'fixing-the-car-instead-of-driving',
    attr: 'friends',
    title: 'Repairing the car instead of taking the trip',
    origin: 'Zhuravlyov — psychiatrist, on neurotic relationships and the image in your head',
    medium: 'podcast',
    minutes: 6,
    hook: 'The diagnostic is not how much conflict there is. It is whether the resources go into living or into repair.',
    thesis:
      'The defining sign of a neurotic relationship is that it contains the problem in its own substance: psychological, financial and emotional resources go not into living but into endlessly fixing the relationship itself — repairing the car rather than driving it somewhere. Underneath sits a paradox: wanting to change and fearing it, wanting to leave and being unable to.',
    ideas: [
      {
        name: 'You relate to yourself as you were related to',
        body: 'From cultural-historical psychology: there is no unmediated access to your own inner experience — the relationship you have with yourself is modelled on how adults related to you, the way a child first led by the hand later leads themselves. The illustration offered is self-consciousness in front of a camera when alone: it materialises the gaze of another, and there is no way to look at yourself except with social eyes.',
      },
      {
        name: 'Not every neurotic component is fatal',
        body: 'He takes a deliberately more moderate position than the "leave immediately if there is neurosis" view, naming the colleague he differs from without disparaging them. The criterion offered: does the relationship reduce entirely to the neurotic mechanism, or are the people still driving and looking around — still getting something real? If the latter, there is something to work with.',
      },
      {
        name: 'Repetition can be its own reward',
        body: 'The neurotic personality is described as beating their head against the wall and, at some level, getting something from it — repeating a pattern in order to feel a familiar pain again, without that being conscious.',
      },
      {
        name: 'Therapy works on the image, not the person',
        body: 'Work on a relationship is always work with the version of the other person inside your own head rather than with the actual human being. That reframe is what makes the work possible when the other party is unavailable, unwilling, or gone.',
      },
      {
        name: 'What I do but do not want; what I want but do not do',
        body: 'The two-column exercise given as universal — applicable to any area where things feel stuck, not only to relationships.',
      },
    ],
    notes: [
      'Like attracts like, sometimes further down than expected — friendship and attraction tend to form between similar people, with an illustration running to shared clinical outcomes decades later.',
      'A list of what the other person is actually living by is offered as a direct test of the quality of any close relationship, friendships included.',
      'A named psychiatrist in private practice, giving clinical positions rather than research claims and openly marking where he differs from a colleague — an acknowledgement that schools of thought differ rather than a single correct view. The philosophical references are real and attributed; the one empirical reference is not backed with a citation.',
    ],
    practices: [
      'Ask where the resources are going: into living, or into repairing the relationship itself.',
      'Write the two columns — what you do but do not want, and what you want but do not do.',
      'Try to list what the other person is actually living by right now. Struggling to is the finding.',
      'Notice which image of the person you are arguing with, since that is who you are actually talking to.',
    ],
    habits: [
      { id: 'f_remember', because: 'Listing what someone is actually living by is only possible if you were listening last time — this is that test, run weekly instead of once.' },
      { id: 'f_meet', because: 'The image in your head drifts from the person unless it is regularly corrected by the person.' },
      { id: 'f_thanks', because: 'Naming something specific and real is the opposite of the repair loop: it is the relationship being used rather than worked on.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The two-column exercise usually produces one thing you want but do not do — and it is almost always a conversation.' },
    ],
    vaultSource: 'Social & friends / Resource / Журавлёв — Невротические отношения, вина и починка машины вместо поездки',
  },

  {
    slug: 'the-cost-of-ownership',
    attr: 'money',
    title: 'Every purchase drags a tail of purchases behind it',
    origin: 'Seisembay — on the delta, cost of ownership and expense order',
    medium: 'podcast',
    minutes: 6,
    hook: 'If investing feels exciting, that is the signal you are losing money rather than making it.',
    thesis:
      'Managing money is a third process, independent of earning more and spending less — the gap does not accumulate by itself even on a high income if nobody is managing it. Two practical consequences follow: anything you buy drags a chain of subsequent costs behind it that is rarely counted in advance, and personal spending has to run in a fixed order rather than by whatever is most pressing.',
    ideas: [
      {
        name: 'Three separate processes',
        body: 'Financial literacy is built around the delta between income and outgoings, and without a positive delta investing is not a meaningful conversation. But managing money reduces to neither earning more nor economising: someone can grow their income steadily and still be short, precisely because managing is a distinct skill nobody trained.',
      },
      {
        name: 'The brain spends future income now',
        body: 'Deferred payment is handled badly: money not yet received is mentally spent before it arrives, which is the mechanism that makes borrowing against a future salary feel reasonable in the moment.',
      },
      {
        name: 'Cost of ownership',
        body: 'Any status purchase pulls a chain of unaccounted costs after it — the worked example runs from an expensive lighter to a matching cigar, to the drink it apparently requires, to somewhere to store them, ending at roughly ten times the original outlay. The practical instruction is to say out loud what tail a purchase will drag before looking at the price on it.',
      },
      {
        name: 'Investing should be boring',
        body: 'The marker given: if investing produces excitement and a pull to check the charts, that is a sign of losing money rather than earning it. Investing that works looks like routine, tedious work. Related rules: never borrow in order to invest, do not confuse the guaranteed saving of early repayment with a hypothetical market return, and start with a sum you would not mind losing, because early losses are close to inevitable.',
      },
      {
        name: 'Quality of life has a floor',
        body: 'The stated order is a tax to your future self first, then the insurance reserve, then genuine necessities, and only then quality of life — which cannot be cut below a certain level, because doing so hits self-esteem and through it the ability to earn at all.',
      },
    ],
    notes: [
      'Cash reserve kept separately from investments, so a shock does not force the sale the strategy depends on not making.',
      'Pyramids and casinos are grouped as psychologically adjacent — both are the wish to earn everything at once, and one participant argues the better predictor of walking into one is the absence of a cushion and of any long-horizon habit, rather than a lack of financial literacy.',
      'The host opens by saying explicitly that this is kitchen-table conversation rather than an expert platform, and most material is personal observation rather than data.',
      'One study is misattributed to the wrong university in passing, quoted figures come from memory, and personal sums are anecdote — none of it load-bearing, but not to be leaned on as sourced.',
    ],
    practices: [
      'Before a status purchase, write the chain of costs it will pull behind it, then decide.',
      'Run the order deliberately: future self, reserve, necessities, then quality of life.',
      'Treat excitement about an investment as a stop signal rather than a good sign.',
      'Keep the cash reserve separate from anything invested.',
      'Start with an amount whose loss would not injure you, and expect to lose some of it.',
    ],
    habits: [
      { id: 'm_waitlist', because: 'A day\'s delay is exactly long enough to write out the tail of costs the purchase drags — which is the calculation the price tag hides.' },
      { id: 'm_payday', because: 'The tax to your future self comes first in the stated order, and the only way an order survives contact with a month is if the first item is automatic.' },
      { id: 'm_log', because: 'The delta is a subtraction, and half of it stays unknown while the outgoings are unmeasured.' },
    ],
    quests: [
      { id: 'q_emergencyfund', because: 'The reserve sits second in the order and is named separately from investments — it is the thing that stops a shock forcing a sale.' },
      { id: 'q_debts', because: 'Early repayment is a guaranteed return, and the source\'s warning is against trading that certainty for a hypothetical one.' },
    ],
    vaultSource: 'Finance & money / Resource / Сейсембай — Дельта, цена владения и приоритет расходов',
  },
  {
    slug: 'money-shame-and-courage',
    attr: 'money',
    title: 'Money amplifies what was already there',
    origin: 'Dmitrieva — psychologist, on money beliefs, shame and naming your price',
    medium: 'podcast',
    minutes: 6,
    hook: 'Underneath most of the barriers sits one thing: the courage to be visible and say what you cost.',
    thesis:
      'The capacity to earn more is set not only by knowledge and skill but by a set of psychological settings: separation from family, self-esteem, appetite for novelty, and beliefs about money absorbed in childhood. Money neither corrupts nor improves — it amplifies what was already in the character. And underneath most of the barriers sits the same deficit: the courage to be visible, to name your price, to risk failing.',
    ideas: [
      {
        name: 'The fear of outgrowing your parents',
        body: 'An unconscious fear of exceeding the standard of living you came from is described as a real and common barrier. Separation is not rupture: it is the capacity to be close and separate at once — different principles, different incomes, different decisions, without that being a conflict.',
      },
      {
        name: 'Self-esteem can be fuel or brake',
        body: 'Low self-esteem can drive someone to work harder and prove something, and it works up to a point — or it can produce capitulation: it will not work anyway, so why try. The practical diagnostic is to notice which direction yours is running and intervene only if it is the second. Successful people not uncommonly monetise a wound, and that is not automatically a reason to fix it while it is functioning as fuel.',
      },
      {
        name: 'Wanting, devalued early',
        body: '"You will stop wanting it" teaches that wanting is not worth doing, and lowers the odds that the adult wants much at all. The proposed replacement keeps the wanting and adds the work: good that you want it — let us think about how to get there.',
      },
      {
        name: 'Money does not change the character it arrives at',
        body: 'The claim against "money spoils people": it amplifies what was there before, illustrated with the speaker\'s own tendency to give gifts — small ones before, large ones after.',
      },
      {
        name: 'Shame as a cultural layer',
        body: 'Beyond the family beliefs sits a cultural layer that attaches shame to having money and to discussing it at all — which is what makes naming a price feel like a transgression rather than a transaction.',
      },
      {
        name: 'Managing money is its own variable',
        body: 'Independent of financial literacy: the ability to not spend to zero or into the negative is treated as a separate capacity rather than a consequence of knowing more.',
      },
    ],
    notes: [
      'Phrases that keep an adult a child — you will always be my little one — are described as lowering rather than raising the motivation to build an independent life. The suggested substitution keeps the relationship and drops the infantilising.',
      'A useful separation: how much you actually need for stability, versus how much it seems you need based on other people\'s examples.',
      'A practising psychologist in an interview format, working from clinical observation rather than cited research. Two claims presented as research-backed are given without naming the studies; they are plausible and consistent with the wider literature but cannot be checked here, and the personal anecdotes illustrate a mechanism rather than establish a rate.',
    ],
    practices: [
      'Take the single belief about money that is costing you most right now, and rewrite it deliberately.',
      'Check which way your self-esteem is running before trying to repair it.',
      'Separate the number you need for stability from the number you inherited from comparison.',
      'Practise saying the price out loud, since the barrier is usually the saying rather than the number.',
    ],
    habits: [
      { id: 'm_owed', because: 'Money between people is where the shame layer shows up first — and the habit is one sentence about a thing that is otherwise never said.' },
      { id: 'm_checkbalance', because: 'Shame works by keeping the number unlooked at; ten seconds a day removes the avoidance without requiring the feeling to change first.' },
      { id: 'm_log', because: 'Managing money is named as a variable separate from knowing about it, and the log is where managing becomes possible at all.' },
    ],
    quests: [
      { id: 'q_raise', because: 'The whole entry converges on naming your price out loud — this is the quest where that stops being a belief and becomes a sentence someone hears.' },
      { id: 'q_debts', because: 'Shame keeps the total vague, and the total is the specific thing shame makes hardest to look at directly.' },
    ],
    vaultSource: 'Finance & money / Resource / Дмитриева — Психология денег, стыд и смелость',
  },

  {
    slug: 'the-cycle-is-the-enemy',
    attr: 'family',
    title: 'Neither of you is the problem. The dance is.',
    origin: 'Sue Johnson — originator of EFT, on the pursue-withdraw cycle',
    medium: 'podcast',
    minutes: 7,
    hook: 'Criticism is usually protest in disguise — and what it literally means is "where are you, I need you".',
    thesis:
      'Romantic relationships are attachment bonds — structurally the same system that binds infants to caregivers — rather than negotiations between two independent parties. Distress follows a predictable shape: one partner protests disconnection in a form that looks like criticism, the other hears attack and withdraws to protect themselves, and the withdrawal fuels more protest. Neither person is the problem; the cycle is.',
    ideas: [
      {
        name: 'Bonds, not bargains',
        body: 'Her account of the shift: skills-based couples work produced compliant behaviour inside the session that evaporated the moment the exercise ended. Applying attachment theory — until then reserved for infants and mothers — to adult relationships was professionally risky at the time and drew open ridicule from peers working in the bargaining model.',
      },
      {
        name: 'The pursue-withdraw loop',
        body: 'A raised voice or a criticism is a distorted protest: I do not feel heard, I do not feel like I matter to you. The partner receives it as blame — I am not wanted, I am not enough — and shuts down, face going flat. The more one shuts down, the more frantic the other becomes. Naming the dance itself as the shared enemy is the reframe that makes the work approachable at all.',
      },
      {
        name: 'The same few fears underneath, on both sides',
        body: 'Whatever the surface emotion — anger, demand, numbness — it sits on a small set of primal fears: rejection, abandonment, isolation, not being enough. These are described as wired into the nervous system of a bonding mammal rather than as personality flaws, which is why they do not respond to being argued with.',
      },
      {
        name: 'The case that shows the translation',
        body: 'A man presenting with relentless sexual demand turned out, once explored, to be panicking about whether his wife loved him at all — sex was the only channel where he briefly felt safe. When he could name the actual need — touch me, reassure me that I matter — his wife responded to the vulnerability rather than to the demand, and the dynamic changed.',
      },
      {
        name: 'Why the bonding conversation sticks',
        body: 'When a partner can share genuine vulnerability and reach toward the other rather than attack or withdraw, it functions as biologically prepared learning: the nervous system registers it as survival-relevant and keeps it. Taught communication skills do not stick the same way, because they are processed as technique.',
      },
    ],
    notes: [
      'One round of genuine vulnerability is not a fair test — several cycles before a withdrawn partner responds is described as normal. Persistent non-response across many is different information.',
      'Specifying a vague fear is itself de-escalating rather than merely analytical: not "everything is falling apart" but the particular thing being feared.',
      'EFT has a substantial independent outcome-research base and is commonly named alongside the Gottman method as a gold-standard approach — the core claims here reflect mainstream clinical consensus rather than a fringe position.',
      'In this particular conversation the neuroscience vocabulary is used loosely and metaphorically rather than technically, and the outcome figures cited are referenced without naming studies. Read the mechanism as clinical shorthand, not as precise neuroscience.',
    ],
    practices: [
      'Describe the loop instead of the person: when I get loud you go quiet, and the quieter you get the louder I get.',
      'Translate protest into its literal request before responding to its tone.',
      'Say the vulnerable version — the fear underneath — rather than the demand on top of it.',
      'Name the specific fear rather than letting it stay global.',
      'Do not judge the approach on a single attempt.',
    ],
    habits: [
      { id: 'f_remember', because: 'Mattering is the thing being protested for, and remembering what someone told you last time is its smallest daily evidence.' },
      { id: 'f_voice', because: 'Tone is what gets misread in the loop — a voice carries the vulnerability that the same words in text reliably lose.' },
      { id: 'f_thanks', because: 'Specific appreciation is a reach toward the other person, which is the exact move the cycle prevents both partners from making.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The bonding conversation is the whole intervention — and it is precisely the conversation the cycle has been postponing.' },
      { id: 'q_reconnect', because: 'The same protest-and-withdraw shape runs in every close relationship, not only romantic ones, and it ends the same way: someone reaches first.' },
    ],
    vaultSource: 'Family & relationship / Resource / Johnson — Emotionally Focused Therapy and the Bonding Conversation',
  },
  {
    slug: 'dont-collect-stamps',
    attr: 'family',
    title: 'Do not collect stamps',
    origin: 'Meleshko — psychotherapist, on the four stages and the drama triangle',
    medium: 'podcast',
    minutes: 6,
    hook: 'The breakup happens over the socks. The reason was filed months earlier.',
    thesis:
      'The organising metaphor is a garden two people tend together rather than a fifty-fifty deal. The structural map: four stages a couple moves through, the drama triangle as the explanation for most recurring conflict, and a written five-area agreement as the concrete instrument. The deliberately unpopular claim underneath: mature love is not finding someone who closes your earlier problems but joint work on finishing what did not finish in childhood.',
    ideas: [
      {
        name: 'Four stages, and why duration tells you nothing',
        body: 'Searching; infatuation and symbiosis, running from a month to around three years on hormonal drive; the struggle for power, where each partner starts producing what they inherited from their family and tries to build the relationship to that internal template; and interdependence, which takes seven years and upward. How long you have been together says nothing — a couple can spend twenty years stuck in the third stage. The example given is a pair discovering in therapy after fifteen years that they did not know each other.',
      },
      {
        name: 'The imago',
        body: 'The unconscious image of the expected partner, formed in the family you came from — whether there was warmth, whether there was trust. It gets repeated in who you choose and in what you expect from them, whether or not you intend it.',
      },
      {
        name: 'Why drama is more comfortable than closeness',
        body: 'A conflict pattern is predictable, and predictability is psychologically comfortable even when it is unpleasant. Vulnerability is genuinely unknown territory, which is why it frightens people more than familiar pain does.',
      },
      {
        name: 'The drama triangle',
        body: 'Persecutor, victim, rescuer — three roles the parties switch between while passing responsibility around: the victim hands it over (you should have guessed), the persecutor pushes it back (you owe me), the rescuer takes on what is not theirs. The exit is direct conversation about the specific need instead of playing the role.',
      },
      {
        name: 'Stamps',
        body: 'Unspoken grievances collect like stamps in an album. When the album fills, the break happens over something trivial — the socks in the wrong place — although the cause accumulated much earlier. The instruction that follows is not to collect them at all: say the tension immediately, in small amounts.',
      },
      {
        name: 'Criticise the behaviour, not the person',
        body: 'Taken from the Gottman material: a trainable rule that applies to any close relationship rather than only a romantic one.',
      },
    ],
    notes: [
      'A written agreement across five areas is offered as a concrete template — with stability (not taking large decisions alone) and openness (which subjects are not left unsaid) named as the load-bearing ones.',
      'A fair diagnostic before deciding to leave: have you actually done everything to keep it, or is this a reaction to being tired?',
      'A practising transactional-analysis therapist citing the real originators of the models used — these are documented frameworks from established schools rather than the speaker\'s own metaphors, which is worth noting given how much material in this area is invented vocabulary. The clinical illustrations are, as always, unverifiable.',
    ],
    practices: [
      'Say the small irritation now, in a small amount, rather than filing it.',
      'When a conflict repeats, ask which of the three roles each of you is currently occupying.',
      'Criticise a specific behaviour, never the character.',
      'Write the agreement down together rather than assuming it is understood.',
      'Ask what stage you are actually in, rather than how long it has been.',
    ],
    habits: [
      { id: 'f_meet', because: 'The stages are moved through by shared experience rather than elapsed time — and shared experience needs to actually be scheduled.' },
      { id: 'f_remember', because: 'The fifteen-year couple who did not know each other is the warning; asking about the thing they told you last time is the cheapest possible defence against becoming them.' },
      { id: 'f_nogossip', because: 'Talking about someone who is not there is how a grievance gets filed instead of said — which is exactly how the album fills.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'Leaving the triangle is described as naming the specific need directly — which is a conversation, not a resolution to behave differently.' },
      { id: 'q_reconnect', because: 'Stamps collect in every close relationship, not only the romantic one, and they are cleared the same way: by saying the thing.' },
    ],
    vaultSource: 'Family & relationship / Resource / Мелешко — Четыре стадии отношений, драматический треугольник и контракт из пяти обещаний',
  },

  {
    slug: 'count-it-in-grams',
    attr: 'health',
    title: 'The gut does not rest, and neither does the myth',
    origin: 'Vyalov — gastroenterologist, on digestion myths and what actually matters',
    medium: 'podcast',
    minutes: 6,
    hook: 'Most of what people believe about eating does not survive contact with the mechanism.',
    thesis:
      'Most popular beliefs about eating and digestion do not hold: the stomach does not rest between meals any more than the heart does, frequent small meals have no demonstrated basis, probiotics are indicated for a narrow group rather than everyone, and fizzy drinks harm through one specific mechanism — pushing acidic stomach contents back into the oesophagus. The systemic problem underneath is that people think about food abstractly, in "I eat normally", and never in grams.',
    ideas: [
      {
        name: 'The tract does not take breaks',
        body: 'Like the heart, lungs and brain, the digestive tract works continuously — it can move faster or slower, but a full stop is an obstruction rather than a rest. The frequent-small-meals advice is traced to dietary tables designed in the 1920s for feeding up the starving, not for a modern person with a surplus of food.',
      },
      {
        name: 'Skipped meals are borrowed, not free',
        body: 'If you do not eat when you should, the body takes from reserves, and that has to be returned. Skipping is not costless even when it feels fine at the time.',
      },
      {
        name: 'A sustained fast is not a skipped day',
        body: 'Extended fasting periods are described as having a real measurable effect — a reported reduction in liver fat over a month — but only where there was overeating to begin with. A single day without food does not produce the same thing.',
      },
      {
        name: 'Probiotics are a narrow indication',
        body: 'Probiotic is the microbe, prebiotic its food, and the further categories are largely marketing. Medical indications after antibiotics are a short list rather than everyone as a precaution — a substantial share of people taking them report feeling worse, because an excess of gut microbes is more common than a shortage. Most commercial microbiota tests show only part of the picture; one sequencing method gives the full species composition.',
      },
      {
        name: 'Gastritis is cell death, not a stomach ache',
        body: 'Medically it means the death of stomach cells, with three paths onward: recovery — the option few people know exists — ulceration, or the cycles of damage and repair that can go wrong. Using it as a household label for any abdominal discomfort devalues a genuinely serious diagnosis.',
      },
    ],
    notes: [
      'The stomach is on the left, under the heart; the liver on the right. Pain on the left is the stomach and on the right the liver, rather than the pancreas as is commonly assumed.',
      'The threshold for seeing a doctor, offered as a concrete rule: the same troubling symptom at least once a week for around three months.',
      'For weight loss: no ideal diet, only a sustained deficit at roughly a kilogram a week, with waist circumference a more honest reference than the scale.',
      'A demystifying rather than promotional source — he calls parts of the market, including some tests and product categories, marketing outright. But the specific figures are given confidently without citations in the conversation itself; they align with the direction of the current literature but cannot be checked from here.',
      'One remark about fermented drinks and gut flora is directionally correct but delivered without dose or context, and he immediately clarifies his overall position against alcohol — the qualification matters more than the line.',
    ],
    practices: [
      'Count the actual grams once — protein, fat, fibre — to see the gap between what you assume and what you eat.',
      'Do not drink fizzy drinks in the evening, and do not lie down straight after eating.',
      'Use the once-a-week-for-three-months rule as the threshold to stop tolerating a symptom.',
      'Judge weight change by waist circumference rather than by the scale.',
      'Drop sweeteners and flavour enhancers if the goal is to stop overeating.',
    ],
    habits: [
      { id: 'h_nolate', because: 'The reflux mechanism is the specific one described — and not eating late is the version of the fix that costs no new time.' },
      { id: 'h_realmeal', because: 'The gap between "I eat normally" and the actual grams closes at the level of one real meal, not at the level of a diet.' },
      { id: 'h_water', because: 'The routine, unglamorous input is the one that survives; the marketed categories are the ones he spends the episode dismantling.' },
    ],
    quests: [
      { id: 'q_healthcheck', because: 'The once-a-week-for-three-months threshold is useless as knowledge and useful as an appointment.' },
      { id: 'q_energyaudit', because: 'Thinking about food abstractly is the named root problem, and an audit is what replaces the impression with a record.' },
    ],
    vaultSource: 'Health & sport / Resource / Вялов — ЖКТ, микробиота и мифы о питании',
  },
  {
    slug: 'cut-the-middle-out',
    attr: 'health',
    title: 'Cut the unproductive middle out of your week',
    origin: 'Stacy Sims — exercise physiologist, on polarised training and intensity language',
    medium: 'podcast',
    minutes: 6,
    hook: 'The zone that feels hardest is often the one doing least — hard enough to cost you, not hard enough to pay.',
    thesis:
      'Two things make training legible: a precise vocabulary for intensity, and a polarised model that combines genuinely hard work with genuinely easy recovery while deliberately avoiding sustained moderate effort. That middle zone feels effortful enough to raise cortisol and generate fatigue without being intense enough to trigger the adaptive response that would offset it.',
    ideas: [
      {
        name: 'Reps in reserve, and RPE',
        body: 'Stopping a set a defined number of repetitions short of true failure — eight clean reps with two more available in good form. It maps directly onto a one-to-ten perceived-exertion scale, which lets intensity be prescribed without testing a one-rep max, itself a risky thing to attempt on compound lifts.',
      },
      {
        name: 'The unproductive middle',
        body: 'Combine truly hard efforts with true easy movement and avoid the sustained moderate zone. Popular class formats are criticised by name for parking people exactly there — maximally effortful in feel, least productive in effect.',
      },
      {
        name: 'Two different interval protocols, routinely conflated',
        body: 'Interval work at eighty per cent and above runs one to four minutes with self-paced recovery. Sprint interval training is a distinct and harder protocol: thirty seconds or less at true maximum, then two to three minutes of full recovery — explicitly not the twenty-on twenty-off format, because that does not allow the energy system and nervous system to recover between efforts. They produce different stimuli.',
      },
      {
        name: 'A concrete post-training sauna sequence',
        body: 'After resistance training: hydrate lightly with a little salt, sauna, then rehydrate slowly afterwards — presented as a low-cost addition aimed at blood volume, applicable regardless of sex.',
      },
      {
        name: 'Where default advice inverts',
        body: 'Her specialisation is that women are more oxidatively efficient by default — more slow-twitch fibre, better baseline fat utilisation — which flips several pieces of male-derived advice from neutral to counterproductive: fasted training, long fasting windows, and low carbohydrate intake among them.',
      },
    ],
    notes: [
      'The intensity vocabulary here is the same one used elsewhere in this sector, which makes reps-in-reserve the common language across the strength material rather than a competing scheme.',
      'A world-recognised exercise physiologist with a large peer-reviewed record and direct work with professional teams — high authority, particularly on the female-specific material that is her core specialisation.',
      'Comparative male-female claims are stated confidently without individual citations in the episode, and several are flagged by her as preliminary or as her own coaching pattern-matching: she calls the menstrual-cycle-and-performance research confounded and underpowered, and says outright that the study on contraceptive effects on training adaptation has not been done. One cold-water finding is a single pilot rather than a replicated result.',
    ],
    practices: [
      'Prescribe intensity in reps in reserve rather than by percentage of a max you have not tested.',
      'Make the easy sessions genuinely easy and the hard sessions genuinely hard.',
      'Treat sustained medium-hard cardio as the least useful category rather than the safe middle ground.',
      'Keep sprint efforts under thirty seconds with full recovery, rather than compressing the rest.',
    ],
    habits: [
      { id: 'h_steps', because: 'The easy pole of the polarised model has to actually exist, and walking is the version of it that does not quietly become moderate.' },
      { id: 'h_pushups', because: 'Reps in reserve is only learnable on something you do often enough to feel the difference between eight and failure.' },
      { id: 'b_sport', because: 'True high intensity is easier to reach in something you would play anyway than in a session you have to talk yourself into.' },
    ],
    quests: [
      { id: 'q_habitsystem', because: 'Polarising a week is a scheduling decision about which sessions are hard and which are easy — made once, not renegotiated each morning.' },
      { id: 'q_energyaudit', because: 'The unproductive middle is invisible without a record: it is the zone that feels like it counted.' },
    ],
    vaultSource: 'Health & sport / Resource / Sims — Polarized Training, RPE, Post-Workout Sauna Protocol and Female-Specific Physiology',
  },

  {
    slug: 'weakness-and-goal',
    attr: 'brightness',
    title: 'Two things make an audience care, and detail is neither',
    origin: 'John Truby — on genre, weakness and the premise line',
    medium: 'podcast',
    minutes: 6,
    hook: 'Most scripts fail before a page is written — at the one-sentence premise.',
    thesis:
      'What makes an audience care about a character is exactly two things: their weakness or need — a deep internal problem running their life — and their goal. Detailed traits are surface. Plot comes from character in a specific engineering sense: the pursuit of the external goal is built to force a confrontation with the internal weakness, and it is the inner change the audience is actually invested in.',
    ideas: [
      {
        name: 'The premise is where things fail',
        body: 'The claim is that the overwhelming majority of scripts fail at the one-sentence stage, before drafting — and usually not because the idea is bad but because it was put into the wrong form to develop it in. The two tests offered: is there a desire line that can sustain the full length, and is there an opponent capable of sustaining conflict?',
      },
      {
        name: 'The product is the form, not the person',
        body: 'Genres are story forms refined over decades or longer, with their characters, themes and mechanics already worked out — which is why they travel across cultures. A studio buying a character bank is buying pre-established, globally recognised figures reusable indefinitely.',
      },
      {
        name: 'Combination is the default and the hard part',
        body: 'Almost nothing modern is single-genre; most combine two to four. Each carries its own hero, opponent, desire line and theme, so combining them without skill produces unconnected chaos rather than richness.',
      },
      {
        name: 'Transcending means paying the dues surprisingly',
        body: 'Every form has eight to fifteen non-negotiable beats. Writing them conventionally produces something indistinguishable; ignoring them produces something unsatisfying. The professional move is hitting each required beat in a way nobody has seen — giving the audience what they came for and something new at once.',
      },
      {
        name: 'Structure first, dialogue last',
        body: 'A checkable rewrite discipline: resist polishing sentences until the underlying structure has been confirmed to work. Applies to any long piece, not only scripts.',
      },
    ],
    notes: [
      'His method was empirical rather than theoretical — roughly three years of watching two films a day and taking notes in the dark, hunting for what recurred.',
      'Worth holding as a live disagreement rather than a settled answer: Truby dismisses three-act structure outright as fabricated, while other working screenwriting educators build their frameworks on exactly that paradigm. Both are practitioners with real records; this is a genuine professional dispute about which structural model is real versus oversimplified, not a case of one being uninformed.',
      'A credentialed consultant whose craft book sits alongside the standard references in the field. The specific counts — how many genres, what proportion of scripts fail — are stated confidently and are best read as working figures rather than measurements.',
    ],
    practices: [
      'Define the internal weakness and the external goal before adding any surface detail.',
      'Test the premise for a desire line long enough to sustain the whole thing, and an opponent strong enough to sustain conflict.',
      'Name the form you are working in, then find the version of each required beat nobody has seen.',
      'Fix structure before sentences, every time.',
    ],
    habits: [
      { id: 'd_notes', because: 'His whole framework came out of taking notes on what recurred — the method is available to anyone willing to write down what they noticed.' },
      { id: 'd_read', because: 'Recognising the beats of a form requires having consumed enough of it to feel where they land, which is a volume problem.' },
      { id: 's_makecreate', because: 'Premise tests are cheap and abstract until something is being built against them.' },
    ],
    quests: [
      { id: 'q_makeweekly', because: 'Structure-before-dialogue is only a real discipline on a piece carried to done — an unfinished draft never reaches the stage where it would bite.' },
      { id: 'q_portfolio', because: 'Whether a beat actually surprised anyone is not answerable from inside your own head.' },
    ],
    vaultSource: 'Memories & Fun / Resource / Truby — Genre, Character Weakness and the Craft of Premise',
  },
  {
    slug: 'plan-so-the-poetic-brain-is-free',
    attr: 'brightness',
    title: 'Solve the problems first, so the making can be instinctive',
    origin: 'Amor Towles — novelist, on planning, vocabulary and noticing',
    medium: 'podcast',
    minutes: 6,
    hook: 'Front-load every analytical decision, so that while working, the analytical part has nothing left to argue about.',
    thesis:
      'The working method is extreme front-loading: years of handwritten notebooks resolving plot, setting and backstory before drafting a single chapter — specifically so that during the writing the analytical brain is already satisfied and the instinctive side is free to produce surprising language. And description works when filtered through a specific character\'s actual noticing rather than through the maker\'s inventory of researched facts.',
    ideas: [
      {
        name: 'Vocabulary as a collected toolkit',
        body: 'Every domain has its own vocabulary, and the ongoing job is tuning the ear to collect striking words across all of them for later use. His example: weaving period-appropriate French into a novel because that society genuinely spoke it, so the vocabulary signals class and sensibility without anything being stated.',
      },
      {
        name: 'Immersive reading instead of research',
        body: 'Before writing a book set in a particular year, he read four novels written inside that same narrow window — chosen because they are radically different in subject and milieu despite being contemporaneous. The aim is period sensibility rather than period facts.',
      },
      {
        name: 'Description is presence, not decoration',
        body: 'Sharp and concise enough that a reader can locate themselves; not so spare the space could be anywhere, not so dense that they bog down. A practical move: front-load the spatial geography early so later scenes can rely on a map the reader has already built.',
      },
      {
        name: 'Tempo without urgency',
        body: 'Genre page-turners generate urgency from action. Literary pacing can generate it from psychological interest or sentence-level phrasing alone — which permits deliberately slow stretches, provided something else keeps pulling. The editing test he gives: if a section still bores him on the third pass, it goes.',
      },
      {
        name: 'The opening of doors',
        body: 'A test for an idea: does imagining it spontaneously generate many directions, or does it stay flat and singular? Useful before committing time rather than after.',
      },
    ],
    notes: [
      'Ground a period or a place in one character\'s small specific noticing rather than reaching for the obvious landmark — the specific detail carries more than the famous one.',
      'A named, verifiable novelist describing his own documented method, consistent with his other public accounts. The anecdotes illustrate process rather than establish facts, and his opinions on other writers are presented explicitly as personal taste.',
    ],
    practices: [
      'Do the structural thinking before starting, so that the making itself can be instinctive.',
      'Collect vocabulary continuously, from domains you do not work in.',
      'Establish the geography early, then trust it for everything that follows.',
      'Run the opening-of-doors test on an idea before committing months to it.',
      'Cut what still bores you on the third read.',
    ],
    habits: [
      { id: 'c_plan', because: 'Front-loading the analytical work is the entire method — and it only works if the planning happens somewhere other than the moment of making.' },
      { id: 'd_read', because: 'Immersive reading is his substitute for research: sensibility is absorbed rather than looked up.' },
      { id: 'd_notes', because: 'The notebooks are the method. A striking word or a noticed detail is only available later if it was written down when it appeared.' },
    ],
    quests: [
      { id: 'q_makeweekly', because: 'The point of the planning is that the making goes fast when it starts — which only gets tested by carrying one thing to done.' },
      { id: 'q_tryfive', because: 'The opening-of-doors test needs several candidate ideas to compare, and ideas come from contact with unfamiliar things.' },
    ],
    vaultSource: 'Memories & Fun / Resource / Amor Towles — The Mindset Behind an Unforgettable Novel',
  },

  {
    slug: 'different-doors',
    attr: 'spirituality',
    title: 'You answer for delivering it, not for the result',
    origin: 'Gimatdinov — imam, on dialogue, different doors and the forgotten pillar',
    medium: 'podcast',
    minutes: 6,
    hook: 'Children repeat what their parents do, not what their parents say — and the same is true of everyone you are trying to convince.',
    thesis:
      'Three practical claims. Raising children in a practice works through dialogue and shared desire rather than compulsion. Persuasion has a methodology — different people are reached through different doors, and choosing the wrong one is a failure of method rather than of the listener. And the release from burnout in any persuasive effort is the same: you are answerable for the delivery, not for the outcome.',
    ideas: [
      {
        name: 'Dialogue is in the text, not a modern fashion',
        body: 'The Qur\'anic conversations between fathers and sons are described as friendly, containing the direct question "how do you see this yourself?" — even where the decision has already been settled from above and submission is inevitable. Asking a child\'s view and listening to it is therefore modelled in the source text rather than borrowed from contemporary psychology.',
      },
      {
        name: 'The sentence that fixed a practice for life',
        body: 'A personal account: after a missed dawn prayer the father did not reproach him, but said that the prayer is his own and not performed for anyone else — and that it would nonetheless help the father before God. The observation attached is that this framing, rather than shame, is why it was never missed again.',
      },
      {
        name: 'Fear of the parent produces bad advice from elsewhere',
        body: 'From pastoral experience: children facing serious problems, dependencies included, do not go to their parents precisely because they are afraid — and take advice from worse sources instead. The prevention named is not declared availability but actual presence and listening at the moment someone wants to say something.',
      },
      {
        name: 'Enter through different doors',
        body: 'For each type of person a different route: conversation for the talkative, a book for the reader, a film for the watcher, audio for someone who drives, and for some simply being listened to. The historical illustration offered is a region converted not through war but through the observed honesty of traders.',
      },
      {
        name: 'Character is the most effective argument',
        body: 'The recurring claim: how you conduct yourself does more persuasive work than what you say, which is the same mechanism as children copying behaviour rather than instruction.',
      },
    ],
    notes: [
      'Patience rather than reaction to hostility is presented as a tested strategy, with a transmitted story used as illustration — passed on rather than personally witnessed, and flagged as such.',
      'Checking the reputation of a charitable fund before giving is offered as an ordinary practical habit rather than a caveat.',
      'A practising imam with formal theological training, drawing on pastoral experience and citing sources explicitly. The biography that made up much of the original conversation is deliberately not carried here.',
    ],
    practices: [
      'Ask "how do you see this yourself?" even when the decision is already made.',
      'Be present at the moment someone wants to speak, rather than announcing you are available.',
      'Choose the door that fits the person — a book, a conversation, a recording, or simply being heard.',
      'Hold yourself answerable for delivering it and not for whether it landed.',
      'Check who you are giving to before you give.',
    ],
    habits: [
      { id: 'm_charity', because: 'The pillar he calls the least understood is the one that only becomes real as a repeated act rather than an annual calculation.' },
      { id: 'f_remember', because: 'Being present at the moment someone wants to talk is built from having listened last time — that is what makes a person try again.' },
      { id: 's_forgive', because: 'Patience instead of reaction is the strategy the source puts most weight on, and it is trained on small things before it is available for large ones.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The warning is specific: the conversation not had, out of fear, is the one that gets answered by someone worse.' },
      { id: 'q_learnfaith', because: 'He names one pillar as the least understood even among practising people — which makes it a thing to study rather than assume.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Гиматдинов — Диалог как воспитание, дауат через разные двери и закят как забытый столп',
  },
  {
    slug: 'environment-is-fuel',
    attr: 'spirituality',
    title: 'Check the source before you repeat it',
    origin: 'Two first-person accounts on practice, environment and verification',
    medium: 'podcast',
    minutes: 5,
    hook: 'If your practice slipped after the company changed, that is the finding — not the excuse.',
    thesis:
      'This is personal testimony rather than instruction, and two transferable patterns come out of it. The first: environment is fuel — conviction is described as something that needs feeding, and proximity decides which direction it moves. The second: verify a quotation before repeating it, because material circulating on social platforms is frequently distorted or stripped of its context.',
    ideas: [
      {
        name: 'Environment as the input, not the excuse',
        body: 'The mechanism given: near someone knowledgeable, knowledge accumulates; near someone devoted, the pull toward practice grows; near someone outside it, either vigilance quietly drops or it sharpens. The illustration is two strawberries, one spoiled — proximity to the spoiled one does its work by default unless the arrangement changes first.',
      },
      {
        name: 'The audit that follows from it',
        body: 'The concrete action: if practice started slipping after the company changed, treat that as the signal to change the circle rather than as a reason to blame circumstances. One account describes doing exactly that, and treats the arrival of a better circle as an answer rather than a coincidence.',
      },
      {
        name: 'Verify before repeating',
        body: 'Both speakers warn that verses and quotations circulating on short-video platforms are often distorted or cut from their context, and recommend opening a commentary and checking the whole passage yourself rather than trusting the clip.',
      },
      {
        name: 'Conscious practice versus performed practice',
        body: 'The distinction they draw from their own history — an early, formal observance that did not match the rest of how they were living, and a later, deliberate acceptance. The transferable marker is the difference between doing something because it is expected and doing it having actually agreed to it.',
      },
      {
        name: 'The order of asking',
        body: 'Their reformulation of reliance: ask God first, then recognise His hand in the people who help — rather than working the other way around.',
      },
    ],
    notes: [
      'They also report that hostility they experienced years ago has since subsided, and separately note that a colour convention they encountered was a school uniform rule rather than a religious requirement — a local norm rather than a ruling.',
      'This is the testimony of two non-specialists, and the podcast itself says so in its preamble. Its value is in the psychological patterns and the lived account, not in theological precision.',
      'One hadith is conveyed by meaning without a chain, one claim about where a practice occurs is an unverified personal impression the speaker flags herself, and the striking coincidences both describe as direct answers are an interpretation common in this genre rather than a demonstrated mechanism — worth reading as how conviction gets reinforced rather than as evidence of how it works.',
    ],
    practices: [
      'Audit the company: if the practice slipped when the circle changed, change the circle.',
      'Open the commentary and read the whole passage before repeating a quotation you saw in a clip.',
      'Ask whether a practice is being performed or actually agreed to.',
      'Take instruction from a person you can verify rather than from an algorithmic feed.',
    ],
    habits: [
      { id: 's_quran', because: 'Reading the passage yourself is the verification habit in its ordinary form — the clip is only persuasive while the source stays unopened.' },
      { id: 'f_meet', because: 'If environment is the input, then who you are actually in a room with is the variable, and it does not change by intention.' },
      { id: 's_dhikr', because: 'The thing described as needing feeding does not survive on occasional attention, which is what makes the small daily version the load-bearing one.' },
    ],
    quests: [
      { id: 'q_learnfaith', because: 'Their own conclusion is to take it from a verified teacher and a real commentary rather than assembling it from fragments.' },
      { id: 'q_reconnect', because: 'Changing the circle is the action the environment argument actually points at, and it is done by contacting specific people.' },
    ],
    vaultSource: 'Spirituality & Religion / Resource / Dinde Podcast — Осознанность хиджаба, окружение как топливо имана и таваккуль через причины',
  },

  {
    slug: 'three-sources-of-an-idea',
    attr: 'career',
    title: 'Your own head is the worst source of an idea',
    origin: 'Seisembay — investor, on where opportunities come from and when to stop',
    medium: 'podcast',
    minutes: 6,
    hook: 'The ideas that feel most like yours are the ones with the worst record.',
    thesis:
      'Opportunities arrive from exactly three sources: somebody else\'s validated pain, an event or a piece of news, and your own head — and the third is named as the worst and most dangerous. The claim attached is personal and blunt: the overwhelming majority of businesses he personally started from "great idea" failed. The rule that follows is not to fall in love with your own idea.',
    ideas: [
      {
        name: 'Somebody else\'s pain, already validated',
        body: 'The strongest source is a problem someone brought to you because they have it — the examples given are founders who started after direct contact with an organisation that had a real, specific operational problem, or after a friend complained about a logistics failure. The validation happened before the idea existed.',
      },
      {
        name: 'Events and news',
        body: 'The second source is what is changing rather than what is bothering someone. His own example is a large contract found through a small news item — the opportunity was public and available to anyone reading with the right attention.',
      },
      {
        name: 'Four ways to train noticing',
        body: 'See things differently, do things differently, see different things, do different things — illustrated with a single glass of water yielding different ideas depending on the angle of attention.',
      },
      {
        name: 'Three decisions before choosing a niche',
        body: 'First, the base decision: are you willing to do this at all, independent of the niche? Second, intention — if the intention is to make money, failures are close to guaranteed; the workable intention is solving someone\'s pain, with money as consequence. Third, belief in the outcome, because without it nobody follows you: people do not follow a salary, they follow meaning.',
      },
      {
        name: 'Obstacles as a filter, and planning backwards',
        body: 'Someone who does not love the work magnifies small problems and leaves at the first refusal; someone who does minimises them and keeps the large goal in view. So the size obstacles appear to be is a diagnostic. The planning instruction that follows is to decompose backwards from the goal rather than forwards from current resources — his observation being that resources arrive during movement rather than existing beforehand.',
      },
    ],
    notes: [
      'On building a team: look first at engagement and genuine interest rather than at credentials — stated as the opposite of the instinct to select by diploma.',
      'A panel of practising entrepreneurs rather than an academic source, hosted by an investor openly promoting his own investment philosophy. That frame is useful but not neutral — he has an obvious interest in presenting his approach as universally correct.',
      'The specific founder cases are first-hand and checkable; the general claims about faith and luck are personal conviction rather than empirical statements, and the religious framing of belief as a mechanism is explicitly his own.',
    ],
    practices: [
      'Classify any new idea by which of the three sources it came from — and distrust yourself most on the third.',
      'Before committing, answer the three decisions: willing at all, what the intention is, and whether you actually believe it.',
      'Read obstacle size as a signal about fit rather than about the obstacle.',
      'Decompose backwards from the goal instead of forwards from what you currently have.',
      'Select people by engagement rather than by credential.',
    ],
    habits: [
      { id: 'd_askquestion', because: 'The best source is a problem someone else already has — which only reaches you if you are in the habit of asking about it.' },
      { id: 'd_read', because: 'The second source is events, and his own example was a small news item nobody else acted on.' },
      { id: 'c_onelesson', because: 'Training the four ways of noticing is a daily observation practice, and observations that go unwritten do not accumulate.' },
    ],
    quests: [
      { id: 'q_promise', because: 'The three decisions — willingness, intention, belief — stay abstract until something has been said out loud to someone who will remember it.' },
      { id: 'q_skill', because: 'Planning backwards from the goal produces a list of capabilities you do not yet have, which is where the next concrete skill comes from.' },
    ],
    vaultSource: 'Business & career / Resource / Сейсембай — Три источника бизнес-идей, найм по вовлечённости и решение о пивоте',
  },
  {
    slug: 'narrow-then-infinite',
    attr: 'career',
    title: 'Start in the narrowest real niche, then change modes',
    origin: 'Alexandr Wang — founder, on market sequencing and hiring for care',
    medium: 'podcast',
    minutes: 6,
    hook: 'The market that was "obviously too small" is exactly what made speed possible.',
    thesis:
      'A deliberate two-mode strategy: begin in the narrowest defensible niche to build real momentum, then consciously switch to searching for markets with no structural ceiling. Both halves are load-bearing, and the mistake is doing either alone — designing for an infinite market on day one, or never leaving the niche that made the early speed possible.',
    ideas: [
      {
        name: 'Early ideas are memetic',
        body: 'His own diagnosis of his first attempts: young founders\' ideas tend to be copies of whatever is visibly trending, because they lack a developed sense of where they are uniquely positioned to win. The actual founding insight arrived almost accidentally — noticing that every company around them needed the same unglamorous thing.',
      },
      {
        name: 'Both judgements about the niche were true',
        body: 'An investor called the initial market obviously too small to build anything large on. That was correct — and narrow-and-real was also exactly what allowed them to build fast and reach real scale quickly. The two are not in conflict; they describe different stages.',
      },
      {
        name: 'What makes a credible second act',
        body: 'He studied the canonical example of a large unrelated-seeming business built on internal capability, and extracts two ingredients: genuine conviction that the underlying market is structurally growing without a ceiling, and real cost advantages from scale — not merely having a capability lying around.',
      },
      {
        name: 'Hire for care, not credentials',
        body: 'Stated as a direct interview heuristic — and it converges with the same principle arrived at independently by other operators, which is worth more than either statement alone.',
      },
      {
        name: 'Quality is fractal',
        body: 'Standards do not hold below a level where care about them is visibly modelled above. The consequence for anyone leading anything: the standard is set by what you are seen to care about, not by what you ask for.',
      },
    ],
    notes: [
      'A practical engineering discipline offered in passing: check whether the simple approach already clears the bar before reaching for the elaborate one.',
      'A named founder with an obvious incentive to frame his own strategy and leadership favourably, in a friendly rather than adversarial interview — pushback is minimal.',
      'The concrete business facts are specific and checkable. His geopolitical claims are stated with more confidence than the evidence offered supports, and are best held as one well-placed person\'s judgement rather than as settled.',
    ],
    practices: [
      'Start in the narrowest niche you can actually defend, and accept that it is too small to end in.',
      'Decide deliberately when to switch modes rather than drifting.',
      'Before a second act, check both ingredients: no ceiling, and a real cost advantage.',
      'Interview for whether someone cares, not for what they have completed.',
      'Model the standard visibly, because it will not hold above the level you are seen to hold it.',
    ],
    habits: [
      { id: 'd_build', because: 'The founding insight came from noticing what everyone around them actually needed — which is visible from inside the building, not from planning.' },
      { id: 'c_ship', because: 'Quality being fractal means the standard is set by what others see you care about, which requires the work to be seen at all.' },
      { id: 'c_plan', because: 'Switching modes is a decision that has to be made deliberately at some point, and drift is what happens when nothing is scheduled to ask.' },
    ],
    quests: [
      { id: 'q_portfolio', because: 'A narrow, real, finished thing is the evidence that makes the second act credible — the capability has to exist before it can be redeployed.' },
      { id: 'q_skill', because: 'The two ingredients for a second act are a market read and a genuine cost advantage, and both are capabilities rather than opinions.' },
    ],
    vaultSource: 'Business & career / Resource / Alexandr Wang — Infinite Markets, the Swarm-of-Agents Manager, and Hiring for Care',
  },

  {
    slug: 'truth-then-plan',
    attr: 'money',
    title: 'Truth first. The plan comes after.',
    origin: 'Rublev — entrepreneur, on debt crisis, boundaries and neutrality',
    medium: 'podcast',
    minutes: 6,
    hook: 'The energy to build the plan does not arrive until after you have told everyone the truth.',
    thesis:
      'The account of climbing out of a large cash-flow collapse puts the order deliberately: not a plan first, but public honesty with every creditor — reaching out yourself, naming the real situation and at most a draft plan, rather than waiting until a finished solution exists. His claim is that the energy to build the plan only appears after that step, not before it.',
    ideas: [
      {
        name: 'Reach out first',
        body: 'The protocol is to contact people rather than hide, and to do it before there is anything good to report. Silence is what converts a solvable situation into an unrecoverable relationship.',
      },
      {
        name: 'Neutrality rather than reconciliation',
        body: 'His counterintuitive claim: what matters financially is not the state of the relationship with a parent but your internal state about it. He describes the drive to prove something operating as fuel while a relationship was severed, and part of that drive disappearing when it was restored. The goal he proposes is neither restoring the tie for its own sake nor holding on to the injury for its energy, but a neutral state in which proximity or distance stops steering decisions.',
      },
      {
        name: 'The order of the oxygen mask',
        body: 'An explicit hierarchy — yourself, then partner, then children, then parents, then everyone else — argued through the aircraft metaphor: it is not selfishness but the condition under which helping anyone is sustainable. He applies the same logic to giving.',
      },
      {
        name: 'The garden',
        body: 'A visualisation: your own space with a fence you set at whatever height you choose. Anyone or anything spending your energy without agreement does not automatically get access, regardless of relation or of what politeness prescribes. Whether to keep distance from a difficult relative is framed as a deliberate boundary decision rather than a moral verdict.',
      },
      {
        name: 'Repeated public giving escalates expectation',
        body: 'Unbounded, repeated and visible generosity is described as producing the same escalating cycle as any other pattern of help without conditions — offered from his own experience rather than as a theory.',
      },
    ],
    notes: [
      'The systemic family model he draws on is an alternative, non-evidence-based therapeutic approach, and his causal statements about parents and money are one person\'s narrative reading of a single life rather than a demonstrated mechanism.',
      'Worth noting across this sector: three different sources here offer three different stories about a father\'s role in financial development, and they do not agree with each other. None is verified. They are best held as three viewpoints rather than as converging evidence.',
      'A personal, unstructured conversation between acquaintances — not a therapist, not a financial adviser, and he says as much about the limits of his own view.',
    ],
    practices: [
      'Make contact before you have a solution, and say the real number.',
      'Aim for a neutral internal state rather than for either reconciliation or estrangement.',
      'Set the height of the fence deliberately, and stop treating access as socially obligatory.',
      'Put yourself first in the order, because everything downstream depends on it holding.',
    ],
    habits: [
      { id: 'm_owed', because: 'The whole protocol is one message sent before it is comfortable — and it is the same message every month it goes unsent.' },
      { id: 'm_checkbalance', because: 'Telling the truth to creditors requires knowing the truth first, and avoidance starts with not looking.' },
      { id: 'm_log', because: 'The collapse he describes began with treating money received as money earned — which a record distinguishes and memory does not.' },
    ],
    quests: [
      { id: 'q_debts', because: 'Truth-then-plan needs the truth to exist in one place first: every debt at its real number, before any conversation.' },
      { id: 'q_hardconversation', because: 'The first step is explicitly a conversation you initiate rather than a plan you finish.' },
    ],
    vaultSource: 'Finance & money / Resource / Рублёв — Нейтральность к родителям, техника «сад» и правда как первый шаг из долгового кризиса',
  },
  {
    slug: 'name-it-to-lower-it',
    attr: 'friends',
    title: 'An unnamed feeling runs hotter than a named one',
    origin: 'Shevchenko — gestalt therapist, on the thought-feeling-body triad',
    medium: 'podcast',
    minutes: 5,
    hook: 'When the feeling has no name, the body finds a substitute for what you actually needed.',
    thesis:
      'Thoughts, feelings and body are treated as one interconnected organism: ignore one part and another compensates. Someone disconnected from their feelings starts explaining decisions rationally — I just need a rest — while the body takes its share through compulsive spending or eating, and the real need is replaced with a substitute.',
    ideas: [
      {
        name: 'Where the vocabulary comes from',
        body: 'A child does not know the names of their internal states; an adult names them on their behalf — I can see you are upset, I can see you are angry — and through that a vocabulary of feeling is built early. The adult also acts as a container, temporarily holding part of the affect because the child cannot yet carry it alone.',
      },
      {
        name: 'Naming lowers the temperature',
        body: 'When a feeling stays undifferentiated and unspoken its intensity runs high; saying it — I am angry, this infuriates me — legitimises it and lowers the heat. Immediately usable, and it requires no analysis of where the feeling came from.',
      },
      {
        name: 'Inventory of beliefs',
        body: 'Beliefs absorbed uncritically from significant adults need periodic review, like going through a wardrobe: which of these are still current and have become values, and which are being kept out of inertia? The worked example is an assumption about qualifications and job security that no longer matches how fast skills now turn over.',
      },
      {
        name: 'Two reasons people arrive',
        body: 'On her estimate the large majority arrive because they are already at the bottom and cannot manage. The smaller group are broadly fine and want the quality raised — deeper relationships, more freedom. Framing the second as legitimate is the useful part, since it is the one people talk themselves out of.',
      },
      {
        name: 'Small decisions train the large ones',
        body: 'Asking "do I actually want this?" on ordinary daily choices is offered as the practice that builds the capacity to recognise a desire at all — before it is needed for something that matters.',
      },
    ],
    notes: [
      'A reframe offered for hard experience: move from "what was this for" in the sense of blame to "what is this for" in the sense of use — presented as the working alternative to a victim position.',
      'The source also advances a causal claim linking suppressed aggression to a specific category of illness. It rests on five consecutive clients — her own description — rather than on any epidemiological basis, and it is not carried here; a medical claim from a self-selected sample of five is the kind of thing this library exists not to repeat.',
      'A practising gestalt therapist speaking from clinical work in a long unstructured conversation. Several positions are delivered with conversational confidence but are the personal view of one practitioner rather than consensus, and one physiological explanation is a simplified popularisation useful as metaphor rather than as mechanism.',
    ],
    practices: [
      'Say the feeling out loud before deciding anything while it is running.',
      'Run the wardrobe check on your beliefs: still mine, or kept out of inertia?',
      'Ask "do I want this?" on small daily choices, so the answer is available on large ones.',
      'Treat wanting the quality raised as a sufficient reason, not a luxury.',
    ],
    habits: [
      { id: 'd_review', because: 'The inventory only happens if it has a slot — beliefs kept out of inertia are exactly the ones that never come up on their own.' },
      { id: 'b_morningjoy', because: 'A small deliberate pleasure is the "do I actually want this?" question in its daily, low-stakes form.' },
      { id: 'f_thanks', because: 'Naming something specific out loud is the same muscle as naming a feeling, trained where the stakes are low.' },
    ],
    quests: [
      { id: 'q_hardconversation', because: 'The substitute appears when the real need goes unspoken — and the unspoken need is usually addressed to a particular person.' },
      { id: 'q_wheel', because: 'The inventory of inherited beliefs is a whole-life audit, which is what scoring the wheel actually is.' },
    ],
    vaultSource: 'Social & friends / Resource / Шевченко — Триада мысли-чувства-тело, инвентаризация установок и жетон вместо цели',
  },
];

/** Entries filed under a sector, in listing order. */
export function libraryFor(attr: AttributeKey): LibraryEntry[] {
  return LIBRARY.filter(e => e.attr === attr);
}

export function libraryEntry(slug: string): LibraryEntry | undefined {
  return LIBRARY.find(e => e.slug === slug);
}

/** XP/Gold for finishing an entry. One-time per entry — the library is finite by design. */
export const LIBRARY_READ_REWARD = { xp: 10, gold: 3 };
