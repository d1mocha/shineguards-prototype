# -*- coding: utf-8 -*-
"""Generates static page shells for the Shine Guards prototype.

Every shell carries the SEO head (title, description, canonical, hreflang,
Open Graph) and <meta name="sg"> that assets/site.js reads to render the page.
URLs mirror production: /{city}/{lang}/services/{private|business}/{slug}-in-{city}/
and /{city}/{lang}/locations/{slug}-in-{city}/ for business objects; five languages —
ua (the source of every text), ru, en, de, sk. A page in another language loads
assets/i18n/{lang}.js (Ukrainian text → translation), written here from {lang}.json.

Run:  python _build.py           → page shells next to this script (dev, _serve.py)
      python _build.py --share   → _share/shineguards-prototype.html (the whole site
                                   in one file, to send to people) and _share/site/
                                   (clean folder for static hosting, noindex)
      python _build.py --keys    → the Ukrainian SEO texts as JSON (for _qa/i18n_keys.cjs)
"""
import hashlib
import base64
import html
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://www.shineguards.com'
OG_IMAGE = 'https://res.cloudinary.com/dbiy7qyfe/image/upload/w_1200,h_630,c_fill,g_faces/v1781018440/ABOUT_US_ROUND_e913ada099.jpg'

LANGS = ('ua', 'ru', 'en', 'de', 'sk')
# published languages: --share builds only these, and the language menu opens the others on shineguards.com
# (the local build makes every language, to check a translation before it is published)
READY = ('ua',)
HTML_LANG = {'ua': 'uk', 'ru': 'ru', 'en': 'en', 'de': 'de', 'sk': 'sk'}
OG_LOCALE = {'ua': 'uk_UA', 'ru': 'ru_RU', 'en': 'en_GB', 'de': 'de_AT', 'sk': 'sk_SK'}

CITIES = {
    #            name         locative      "from" prices (basic, general, deep)  min order
    # general and deep include the extra cleaner-hours (PKG_EXTRA_HOURS in data.js): +32,50 € / +65 €, SK +18 € / +36 €
    'vienna':     ('Відень',     'Відні',      (120, 203, 325), 108),
    'graz':       ('Грац',       'Граці',      (100, 173, 270), 108),
    'munich':     ('Мюнхен',     'Мюнхені',    (120, 203, 325), 108),
    'bratislava': ('Братислава', 'Братиславі', (65, 93, 126), 70),
}
EXTRA_HOUR = {'vienna': 32.5, 'graz': 32.5, 'munich': 32.5, 'bratislava': 18}
RENO_HOUR = {'vienna': 36, 'graz': 36, 'munich': 36, 'bratislava': 21.5}

PRIVATE = {
    'basic':   'bazove-pribirannya',
    'general': 'generalne-pribirannya',
    'deep':    'gliboke-pribirannya',
    'extras':  'dodatkovi-poslugi',
    'chem':    'himchistka-mebliv-i-kilimiv',
    'windows': 'mittya-vikon',
    'moveout': 'pribirannya-zayizd-viyizd',
    'reno':    'pribirannya-pislya-remontu',
}
BUSINESS = {
    'klining': 'klining-dlya-biznesu',
    'basic':   'bazove-pribirannya',
    'general': 'generalne-pribirannya',
    'deep':    'gliboke-pribirannya',
    'windows': 'mittya-vikon',
    'airbnb':  'pribirannya-airbnb-ta-korotkostrokovoyi-orendi',
    'extras':  'dodatkovi-poslugi',
    'moveout': 'pribirannya-zayizd-viyizd',
    'reno':    'pribirannya-pislya-remontu',
}

