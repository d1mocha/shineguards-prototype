# -*- coding: utf-8 -*-
"""Generates static page shells for the Shine Guards prototype.

Every shell carries the SEO head (title, description, canonical, hreflang,
Open Graph) and <meta name="sg"> that assets/site.js reads to render the page.
URLs mirror production: /{city}/ua/services/{private|business}/{slug}-in-{city}/
and /{city}/ua/locations/{slug}-in-{city}/ for business objects

Run:  python _build.py           → page shells next to this script (dev, _serve.py)
      python _build.py --share   → _share/shineguards-prototype.html (the whole site
                                   in one file, to send to people) and _share/site/
                                   (clean folder for static hosting, noindex)
"""
import base64
import html
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://www.shineguards.com'
OG_IMAGE = 'https://res.cloudinary.com/dbiy7qyfe/image/upload/w_1200,h_630,c_fill,g_faces/v1781018440/ABOUT_US_ROUND_e913ada099.jpg'

CITIES = {
    #            name         locative      "from" prices (basic, general, deep)  min order
    'vienna':     ('Відень',     'Відні',      (120, 170, 260), 108),
    'graz':       ('Грац',       'Граці',      (100, 140, 205), 108),
    'munich':     ('Мюнхен',     'Мюнхені',    (120, 170, 260), 108),
    'bratislava': ('Братислава', 'Братиславі', (65, 75, 90), 70),
}
EXTRA_HOUR = {'vienna': 30, 'graz': 30, 'munich': 30, 'bratislava': 18}
RENO_HOUR = {'vienna': 36, 'graz': 36, 'munich': 36, 'bratislava': 21.5}

