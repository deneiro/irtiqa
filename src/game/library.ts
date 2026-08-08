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