# Business objects — own pages, as on shineguards.com: /{city}/{lang}/locations/{slug}-in-{city}
# The texts are templates: {name} — the city («Відень»), {in_city} — «у Відні» (each language says it its own way)
OBJECTS = {
    #               slug                                          title                                        description
    'hotels':      ('goteli-apartamenti-ta-airbnb',              'Прибирання готелів і Airbnb {name}',        'Прибирання апартаментів, Airbnb і готелів {in_city}: між гостями та під час проживання, заміна білизни, витратні матеріали, фото до/після й повідомлення про пошкодження. Пропозиція за 24 години.'),
    'offices':     ('ofisi-ta-kovorkingi',                       'Прибирання офісів {in_city}',               'Регулярне прибирання офісів і коворкінгів {in_city}: до або після робочого дня, закріплена команда, договір. Комерційна пропозиція за 24 години.'),
    'shops':       ('magazini-butiki-ta-shourumi',               'Прибирання магазинів і шоурумів {name}',    'Прибирання магазинів, бутиків і шоурумів {in_city}: торговий зал, вітрини, дзеркала, примірочні та службові зони — до відкриття або після закриття.'),
    'restaurants': ('restorani-kafe-ta-bari',                    'Прибирання ресторанів і кафе {name}',       'Прибирання ресторанів, кафе та барів {in_city}: зал, бар, санвузли, службові зони та кухня — увесь заклад або окремі зони. Пропозиція за 24 години.'),
    'kitchens':    ('profesijni-kuhni-ta-gastronomiya',          'Прибирання професійних кухонь {name}',      'Прибирання професійних кухонь {in_city}: регулярне та генеральне, знежирення обладнання й плит — з урахуванням вимог HACCP.'),
    'gyms':        ('fitnes-czentri-ta-sportzali',               'Прибирання фітнес-центрів {name}',          'Прибирання фітнес-центрів і спортзалів {in_city}: тренажерні зали, роздягальні, душові, санвузли й рецепція — за графіком клубу, а за потреби протягом дня.'),
    'medical':     ('medichni-czentri-kliniki-ta-stomatologiyi', 'Прибирання клінік і стоматологій {name}',   'Прибирання медичних центрів, клінік і стоматологій {in_city}: кабінети, зони очікування, санвузли — за погодженим планом гігієни й дезінфекції закладу. Ціна після огляду.'),
    'cars':        ('avtosaloni-ta-servisni-czentri',            'Прибирання автосалонів і СТО {name}',       'Прибирання автосалонів і сервісних центрів {in_city}: шоуруми, скляні поверхні, зони очікування, офіси, санвузли та сервісні приміщення — за графіком обʼєкта.'),
    'bizcenters':  ('biznes-czentri',                            'Прибирання бізнес-центрів {name}',          'Прибирання бізнес-центрів {in_city}: холи, ліфти, сходи, санвузли й паркінг за графіком будівлі та за договором.'),
    'cinemas':     ('kinoteatri-teatri-ta-rozvazhalni-zoni',     'Прибирання кінотеатрів і театрів {name}',   'Прибирання кінотеатрів, театрів і розважальних зон {in_city}: зали між сеансами, фоє, каси, гардероби й фудкорти.'),
    'beauty':      ('saloni-krasi-spa-ta-barbershopi',           'Прибирання салонів краси та SPA {name}',    'Прибирання салонів краси, SPA та барбершопів {in_city}: робочі місця майстрів, кушетки, SPA-зони й гігієнічна обробка поверхонь.'),
    'malls':       ('torgovi-czentri',                           'Прибирання торгових центрів {name}',        'Прибирання торгових центрів {in_city}: галереї, атріуми, фудкорти й ескалатори, зокрема нічні зміни.'),
}