PRIVATE = {
    'basic':   'bazove-pribirannya',
    'general': 'generalne-pribirannya',
    'deep':    'gliboke-pribirannya',
    'extras':  'dodatkovi-poslugi',
    'windows': 'mittya-vikon',
    'airbnb':  'pribirannya-airbnb-ta-korotkostrokovoyi-orendi',
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

# Business objects — own pages, as on shineguards.com: /{city}/ua/locations/{slug}-in-{city}
OBJECTS = {
    #               slug                                          title (city follows)                description ({loc} = у Відні…)
    'hotels':      ('goteli-apartamenti-ta-airbnb',              'Прибирання готелів і Airbnb',      'Прибирання готелів, апартаментів та Airbnb у {loc}: свіжа білизна, поповнення розхідників, фотозвіт після кожного гостя. Ціна за виїзд, знижка до 10% від 5 обʼєктів.'),
    'offices':     ('ofisi-ta-kovorkingi',                       'Прибирання офісів і коворкінгів',  'Прибирання офісів і коворкінгів у {loc}: до або після робочого дня, закріплена команда, договір і документи. Пропозиція за 24 години.'),
    'shops':       ('magazini-butiki-ta-shourumi',               'Прибирання магазинів і шоурумів',  'Прибирання магазинів, бутиків і шоурумів у {loc}: вітрини, дзеркала, торговий зал і примірочні — до відкриття або після закриття.'),
    'restaurants': ('restorani-kafe-ta-bari',                    'Прибирання ресторанів і кафе',     'Прибирання ресторанів, кафе та барів у {loc}: зали, бар, тераса й санвузли, кухня за стандартами HACCP. Пропозиція за 24 години.'),
    'kitchens':    ('profesijni-kuhni-ta-gastronomiya',          'Прибирання професійних кухонь',    'Прибирання професійних кухонь у {loc} за HACCP: жир і нагар з плит, печей і витяжок, лише засоби для харчових зон.'),
    'gyms':        ('fitnes-czentri-ta-sportzali',               'Прибирання фітнес-центрів',        'Прибирання фітнес-центрів і спортзалів у {loc}: дезінфекція тренажерів, роздягальні й душові — вночі або рано вранці.'),
    'medical':     ('medichni-czentri-kliniki-ta-stomatologiyi', 'Прибирання клінік і стоматологій', 'Прибирання медичних центрів, клінік і стоматологій у {loc}: кабінети, зони очікування й санвузли за санітарними нормами. Ціна після огляду.'),
    'cars':        ('avtosaloni-ta-servisni-czentri',            'Прибирання автосалонів і СТО',     'Прибирання автосалонів і сервісних центрів у {loc}: шоурум, скло, зона очікування й технічні зони СТО.'),
    'bizcenters':  ('biznes-czentri',                            'Прибирання бізнес-центрів',        'Прибирання бізнес-центрів у {loc}: холи, ліфти, сходи, санвузли й паркінг за графіком будівлі, повна відповідальність за договором.'),
    'cinemas':     ('kinoteatri-teatri-ta-rozvazhalni-zoni',     'Прибирання кінотеатрів і театрів', 'Прибирання кінотеатрів, театрів і розважальних зон у {loc}: зали між сеансами, фоє, каси, гардероби й фудкорти.'),
    'beauty':      ('saloni-krasi-spa-ta-barbershopi',           'Прибирання салонів краси та SPA',  'Прибирання салонів краси, SPA та барбершопів у {loc}: робочі місця майстрів, кушетки, SPA-зони й дезінфекція поверхонь.'),
    'malls':       ('torgovi-czentri',                           'Прибирання торгових центрів',      'Прибирання торгових центрів у {loc}: галереї, атріуми, фудкорти й ескалатори, зокрема нічні зміни.'),
}


def fmt(n):
    return str(n).replace('.', ',')


def private_seo(svc, city):
    name, loc, (fb, fg, fd), minimum = CITIES[city]
    return {
        'basic': (f'Регулярне прибирання {name} | Shine Guards',
                  f'Базове прибирання квартири у {loc} від {fb} € з ПДВ: підлога, пил, кухня й ванна. Розрахунок онлайн за 30 секунд, знижка до 7% на регулярне прибирання, оплата після прибирання.'),
        'general': (f'Генеральне прибирання {name} | Shine Guards',
                    f'Генеральне прибирання квартири у {loc} від {fg} €: усе з базового пакета, вікна зсередини, духовка й холодильник усередині. Фіксована ціна за площею, розрахунок онлайн.'),
        'deep': (f'Глибоке прибирання {name} | Shine Guards',
                 f'Глибоке прибирання квартири у {loc} від {fd} €: шафи й техніка всередині, вікна з обох боків, складний жир і вапняний наліт. Фіксована ціна за площею, розрахунок онлайн.'),
        'extras': (f'Додаткові клінінгові послуги у {loc} | Shine Guards',
                   f'Прасування, шафи, духовка, балкон, хімчистка дивана й матраца у {loc}. Додайте до прибирання або замовте окремо — від {EXTRA_HOUR[city]} € за годину.'),
        'windows': (f'Миття вікон {name} | Shine Guards',
                    f'Миття вікон у {loc}: скло, рами, підвіконня й відливи. Вкажіть кількість вікон — калькулятор покаже орієнтовну ціну. Мінімальне замовлення {minimum} €.'),
        'airbnb': (f'Прибирання Airbnb {name} | Shine Guards',
                   f'Прибирання апартаментів Airbnb та короткострокової оренди у {loc}: чек-лист, заміна білизни, розхідники. Ціна за площею, знижка до 10% від 5 обʼєктів.'),
        'moveout': (f'Прибирання при переїзді {name} | Shine Guards',
                    f'Прибирання перед заїздом або після виїзду у {loc}: кухня й техніка, санвузли, внутрішні поверхні та важкодоступні місця. Фіксована ціна за площею, розрахунок онлайн.'),
        'reno': (f'Прибирання після ремонту у {loc} | Shine Guards',
                 f'Прибирання після ремонту у {loc}: будівельний пил, фарба, клей і цемент, миття вікон і сантехніки. {fmt(RENO_HOUR[city])} € за годину роботи клінера.'),
    }[svc]


def business_seo(svc, city):
    name, loc, _, _ = CITIES[city]
    net = 'ціни без ПДВ' if city != 'bratislava' else 'прозорі ставки'
    return {
        'klining': (f'Клінінг для бізнесу {name} | Shine Guards',
                    f'Прибирання офісів, ресторанів, спортзалів і апартаментів у {loc} за договором: персональний менеджер, документи для бухгалтерії, {net}. Пропозиція за 24 години.'),
        'basic': (f'Регулярне прибирання офісів {name} | Shine Guards',
                  f'Регулярне прибирання офісів і комерційних приміщень у {loc} за графіком — до або після робочого дня. Розрахунок онлайн, індивідуальна ставка для великих обсягів.'),
        'general': (f'Генеральне прибирання офісу {name} | Shine Guards',
                    f'Разове генеральне прибирання офісу чи комерційного приміщення у {loc}: вікна зсередини, кухонна техніка, двері, плінтуси. Оцінка онлайн або огляд обʼєкта.'),
        'deep': (f'Глибоке прибирання для бізнесу {name} | Shine Guards',
                 f'Глибоке прибирання комерційних приміщень у {loc}: шафи й техніка всередині, жир і накип, вікна з обох боків. Перед відкриттям, після сезону або здачі обʼєкта.'),
        'windows': (f'Миття вікон для бізнесу {name} | Shine Guards',
                    f'Миття офісних вікон, вітрин і скляних перегородок у {loc}: скло, рами, укоси й підвіконня. Орієнтовна ціна онлайн, точна — після фото чи огляду.'),
        'airbnb': (f'Прибирання апартаментів для бізнесу {name} | Shine Guards',
                   f'Прибирання апартаментів і Airbnb у {loc} для керуючих компаній: чек-лист, білизна, аудит обʼєкта. Ціна за площею, знижка до 10% від кількості обʼєктів.'),
        'extras': (f'Додаткові послуги для бізнесу у {loc} | Shine Guards',
                   f'Жалюзі, догляд за рослинами, хімчистка меблів і килимів для офісів у {loc}. Ставки фіксуються в договорі та додаються до регулярного прибирання.'),
        'moveout': (f'Прибирання при переїзді офісу {name} | Shine Guards',
                    f'Прибирання офісу перед заїздом або після виїзду у {loc}: робочі зони, кухні, санвузли, вікна. Пропозиція протягом 24 годин після огляду.'),
        'reno': (f'Прибирання після ремонту для бізнесу {name} | Shine Guards',
                 f'Прибирання після ремонту офісів і комерційних приміщень у {loc}: пил з великих площ, вентиляція, освітлення, скляні перегородки.'),
    }[svc]


def object_seo(obj, city):
    name, loc, _, _ = CITIES[city]
    _, title, desc = OBJECTS[obj]
    return (f'{title} {name} | Shine Guards', desc.format(loc=loc))


def home_seo(city):
    name, loc, (fb, _, _), _ = CITIES[city]
    return (f'Клінінгова компанія {name} | Shine Guards',
            f'Професійне прибирання квартир і будинків у {loc} від {fb} €: фіксована ціна за площею, розрахунок онлайн за 30 секунд, оплата після прибирання, рейтинг 4,9 у Google.')


def list_seo(city):
    name, loc, (fb, _, _), _ = CITIES[city]
    return (f'Прибирання для дому {name} | Shine Guards',
            f'Усі послуги прибирання для дому у {loc}: базове, генеральне, глибоке, після ремонту, при переїзді, миття вікон і хімчистка меблів. Ціни від {fb} €.')


def biz_home_seo(city):
    name, loc, _, _ = CITIES[city]
    return (f'Прибирання для бізнесу {name} | Shine Guards',
            f'Клінінг офісів, ресторанів, спортзалів і апартаментів у {loc}: розрахунок онлайн від 27 € за годину, договір, персональний менеджер і документи для бухгалтерії.')


GLOBAL = {
    'about': ('Про Shine Guards | Shine Guards',
              'Shine Guards — клінінгова компанія у Відні, Граці, Мюнхені та Братиславі: власна команда клінерів, чек-листи, страхування відповідальності та рейтинг 4,9 у Google.'),
    'promotions': ('Акції та знижки | Shine Guards',
                   'Знижки Shine Guards: до −7% на регулярне прибирання, −10% на перше замовлення, подарункові сертифікати та знижки для бізнесу за обсяг.'),
    'contacts': ('Контакти | Shine Guards',
                 'Контакти Shine Guards: телефон +43 1 442 10 36, WhatsApp, Telegram, email. Відповідаємо з понеділка по пʼятницю, прибирання проводимо щодня.'),
    'partnership': ('Партнерство | Shine Guards',
                    'Партнерська програма Shine Guards для рієлторів, керуючих компаній, агенцій і блогерів: рекомендуйте клінінг і отримуйте винагороду за кожне замовлення.'),
}

TEMPLATE = '''<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{desc}" />
{robots}<link rel="canonical" href="{canonical}" />
<link rel="alternate" hreflang="uk" href="{canonical}" />
<link rel="alternate" hreflang="de" href="{alt_de}" />
<link rel="alternate" hreflang="en" href="{alt_en}" />
<link rel="alternate" hreflang="x-default" href="{alt_en}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Shine Guards" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:image" content="{og_image}" />
<meta property="og:locale" content="uk_UA" />
<meta name="sg" data-root="{root}" data-page="{page}" data-kind="{kind}" data-svc="{svc}" data-city="{city}" />
<link rel="icon" href="{root}assets/logo.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Montserrat:wght@600;700;800&amp;display=swap" rel="stylesheet" />
<link rel="stylesheet" href="{root}assets/site.css" />
</head>
<body>
<div id="app"><noscript><h1>{h1}</h1><p>{desc}</p></noscript></div>
<script src="{root}assets/data.js"></script>
<script src="{root}assets/site.js"></script>
</body>
</html>
'''


def page_list():
    """(rel_dir, meta) for every page of the site."""
    out = []
    for city in CITIES:
        out.append((f'{city}/ua', dict(seo=home_seo(city), page='home', kind='private', city=city)))
        out.append((f'{city}/ua/services/private', dict(seo=list_seo(city), page='list', kind='private', city=city)))
        out.append((f'{city}/ua/services/business', dict(seo=biz_home_seo(city), page='home', kind='business', city=city)))
        for svc, slug in PRIVATE.items():
            out.append((f'{city}/ua/services/private/{slug}-in-{city}', dict(seo=private_seo(svc, city), page='service', kind='private', svc=svc, city=city)))
        for svc, slug in BUSINESS.items():
            out.append((f'{city}/ua/services/business/{slug}-in-{city}', dict(seo=business_seo(svc, city), page='service', kind='business', svc=svc, city=city)))
        for obj, (slug, _, _) in OBJECTS.items():
            out.append((f'{city}/ua/locations/{slug}-in-{city}', dict(seo=object_seo(obj, city), page='object', kind='business', svc=obj, city=city)))
    for name, seo in GLOBAL.items():
        out.append((f'ua/{name}', dict(seo=seo, page=name)))
    return out


def write(out_root, rel_dir, *, seo, page, kind='', svc='', city='', noindex=False):
    title, desc = seo
    depth = len([p for p in rel_dir.split('/') if p])
    root = '../' * depth or './'
    canonical = f'{BASE}/{rel_dir}'
    alt = canonical.replace('/ua/', '/{lang}/', 1) if '/ua/' in canonical else canonical.replace('/ua', '/{lang}', 1)
    out = TEMPLATE.format(
        title=html.escape(title), desc=html.escape(desc), canonical=canonical,
        robots='<meta name="robots" content="noindex, nofollow" />\n' if noindex else '',
        alt_de=alt.format(lang='de'), alt_en=alt.format(lang='en'), og_image=OG_IMAGE,
        root=root, page=page, kind=kind, svc=svc, city=city, h1=html.escape(title.split(' | ')[0]),
    )
    path = os.path.join(out_root, *rel_dir.split('/'), 'index.html')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)


