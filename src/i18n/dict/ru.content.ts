/**
 * Russian display text for everything in game/constants.ts.
 *
 * Game vocabulary is kept close to what Russian-speaking players actually say:
 * XP and HP stay as-is (translating them to «опыт»/«ОЗ» reads as a manual, not a
 * game), while Gold, quests, habits and streaks take their normal Russian words.
 */
import type { Dict } from '..';
import { plural } from '..';

export const RU_CONTENT: Dict = {
  // ---------- Атрибуты ----------
  'attr.health.label': 'Здоровье',
  'attr.health.short': 'ЗДР',
  'attr.friends.label': 'Друзья',
  'attr.friends.short': 'ДРЗ',
  'attr.family.label': 'Семья',
  'attr.family.short': 'СЕМ',
  'attr.money.label': 'Деньги',
  'attr.money.short': 'ДЕН',
  'attr.career.label': 'Карьера',
  'attr.career.short': 'КАР',
  'attr.spirituality.label': 'Духовность',
  'attr.spirituality.short': 'ДУХ',
  'attr.development.label': 'Развитие',
  'attr.development.short': 'РАЗ',
  'attr.brightness.label': 'Яркость',
  'attr.brightness.short': 'ЯРК',

  // ---------- Классы ----------
  'class.bard.name': 'Бард',
  'class.bard.tagline': 'Мне нужно быть замеченным — признание важнее золота.',
  'class.bard.radical': 'R1 · Артист',
  'class.bard.perk': 'Дополнительное золото за каждую отметку привычки — зритель ведёт вас вперёд',
  'class.bard.signature': 'Сцена — публичные, замеченные действия бьют дальше; первое за день поднимает вас',

  'class.warden.name': 'Страж',
  'class.warden.tagline': 'Есть правильный путь, и исключений нет.',
  'class.warden.radical': 'R2 · Систематизатор',
  'class.warden.perk': 'Раз в неделю одна серия от 3 дней переживает пропуск — бесплатно и автоматически',
  'class.warden.signature': 'Устав — защита возвращается каждую неделю, и ни одно исключение не стоит вам серии',

  'class.sovereign.name': 'Владыка',
  'class.sovereign.tagline': 'Одна цель, и всё служит ей.',
  'class.sovereign.radical': 'R3 · Основатель',
  'class.sovereign.perk': 'Приоритетные квесты — ваш Великий Труд — приносят намного больше XP',
  'class.sovereign.signature': 'Великий Труд — серию кампании не разорвать одним пропуском',

  'class.healer.name': 'Целитель',
  'class.healer.tagline': 'Человек передо мной — на первом месте.',
  'class.healer.radical': 'R4 · Эмпат',
  'class.healer.perk': 'Действия, связанные с живым человеком (закрытие долгов, поддержание связей), приносят больше',
  'class.healer.signature': 'Узы — боссы Семьи и Друзей падают с меньшего числа ударов',

  'class.magician.name': 'Маг',
  'class.magician.tagline': 'Все смотрят на это неправильно.',
  'class.magician.radical': 'R5 · Изобретатель',
  'class.magician.perk': 'Дневник и рефлексия приносят намного больше XP — думать на бумаге и есть работа',
  'class.magician.signature': 'Новизна — первое действие в любой новой области приносит вдвое; исследование считается работой',

  'class.herald.name': 'Вестник',
  'class.herald.tagline': 'Двигаться, соединять, начинать заново.',
  'class.herald.radical': 'R6 · Искра',
  'class.herald.perk': 'Каждая отметка привычки приносит дополнительный XP — движение само себе награда',
  'class.herald.signature': 'Полный спектр — глубже импульс идеальных дней; легче дорога назад после срыва',

  'class.sentinel.name': 'Часовой',
  'class.sentinel.tagline': 'Притормози. Это безопасно?',
  'class.sentinel.radical': 'R7 · Якорь',
  'class.sentinel.perk': 'Соблюдение бюджета приносит дополнительный XP — осторожность вознаграждается',
  'class.sentinel.signature': 'Резерв — отложенное золото создаёт Щит, поглощающий урон по HP',

  // ---------- Ранги ----------
  'rank.rankSeeker': 'Искатель',
  'rank.rankNovice': 'Новичок',
  'rank.rankApprentice': 'Ученик',
  'rank.rankAdept': 'Адепт',
  'rank.rankJourneyman': 'Подмастерье',
  'rank.rankExpert': 'Эксперт',
  'rank.rankVeteran': 'Ветеран',
  'rank.rankMaster': 'Мастер',
  'rank.rankGrandmaster': 'Гроссмейстер',
  'rank.rankLegend': 'Легенда',

  // ---------- Темы ----------
  'theme.midnight.name': 'Полночь',
  'theme.midnight.desc': 'По умолчанию: глубокая космическая синь и фиолетовая магия.',
  'theme.skeuo.name': 'Скевоморфизм',
  'theme.skeuo.desc': 'Кожа, прошивка и объёмные кнопки. Настоящие материалы.',
  'theme.parchment.name': 'Пергамент',
  'theme.parchment.desc': 'Состаренная бумага, чернила и свет свечи. Классическое фэнтези.',
  'theme.neon.name': 'Неоновая сетка',
  'theme.neon.desc': 'Свечение киберпанк-терминала. Подключайтесь.',

  // ---------- Предметы Рынка ----------
  'item.potion_s.name': 'Малое зелье здоровья',
  'item.potion_s.desc': 'Восстанавливает 15 HP. Глоток храбрости — HP это индикатор, а не поводок, поэтому цена под стать небольшому утешению.',
  'item.potion_m.name': 'Среднее зелье здоровья',
  'item.potion_m.desc': 'Восстанавливает 35 HP. Разом убирает с полосы тяжёлые две недели.',
  'item.potion_l.name': 'Большое зелье здоровья',
  'item.potion_l.desc': 'Восстанавливает 75 HP. Стирает всё начисто — когда хочется, чтобы полоса совпадала с самочувствием.',
  'item.streak_shield.name': 'Щит серии',
  'item.streak_shield.desc': 'Автоматически спасает вашу самую длинную серию (от 3 дней) при следующем пропуске. Серия остаётся нетронутой — именно это вы и покупаете.',
  'item.habit_pardon.name': 'Помилование привычки',
  'item.habit_pardon.desc': 'Дотянуться назад и отменить один пропущенный день: разорванная серия срастается, будто пропуска не было, и HP возвращается вместе с ней.',
  'item.indulgence.name': 'Индульгенция',
  'item.indulgence.desc': 'Активируйте, чтобы простить следующий срыв на вредной привычке — серия уцелеет, ничего не запишется против вас.',
  'item.ghost_day.name': 'Призрачный день',
  'item.ghost_day.desc': 'Заморозить целый день — сегодня, завтра или любую будущую дату. Без штрафов, серии на паузе. Для настоящей болезни и поездок.',
  'item.feather.name': 'Перо времени',
  'item.feather.desc': 'Разблокирует одну закрытую запись дневника для единственной правки.',
  'item.focus_unlock.name': 'Разблокировка фокуса',
  'item.focus_unlock.desc': 'Навсегда позволяет отмечать ДВА приоритетных квеста одновременно вместо одного.',
  'item.attr_boost.name': 'Усиление атрибута',
  'item.attr_boost.desc': '+50% XP на следующие 5 действий, приносящих опыт.',
  'item.identity_scroll.name': 'Свиток личности',
  'item.identity_scroll.desc': 'Перепишите себя: смените имя персонажа и/или класс.',

  // ---------- Уровни достижений ----------
  'tier.bronze': 'Бронза',
  'tier.silver': 'Серебро',
  'tier.gold': 'Золото',
  'tier.platinum': 'Платина',

  // ---------- Семейства достижений ----------
  'ach.level.family': 'Уровни',
  'ach.level.name.0': 'Первая искра',
  'ach.level.name.1': 'Восходящая звезда',
  'ach.level.name.2': 'Сила природы',
  'ach.level.name.3': 'Высшее существо',
  'ach.level.desc': v => `Достичь ${v.n} уровня`,

  'ach.checkins.family': 'Дисциплина',
  'ach.checkins.name.0': 'Первый шаг',
  'ach.checkins.name.1': 'Формирующий привычки',
  'ach.checkins.name.2': 'Железный распорядок',
  'ach.checkins.name.3': 'Несокрушимый',
  'ach.checkins.desc': v =>
    `Отметить ${v.n} ${plural(Number(v.n), 'привычку', 'привычки', 'привычек')}`,

  'ach.bestStreak.family': 'Серии',
  'ach.bestStreak.name.0': 'Растопка',
  'ach.bestStreak.name.1': 'В огне',
  'ach.bestStreak.name.2': 'Инферно',
  'ach.bestStreak.name.3': 'Вечное пламя',
  'ach.bestStreak.desc': v =>
    `Достичь серии в ${v.n} ${plural(Number(v.n), 'день', 'дня', 'дней')}`,

  'ach.questsCompleted.family': 'Квесты',
  'ach.questsCompleted.name.0': 'Первая кровь',
  'ach.questsCompleted.name.1': 'Искатель приключений',
  'ach.questsCompleted.name.2': 'Охотник за квестами',
  'ach.questsCompleted.name.3': 'Убийца драконов',
  'ach.questsCompleted.desc': v =>
    `Завершить ${v.n} ${plural(Number(v.n), 'квест', 'квеста', 'квестов')}`,

  'ach.sessionHours.family': 'Глубокая работа',
  'ach.sessionHours.name.0': 'На смене',
  'ach.sessionHours.name.1': 'Работяга',
  'ach.sessionHours.name.2': 'Машина',
  'ach.sessionHours.name.3': 'Повелитель времени',
  'ach.sessionHours.desc': v =>
    `Отработать ${v.n} ${plural(Number(v.n), 'час', 'часа', 'часов')} в сессиях квестов`,

  'ach.journalCount.family': 'Рефлексия',
  'ach.journalCount.name.0': 'Дорогой дневник',
  'ach.journalCount.name.1': 'Летописец',
  'ach.journalCount.name.2': 'Мудрец',
  'ach.journalCount.name.3': 'Оракул',
  'ach.journalCount.desc': v =>
    `Написать ${v.n} ${plural(Number(v.n), 'запись', 'записи', 'записей')} в дневнике`,

  'ach.contacts.family': 'Связи',
  'ach.contacts.name.0': 'Не один',
  'ach.contacts.name.1': 'Круг',
  'ach.contacts.name.2': 'Сообщество',
  'ach.contacts.name.3': 'Узел',
  'ach.contacts.desc': v =>
    `Добавить ${v.n} ${plural(Number(v.n), 'контакт', 'контакта', 'контактов')}`,

  'ach.debtsSettled.family': 'Чистый лист',
  'ach.debtsSettled.name.0': 'Рассчитался',
  'ach.debtsSettled.name.1': 'Надёжный',
  'ach.debtsSettled.name.2': 'Честная душа',
  'ach.debtsSettled.name.3': 'Легенда без долгов',
  'ach.debtsSettled.desc': v =>
    `Закрыть ${v.n} ${plural(Number(v.n), 'долг', 'долга', 'долгов')}`,

  'ach.txs.family': 'Бухгалтерия',
  'ach.txs.name.0': 'Копейка учтена',
  'ach.txs.name.1': 'Хранитель книги',
  'ach.txs.name.2': 'Бухгалтер',
  'ach.txs.name.3': 'Властелин монет',
  'ach.txs.desc': v =>
    `Записать ${v.n} ${plural(Number(v.n), 'операцию', 'операции', 'операций')}`,

  'ach.goldEarned.family': 'Богатство',
  'ach.goldEarned.name.0': 'Первые монеты',
  'ach.goldEarned.name.1': 'Полный кошель',
  'ach.goldEarned.name.2': 'Сундук с сокровищами',
  'ach.goldEarned.name.3': 'Драконья груда',
  'ach.goldEarned.desc': v => `Заработать ${v.n} золота за всё время`,

  'ach.itemsBought.family': 'Покупки',
  'ach.itemsBought.name.0': 'Первая покупка',
  'ach.itemsBought.name.1': 'Постоянный клиент',
  'ach.itemsBought.name.2': 'Меценат',
  'ach.itemsBought.name.3': 'Кит',
  'ach.itemsBought.desc': v =>
    `Купить ${v.n} ${plural(Number(v.n), 'предмет', 'предмета', 'предметов')} на Рынке`,

  'ach.itemsUsed.family': 'Алхимия',
  'ach.itemsUsed.name.0': 'До дна',
  'ach.itemsUsed.name.1': 'Практик',
  'ach.itemsUsed.name.2': 'Алхимик',
  'ach.itemsUsed.name.3': 'Архимаг',
  'ach.itemsUsed.desc': v =>
    `Использовать ${v.n} ${plural(Number(v.n), 'предмет', 'предмета', 'предметов')}`,

  'ach.quickTasks.family': 'Поручения',
  'ach.quickTasks.name.0': 'Отмечено',
  'ach.quickTasks.name.1': 'Деятель',
  'ach.quickTasks.name.2': 'Надсмотрщик',
  'ach.quickTasks.name.3': 'Исполнитель',
  'ach.quickTasks.desc': v =>
    `Выполнить ${v.n} ${plural(Number(v.n), 'быструю задачу', 'быстрые задачи', 'быстрых задач')}`,

  'ach.minAttrLevel.family': 'Баланс',
  'ach.minAttrLevel.name.0': 'Пробуждение',
  'ach.minAttrLevel.name.1': 'Гармония',
  'ach.minAttrLevel.name.2': 'Равновесие',
  'ach.minAttrLevel.name.3': 'Просветление',
  'ach.minAttrLevel.desc': v => `Поднять каждый атрибут до ${v.n} уровня`,

  'ach.bossesDefeated.family': 'Охотник на боссов',
  'ach.bossesDefeated.name.0': 'Первый удар',
  'ach.bossesDefeated.name.1': 'Убийца',
  'ach.bossesDefeated.name.2': 'Немезида',
  'ach.bossesDefeated.name.3': 'Богоборец',
  'ach.bossesDefeated.desc': v =>
    `Победить ${v.n} ${plural(Number(v.n), 'еженедельного босса', 'еженедельных боссов', 'еженедельных боссов')}`,

  // ---------- Колесо жизни ----------
  'wheel.health.0': 'Я двигаюсь или тренируюсь несколько раз в неделю',
  'wheel.health.1': 'Я высыпаюсь в большинстве случаев',
  'wheel.health.2': 'У меня нет проблемы со здоровьем, которую я игнорирую',
  'wheel.health.3': 'Я питаюсь так, что меня это устраивает',
  'wheel.health.4': 'Меня устраивают мой вес и уровень энергии',

  'wheel.friends.0': 'У меня есть друзья, с которыми я регулярно вижусь или общаюсь',
  'wheel.friends.1': 'Я проводил время с друзьями на прошлой неделе',
  'wheel.friends.2': 'Есть человек, которому я могу позвонить, если случится беда',
  'wheel.friends.3': 'Я не чувствую одиночества',
  'wheel.friends.4': 'Меня радуют люди вокруг меня',

  'wheel.family.0': 'Я регулярно общаюсь с семьёй',
  'wheel.family.1': 'У меня хорошие отношения с семьёй',
  'wheel.family.2': 'У меня есть партнёр',
  'wheel.family.3': 'У меня нет серьёзных проблем с партнёром',
  'wheel.family.4': 'Меня устраивает моя личная жизнь',

  'wheel.money.0': 'Моего дохода хватает на ежемесячные нужды',
  'wheel.money.1': 'У меня нет долгов, которые меня давят',
  'wheel.money.2': 'У меня есть сбережения',
  'wheel.money.3': 'Я не беспокоюсь о деньгах от недели к неделе',
  'wheel.money.4': 'Я могу покупать мелочи, не раздумывая подолгу',

  'wheel.career.0': 'Сейчас у меня есть работа или своё дело',
  'wheel.career.1': 'Мне нравится то, чем я занимаюсь',
  'wheel.career.2': 'Я двигаюсь вперёд, а не стою на месте',
  'wheel.career.3': 'Я знаю, каким будет мой следующий шаг',
  'wheel.career.4': 'Я доволен своей карьерой сейчас',

  'wheel.spirituality.0': 'У меня есть вера или система ценностей, по которой я живу',
  'wheel.spirituality.1': 'Я регулярно молюсь, медитирую или размышляю',
  'wheel.spirituality.2': 'Я регулярно что-то создаю (пишу, рисую, музыка, мастерю)',
  'wheel.spirituality.3': 'Я нахожу время для этой стороны жизни',
  'wheel.spirituality.4': 'Чаще всего я спокоен и собран',

  'wheel.development.0': 'Недавно я узнал что-то новое',
  'wheel.development.1': 'Сейчас я читаю книгу или прохожу курс',
  'wheel.development.2': 'У меня есть цели, к которым я иду',
  'wheel.development.3': 'За последние месяцы я улучшил какой-то навык',
  'wheel.development.4': 'Я чувствую, что расту как личность',

  'wheel.brightness.0': 'Я делаю вещи просто ради удовольствия, а не ради пользы',
  'wheel.brightness.1': 'На этой неделе я много смеялся',
  'wheel.brightness.2': 'У меня есть хобби, которые мне нравятся',
  'wheel.brightness.3': 'Мои дни разнообразны, а не однообразны',
  'wheel.brightness.4': 'Недавно у меня был новый или яркий опыт',

  // ---------- Сроки квестов ----------
  'questDur.1d': '1 день',
  'questDur.1w': '1 неделя',
  'questDur.2w': '2 недели',
  'questDur.1m': '1 месяц',
  'questDur.3m': '3 месяца',
  'questDur.6m': '6 месяцев',
  'questDur.1y': '1 год',
  'questDur.none': 'Без срока',

  // ---------- Вопросы для рефлексии ----------
  'reflect.0': 'Что сегодня прошло хорошо?',
  'reflect.1': 'Что сегодня забрало у вас силы?',
  'reflect.2': 'За что вы благодарны прямо сейчас?',
  'reflect.3': 'Что вы сделаете иначе завтра?',
  'reflect.4': 'Чему вы сегодня научились?',
  'reflect.5': 'Кто сделал ваш день лучше и как?',
  'reflect.6': 'Чего вы сегодня избежали, хотя стоило встретиться с этим?',
  'reflect.7': 'Какая маленькая победа достойна праздника?',
  'reflect.8': 'Если бы сегодняшний день повторялся вечно, что вы изменили бы первым?',

  // ---------- Архетипы личности ----------
  'archetype.hysteroid': 'Истероид',
  'archetype.epileptoid': 'Эпилептоид',
  'archetype.anxious': 'Тревожный',
  'archetype.emotive': 'Эмотив',
  'archetype.schizoid': 'Шизоид',
  'archetype.paranoid': 'Паранойяльный',
  'archetype.hyperthymic': 'Гипертим',

  // ---------- Группы контактов ----------
  'group.family': 'Семья',
  'group.relative': 'Родственник',
  'group.colleague': 'Коллега',
  'group.friend': 'Друг',
  'group.close': 'Близкий',

  // ---------- Виджеты панели ----------
  'widget.chronicle': 'Хроника',
  'widget.dailyContract': 'Три дела дня',
  'widget.weeklyBoss': 'Босс недели',
  'widget.todayHabits': 'Привычки на сегодня',
  'widget.lifeBalance': 'Баланс жизни',
  'widget.attributes': 'Атрибуты',
  'widget.quickTasks': 'Быстрые задачи',
  'widget.quests': 'Квесты',
  'widget.journal': 'Дневник',
  'widget.calendar': 'Календарь',

  // ---------- Категории финансов ----------
  'cat.Food': 'Еда',
  'cat.Housing': 'Жильё',
  'cat.Transport': 'Транспорт',
  'cat.Health': 'Здоровье',
  'cat.Entertainment': 'Развлечения',
  'cat.Shopping': 'Покупки',
  'cat.Subscriptions': 'Подписки',
  'cat.Education': 'Образование',
  'cat.Debt': 'Долг',
  'cat.Other': 'Другое',
  'cat.Salary': 'Зарплата',
  'cat.Business': 'Бизнес',
  'cat.Gift': 'Подарок',
  'cat.Other income': 'Прочий доход',
  'cat.Transfer': 'Перевод',

  // ---------- Косметика ----------
  'cosmetic.frame_frost.name': 'Морозное кольцо',
  'cosmetic.frame_frost.desc': 'Тонкое кольцо зимнего света.',
  'cosmetic.frame_petal.name': 'Венок из лепестков',
  'cosmetic.frame_petal.desc': 'Нежные розовые цветы, всегда в сезон.',
  'cosmetic.frame_gilded.name': 'Золочёная рама',
  'cosmetic.frame_gilded.desc': 'Чистое золото. Заслужено, а не куплено.',
  'cosmetic.frame_ember.name': 'Кольцо углей',
  'cosmetic.frame_ember.desc': 'Тлеет тихо, как сохранённая серия.',
  'cosmetic.frame_shadow.name': 'Аура тени',
  'cosmetic.frame_shadow.desc': 'Тёмный пульс неустанной дисциплины.',
  'cosmetic.frame_laurel.name': 'Лавры чемпиона',
  'cosmetic.frame_laurel.desc': 'Двойное кольцо для тех, кто не останавливается.',
  'cosmetic.title_wanderer.name': 'Странник',
  'cosmetic.title_wanderer.desc': 'Для тех, кто ещё ищет свою дорогу.',
  'cosmetic.title_early.name': 'Ранняя пташка',
  'cosmetic.title_early.desc': 'День принадлежит тем, кто встречает его первым.',
  'cosmetic.title_unbroken.name': 'Несломленный',
  'cosmetic.title_unbroken.desc': 'Согнут — возможно. Сломлен — никогда.',
  'cosmetic.title_relentless.name': 'Неустанный',
  'cosmetic.title_relentless.desc': 'Остановка никогда не рассматривалась.',
  'cosmetic.title_flamekeeper.name': 'Хранитель пламени',
  'cosmetic.title_flamekeeper.desc': 'Страж огня идеальных дней.',
  'cosmetic.banner_dawn.name': 'Знамя рассвета',
  'cosmetic.banner_dawn.desc': 'Первый свет над панелью.',
  'cosmetic.banner_sakura.name': 'Знамя сакуры',
  'cosmetic.banner_sakura.desc': 'Лепестки, летящие сквозь ваши утра.',
  'cosmetic.banner_aurora.name': 'Знамя сияния',
  'cosmetic.banner_aurora.desc': 'Северное сияние для северной дисциплины.',
  'cosmetic.banner_dragonfire.name': 'Знамя драконьего огня',
  'cosmetic.banner_dragonfire.desc': 'Сокровище под охраной. Сокровище ваше.',

  'rarity.common': 'Обычное',
  'rarity.rare': 'Редкое',
  'rarity.epic': 'Эпическое',

  // ---------- Слоты косметики ----------
  'slot.frame': 'Рамка',
  'slot.title': 'Титул',
  'slot.banner': 'Знамя',

  // ---------- Единицы ----------
  'unit.day': v => plural(Number(v.n), 'день', 'дня', 'дней'),
  'unit.hour': v => plural(Number(v.n), 'час', 'часа', 'часов'),
  'unit.min': v => plural(Number(v.n), 'минута', 'минуты', 'минут'),
};