# The SEO texts of the pages: (title, description) templates in Ukrainian — the keys of the dictionaries too.
# {name} city, {in_city} «у Відні», {fb} {fg} {fd} the «from» prices, {min} the minimum order, {reno} € per hour after
# renovation, {net} the price wording for business. « | Shine Guards» is added to every title.
PRIVATE_SEO = {
    'basic': ('Базове прибирання квартири {name}',
              'Базове прибирання квартири {in_city} від {fb} € з ПДВ: підлога, пил, кухня й ванна. Розрахунок онлайн за 30 секунд, знижка до 7% на регулярне прибирання, оплата після прибирання.'),
    'general': ('Генеральне прибирання {name}',
                'Генеральне прибирання квартири {in_city} від {fg} €: усе з базового пакета, вікна зсередини, духовка й холодильник усередині. Фіксована ціна за площею, розрахунок онлайн.'),
    'deep': ('Глибоке прибирання {name}',
             'Глибоке прибирання квартири {in_city} від {fd} €: шафи й техніка всередині, вікна з обох боків, складний жир і вапняний наліт. Фіксована ціна за площею, розрахунок онлайн.'),
    'extras': ('Окремі послуги прибирання {name}',
               'Миття холодильника й духовки, прибирання балкона, прасування, хімчистка дивана й матраца {in_city} — окремо, без прибирання квартири. Мінімальне замовлення {min} €.'),
    'chem': ('Хімчистка меблів і килимів {name}',
             'Хімчистка диванів, крісел, матраців і килимів {in_city} у вас удома: фіксована ціна за кожен предмет, розрахунок онлайн. Мінімальне замовлення {min} €.'),
    'windows': ('Миття вікон {name}',
                'Миття вікон {in_city}: скло, рами, підвіконня й відливи. Вкажіть кількість вікон — калькулятор покаже орієнтовну ціну. Мінімальне замовлення {min} €.'),
    'moveout': ('Прибирання при переїзді {name}',
                'Прибирання перед заїздом або після виїзду {in_city}: кухня й техніка, санвузли, внутрішні поверхні та важкодоступні місця. Фіксована ціна за площею, розрахунок онлайн.'),
    'reno': ('Прибирання після ремонту {in_city}',
             'Прибирання після ремонту {in_city}: будівельний пил і сліди будівельних матеріалів, миття вікон і сантехніки. Оцінка за фото, {reno} € за годину роботи одного клінера.'),
}
BUSINESS_SEO = {
    'klining': ('Клінінг для бізнесу {name}',
                'Прибирання офісів, ресторанів, спортзалів і апартаментів {in_city} за договором: персональний менеджер, документи для бухгалтерії, {net}. Пропозиція за 24 години.'),
    'basic': ('Регулярне прибирання офісів {name}',
              'Регулярне прибирання офісів і комерційних приміщень {in_city} за графіком — до або після робочого дня. Розрахунок онлайн, індивідуальна ставка для великих обсягів.'),
    'general': ('Генеральне прибирання офісу {name}',
                'Разове генеральне прибирання офісу чи комерційного приміщення {in_city}: вікна зсередини, кухонна техніка, двері, плінтуси. Оцінка онлайн або огляд обʼєкта.'),
    'deep': ('Глибоке прибирання для бізнесу {name}',
             'Глибоке прибирання комерційних приміщень {in_city}: шафи й техніка всередині, жир і накип, вікна з обох боків. Перед відкриттям, після сезону або здачі обʼєкта.'),
    'windows': ('Миття вікон для бізнесу {name}',
                'Миття офісних вікон, вітрин, скляних фасадів і перегородок {in_city} — разово або за регулярним графіком. Орієнтовна ціна онлайн, точна — після фото чи огляду.'),
    'airbnb': ('Прибирання апартаментів для бізнесу {name}',
               'Прибирання апартаментів і Airbnb {in_city} для керуючих компаній: чек-лист, білизна, аудит обʼєкта. Ціна за площею, знижка до 10% від кількості обʼєктів.'),
    'extras': ('Додаткові послуги для бізнесу {in_city}',
               'Жалюзі, догляд за рослинами, хімчистка меблів і килимів для офісів {in_city}. Ставки фіксуються в договорі та додаються до регулярного прибирання.'),
    'moveout': ('Прибирання при переїзді офісу {name}',
                'Прибирання офісу перед заїздом або після виїзду {in_city}: робочі зони, кухні, санвузли, вікна. Пропозиція протягом 24 годин після огляду.'),
    'reno': ('Прибирання після ремонту для бізнесу {name}',
             'Прибирання після ремонту офісів, магазинів, ресторанів і фітнес-центрів {in_city}: будівельний пил, скло, санвузли — до дати відкриття. Оцінка за фото або огляд, пропозиція за 24 години.'),
}
NET = ('ціни без ПДВ', 'прозорі ставки')  # business prices: Austria and Germany are netto, Slovakia has no VAT note
HOME_SEO = ('Клінінгова компанія {name}',
            'Професійне прибирання квартир і будинків {in_city} від {fb} €: фіксована ціна за площею, розрахунок онлайн за 30 секунд, оплата після прибирання, рейтинг 4,9 у Google.')