def write_entry(out_root, dev):
    """index.html → home of the last chosen city. Through the repo's Vite server
    (port 5173) it forwards to the prototype server (_serve.py, 5174)."""
    target = 'location.port==="5173"?"http://localhost:5174/"+c+"/ua/":' if dev else ''
    with open(os.path.join(out_root, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('<!DOCTYPE html>\n<html lang="uk"><head><meta charset="UTF-8" />'
                '<title>Shine Guards — прототип</title>'
                '<meta name="robots" content="noindex" />'
                '<script>var c;try{c=localStorage.getItem("sg-city")}catch(e){}'
                'if(["vienna","graz","munich","bratislava"].indexOf(c)<0)c="vienna";'
                f'location.replace({target}c+(location.protocol==="file:"?"/ua/index.html":"/ua/"));</script>'
                '</head><body><a href="vienna/ua/">Shine Guards — Відень</a></body></html>\n')


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
<link rel="icon" href="{logo}" type="image/svg+xml" />
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


def build_single(path):
    """The whole site in one HTML file; pages are addressed by the URL hash."""
    logo = 'data:image/svg+xml;base64,' + base64.b64encode(read('assets', 'logo.svg').encode('utf-8')).decode('ascii')
    seo = {f'/{rel}/': list(meta['seo']) for rel, meta in page_list()}
    cfg = json.dumps({'logo': logo, 'seo': seo}, ensure_ascii=False)
    out = SINGLE_TEMPLATE.format(logo=logo, css=read('assets', 'site.css'), cfg=inline_js(cfg),
                                 data_js=inline_js(read('assets', 'data.js')), site_js=inline_js(read('assets', 'site.js')))
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)


def main():
    pages = page_list()
    if '--share' in sys.argv:
        out_root = os.path.join(HERE, '_share')
        shutil.rmtree(out_root, ignore_errors=True)
        site = os.path.join(out_root, 'site')
        for rel, meta in pages:
            write(site, rel, noindex=True, **meta)
        write_entry(site, dev=False)
        shutil.copytree(os.path.join(HERE, 'assets'), os.path.join(site, 'assets'))
        single = os.path.join(out_root, 'shineguards-prototype.html')
        build_single(single)
        print(f'_share/site: {len(pages)} pages; _share/shineguards-prototype.html: {os.path.getsize(single) // 1024} KB')
        return

    # clean previously generated trees (only generated folders)
    for d in list(CITIES) + ['ua']:
        shutil.rmtree(os.path.join(HERE, d), ignore_errors=True)
    for rel, meta in pages:
        write(HERE, rel, **meta)
    write_entry(HERE, dev=True)
    print(f'{len(pages)} pages + index.html')


if __name__ == '__main__':
    main()