LIST_SEO = ('Прибирання для дому {name}',
            'Усі послуги прибирання для дому {in_city}: базове, генеральне, глибоке, після ремонту, при переїзді, миття вікон і хімчистка меблів. Ціни від {fb} €.')
BIZ_HOME_SEO = ('Прибирання для бізнесу {name}',
                'Клінінг офісів, ресторанів, спортзалів і апартаментів {in_city}: розрахунок онлайн від 27 € за годину, договір, персональний менеджер і документи для бухгалтерії.')
GLOBAL = {
    'about': ('Про Shine Guards',
              'Shine Guards — клінінгова компанія у Відні, Граці, Мюнхені та Братиславі: власна команда клінерів, чек-листи, страхування відповідальності та рейтинг 4,9 у Google.'),
    'promotions': ('Акції та знижки',
                   'Знижки Shine Guards: до −7% на регулярне прибирання, −10% на перше замовлення, подарункові сертифікати та знижки для бізнесу за обсяг.'),
    'contacts': ('Контакти',
                 'Контакти Shine Guards: телефон +43 1 442 10 36, WhatsApp, Telegram, email. Менеджери на звʼязку щодня з 9:00 до 18:00, прибираємо 24/7.'),
    'partnership': ('Партнерство',
                    'Партнерська програма Shine Guards для рієлторів, керуючих компаній, агенцій і блогерів: рекомендуйте клінінг і отримуйте винагороду за кожне замовлення.'),
}


def seo_keys():
    """Every Ukrainian SEO text that the dictionaries translate."""
    out = []
    for t in list(PRIVATE_SEO.values()) + list(BUSINESS_SEO.values()) + [HOME_SEO, LIST_SEO, BIZ_HOME_SEO] + list(GLOBAL.values()):
        out += list(t)
    for _, title, desc in OBJECTS.values():
        out += [title, desc]
    return out + list(NET)


def load_i18n():
    """{lang: {Ukrainian text: translation}} from assets/i18n/{lang}.json (a missing text stays Ukrainian)."""
    out = {}
    for lang in LANGS[1:]:
        p = os.path.join(HERE, 'assets', 'i18n', f'{lang}.json')
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                out[lang] = json.load(f)
        else:
            out[lang] = {}
    return out


I18N = load_i18n()


def tr(lang, s):
    return s if lang == 'ua' else I18N[lang].get(s, s)


def data_slugs():
    """SLUGS and CITY_SLUG of data.js — the addresses of the pages in the other languages live there only."""
    js = ("const fs=require('fs'),vm=require('vm');"
          "const c={window:{},document:{documentElement:{}},location:{protocol:'http:',search:'',hash:'',pathname:'/'},navigator:{}};"
          "vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';globalThis.__o={SLUGS,CITY_SLUG};',c);"
          "process.stdout.write(JSON.stringify(c.__o));")
    r = subprocess.run(['node', '-e', js, os.path.join(HERE, 'assets', 'data.js')], capture_output=True, text=True, encoding='utf-8')
    if r.returncode:
        sys.exit('node could not read assets/data.js:\n' + r.stderr)
    o = json.loads(r.stdout)
    return o['SLUGS'], o['CITY_SLUG']


SLUGS, CITY_SLUG = data_slugs()


def slug(kind, id_, lang):
    """kind: p — service for home, b — for business, o — business object."""
    if lang == 'ua':
        return {'p': PRIVATE, 'b': BUSINESS}[kind][id_] if kind != 'o' else OBJECTS[id_][0]
    return SLUGS[lang][kind][id_]


def city_slug(city, lang):
    return CITY_SLUG.get(lang, {}).get(city, city)


def num(lang, n):
    s = ('%g' % n)
    return s if lang == 'en' else s.replace('.', ',')


def vals(city, lang):
    name, loc, (fb, fg, fd), minimum = CITIES[city]
    return {'name': tr(lang, name), 'in_city': tr(lang, 'у ' + loc), 'fb': fb, 'fg': fg, 'fd': fd, 'min': minimum,
            'reno': num(lang, RENO_HOUR[city]), 'net': tr(lang, NET[1] if city == 'bratislava' else NET[0])}


def seo(pair, lang, v=None):
    title, desc = (tr(lang, x) for x in pair)
    if v:
        title, desc = title.format(**v), desc.format(**v)
    return (f'{title} | Shine Guards', desc)


def page_list(lang):
    """(rel_dir, meta) for every page of the site in one language; the same order in every language."""
    out = []
    for city in CITIES:
        v, cs = vals(city, lang), city_slug(city, lang)
        out.append((f'{city}/{lang}', dict(seo=seo(HOME_SEO, lang, v), page='home', kind='private', city=city)))
        out.append((f'{city}/{lang}/services/private', dict(seo=seo(LIST_SEO, lang, v), page='list', kind='private', city=city)))
        out.append((f'{city}/{lang}/services/business', dict(seo=seo(BIZ_HOME_SEO, lang, v), page='home', kind='business', city=city)))
        for svc in PRIVATE:
            out.append((f'{city}/{lang}/services/private/{slug("p", svc, lang)}-in-{cs}', dict(seo=seo(PRIVATE_SEO[svc], lang, v), page='service', kind='private', svc=svc, city=city)))
        for svc in BUSINESS:
            out.append((f'{city}/{lang}/services/business/{slug("b", svc, lang)}-in-{cs}', dict(seo=seo(BUSINESS_SEO[svc], lang, v), page='service', kind='business', svc=svc, city=city)))
        for obj, (_, title, desc) in OBJECTS.items():
            out.append((f'{city}/{lang}/locations/{slug("o", obj, lang)}-in-{cs}', dict(seo=seo((title, desc), lang, v), page='object', kind='business', svc=obj, city=city)))
    for name, pair in GLOBAL.items():
        out.append((f'{lang}/{name}', dict(seo=seo(pair, lang), page=name)))
    return out


def all_pages(langs=LANGS):
    """Every page in the given languages: (rel_dir, meta, {lang: rel_dir of the same page in every language})."""
    per = {lang: page_list(lang) for lang in LANGS}
    out = []
    for i in range(len(per['ua'])):
        alts = {lang: per[lang][i][0] for lang in LANGS}
        for lang in langs:
            rel, meta = per[lang][i]
            out.append((rel, dict(meta, lang=lang), alts))
    return out


_BUILD = None


def i18n_js():
    """assets/i18n/{lang}.js — the dictionary as a script the pages load before data.js (written from {lang}.json)."""
    for lang in LANGS[1:]:
        p = os.path.join(HERE, 'assets', 'i18n', f'{lang}.js')
        text = '/* generated by _build.py from ' + lang + '.json — edit the JSON */\nwindow.SG_I18N = ' + json.dumps(I18N[lang], ensure_ascii=False, indent=0) + ';\n'
        old = None
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                old = f.read()
        if old != text:
            with open(p, 'w', encoding='utf-8', newline='\n') as f:
                f.write(text)


def build_id():
    """A short fingerprint of the styles and scripts. Every page asks for them as file?v=<id>, so a browser that keeps
    files for minutes (GitHub Pages lets it: 10 minutes) cannot run an old script on a new page. The shared folder also
    gets build.txt: a page compares it with its own id and reloads itself once if it is behind (see site.js)."""
    global _BUILD
    if _BUILD is None:
        h = hashlib.sha1()
        for name in ('data.js', 'site.js', 'site.css') + tuple(f'i18n/{lang}.js' for lang in LANGS[1:]):
            with open(os.path.join(HERE, 'assets', *name.split('/')), 'rb') as f:
                h.update(f.read())
        _BUILD = h.hexdigest()[:10]
    return _BUILD


TEMPLATE = '''<!DOCTYPE html>
<html lang="{html_lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{desc}" />
{robots}<link rel="canonical" href="{canonical}" />
{alternates}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Shine Guards" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:image" content="{og_image}" />
<meta property="og:locale" content="{og_locale}" />
<meta name="sg" data-root="{root}" data-page="{page}" data-kind="{kind}" data-svc="{svc}" data-city="{city}" data-lang="{lang}" data-langs="{langs}" />
<meta name="sg-build" content="{build}" />
<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Montserrat:wght@600;700;800&amp;display=swap" rel="stylesheet" />
<link rel="stylesheet" href="{root}assets/site.css?v={build}" />
</head>
<body>
<div id="app"><noscript><h1>{h1}</h1><p>{desc}</p></noscript></div>
{i18n}<script src="{root}assets/data.js?v={build}"></script>
<script src="{root}assets/site.js?v={build}"></script>
</body>
</html>
'''


def write(out_root, rel_dir, alts, *, seo, page, lang, kind='', svc='', city='', noindex=False):
    title, desc = seo
    depth = len([p for p in rel_dir.split('/') if p])
    root = '../' * depth or './'
    canonical = f'{BASE}/{rel_dir}'
    alternates = '\n'.join(f'<link rel="alternate" hreflang="{HTML_LANG[l]}" href="{BASE}/{alts[l]}" />' for l in LANGS)
    alternates += f'\n<link rel="alternate" hreflang="x-default" href="{BASE}/{alts["en"]}" />'
    out = TEMPLATE.format(
        html_lang=HTML_LANG[lang], og_locale=OG_LOCALE[lang], lang=lang, langs=','.join(READY),
        title=html.escape(title), desc=html.escape(desc), canonical=canonical, alternates=alternates,
        robots='<meta name="robots" content="noindex, nofollow" />\n' if noindex else '', og_image=OG_IMAGE,
        root=root, page=page, kind=kind, svc=svc, city=city, h1=html.escape(title.split(' | ')[0]), build=build_id(),
        i18n='' if lang == 'ua' else f'<script src="{root}assets/i18n/{lang}.js?v={build_id()}"></script>\n',
    )
    path = os.path.join(out_root, *rel_dir.split('/'), 'index.html')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)


def write_entry(out_root, dev):
    """index.html → home of the last chosen city, in the last chosen language. Through the repo's Vite server
    (port 5173) it forwards to the prototype server (_serve.py, 5174)."""
    target = 'location.port==="5173"?"http://localhost:5174/"+c+"/"+l+"/":' if dev else ''
    with open(os.path.join(out_root, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('<!DOCTYPE html>\n<html lang="uk"><head><meta charset="UTF-8" />'
                '<title>Shine Guards — прототип</title>'
                '<meta name="robots" content="noindex" />'
                '<script>var c,l;try{c=localStorage.getItem("sg-city");l=localStorage.getItem("sg-lang")}catch(e){}'
                'if(["vienna","graz","munich","bratislava"].indexOf(c)<0)c="vienna";'
                'if(["ua","ru","en","de","sk"].indexOf(l)<0)l="ua";'
                f'location.replace({target}c+"/"+l+(location.protocol==="file:"?"/index.html":"/"));</script>'
                '</head><body><a href="vienna/ua/">Shine Guards — Відень</a></body></html>\n')


def write_hosting_files(site):
    """The shared folder does not depend on one hosting: every static host takes what it understands.
    .nojekyll — GitHub Pages serves the folder as it is; _headers / _redirects — Cloudflare Pages and Netlify
    (the prototype must never compete with shineguards.com in search; old private Airbnb links follow to business)."""
    def put(name, text):
        with open(os.path.join(site, name), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
    s = BUSINESS['airbnb']
    put('.nojekyll', '')
    put('build.txt', build_id())
    put('_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n')
    put('_redirects', ''.join(f'/{c}/ua/services/private/{s}-in-{c} /{c}/ua/services/business/{s}-in-{c}/ 301\n' for c in CITIES))


def read(*parts):
    with open(os.path.join(HERE, *parts), encoding='utf-8') as f:
        return f.read()


SINGLE_TEMPLATE = '''<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Shine Guards — прототип сайту</title>
<meta name="description" content="" />
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" href="{icon}" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Montserrat:wght@600;700;800&amp;display=swap" rel="stylesheet" />
<style>
{css}
</style>
</head>
<body>
<div id="app"><noscript>Щоб переглянути прототип, увімкніть JavaScript.</noscript></div>
<script>window.SG_SINGLE = {cfg};</script>
<script>
{data_js}
</script>
<script>
{site_js}
</script>
</body>
</html>
'''


def inline_js(js):
    # a literal "</script" inside inline code would close the tag early
    return js.replace('</script', '<\\/script')


def build_single(path, pages):
    """The whole site in one HTML file; pages are addressed by the URL hash."""
    logo = 'data:image/svg+xml;base64,' + base64.b64encode(read('assets', 'logo.svg').encode('utf-8')).decode('ascii')
    seo_map = {f'/{rel}/': list(meta['seo']) for rel, meta, _ in pages}
    # the single file has no assets folder next to it: the team photos travel inside it
    team_dir = os.path.join(HERE, 'assets', 'team')
    team = {}
    for name in sorted(os.listdir(team_dir)):
        if name.lower().endswith('.jpg'):
            with open(os.path.join(team_dir, name), 'rb') as f:
                team[name] = 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode('ascii')
    cfg = json.dumps({'logo': logo, 'seo': seo_map, 'team': team, 'langs': list(READY),
                      'i18n': {lang: I18N[lang] for lang in READY if lang != 'ua'}}, ensure_ascii=False)
    icon = 'data:image/svg+xml;base64,' + base64.b64encode(read('assets', 'favicon.svg').encode('utf-8')).decode('ascii')
    out = SINGLE_TEMPLATE.format(icon=icon, css=read('assets', 'site.css'), cfg=inline_js(cfg),
                                 data_js=inline_js(read('assets', 'data.js')), site_js=inline_js(read('assets', 'site.js')))
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)


def main():
    if '--keys' in sys.argv:
        sys.stdout.write(json.dumps(seo_keys(), ensure_ascii=False))
        return
    i18n_js()
    if '--share' in sys.argv:
        pages = all_pages(READY)
        out_root = os.path.join(HERE, '_share')
        shutil.rmtree(out_root, ignore_errors=True)
        site = os.path.join(out_root, 'site')
        for rel, meta, alts in pages:
            write(site, rel, alts, noindex=True, **meta)
        write_entry(site, dev=False)
        shutil.copytree(os.path.join(HERE, 'assets'), os.path.join(site, 'assets'),
                        ignore=shutil.ignore_patterns('*.json'))
        write_hosting_files(site)
        single = os.path.join(out_root, 'shineguards-prototype.html')
        build_single(single, pages)
        print(f'_share/site: {len(pages)} pages; _share/shineguards-prototype.html: {os.path.getsize(single) // 1024} KB')
        return

    pages = all_pages()
    # clean previously generated trees (only generated folders)
    for d in list(CITIES) + list(LANGS):
        shutil.rmtree(os.path.join(HERE, d), ignore_errors=True)
    for rel, meta, alts in pages:
        write(HERE, rel, alts, **meta)
    write_entry(HERE, dev=True)
    print(f'{len(pages)} pages ({len(pages) // len(LANGS)} × {len(LANGS)} languages) + index.html')


if __name__ == '__main__':
    main()
