import httpx
from app.core.config import settings
from app.schemas.support import SupportResource

SPECIALTY_QUERIES = {
    "orthopedic": "orthopedic doctor",
    "orthopaedic": "orthopedic doctor",
    "ortho": "orthopedic doctor",
    "arthropathic": "orthopedic doctor",
    "bone": "orthopedic doctor",
    "dentist": "dentist",
    "dental": "dentist",
    "cardio": "cardiologist",
    "cardiologist": "cardiologist",
    "heart": "cardiologist",
    "dermato": "dermatologist",
    "skin": "dermatologist",
    "neuro": "neurologist",
    "brain": "neurologist",
    "psychiat": "psychiatrist",
    "rheumat": "rheumatologist",
    "joint": "rheumatologist",
    "gynecolog": "gynecologist",
    "obstetric": "obstetrician",
    "pediatric": "pediatrician",
    "child": "pediatrician",
    "eye": "ophthalmologist",
    "vision": "ophthalmologist",
    "ent": "ent doctor",
    "ear": "ent doctor",
    "gastro": "gastroenterologist",
    "urolog": "urologist",
    "pulmon": "pulmonologist",
    "liver": "hepatologist",
    "kidney": "nephrologist",
    "diabet": "endocrinologist",
    "thyroid": "endocrinologist",
    "oncolog": "oncologist",
    "general physician": "general physician",
    "gp": "general physician",
    "physician": "physician",
    "surgeon": "surgeon",
    "physiotherap": "physiotherapist",
    "physio": "physiotherapist",
    "nurse": "nurse",
    "therapist": "therapist",
    "counselor": "counselor",
    "psychologist": "psychologist",
    "psychiatrist": "psychiatrist",
    "pharmacy": "pharmacy",
    "pharmac": "pharmacist",
    "chemist": "pharmacy",
    "medical store": "pharmacy",
    "diagnostic": "diagnostic center",
    "laboratory": "diagnostic center",
    "lab": "diagnostic center",
    "hospital": "hospital",
    "clinic": "clinic",
    "nursing home": "nursing home",
    "ambulance": "ambulance",
    "blood bank": "blood bank",
}

_SPECIALTY_KEYS = sorted(SPECIALTY_QUERIES.keys(), key=len, reverse=True)

def normalize_search_query(query: str) -> str:
    text = (query or "").strip().lower()
    if not text:
        return "doctor"
    for key in _SPECIALTY_KEYS:
        if key in text:
            return SPECIALTY_QUERIES[key]
    if "doctor" in text or "doc" in text:
        return "doctor"
    if "find" in text or "near" in text or "search" in text or "locate" in text:
        return "doctor"
    return text

def _geocode(location: str) -> tuple[float, float] | None:
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1},
            headers={"User-Agent": "SafeSpaceAI/1.0 (safespace-ai@users.noreply.github.com)"},
            timeout=15,
        )
        data = resp.json()
        if not data:
            return None
        return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        return None

_HEALTHCARE_PATTERN = "|".join([
    "hospital", "clinic", "doctors", "pharmacy",
    "dentist", "physiotherapist", "nursing_home",
])

def _overpass_search(query: str, lat: float, lon: float, limit: int = 8) -> list[dict]:
    q = normalize_search_query(query)
    terms: list[str] = ['node["healthcare"]']
    if any(t in q for t in ["doctor", "physician", "surgeon", "specialist", "ortho", "cardi", "neuro", "psychiat", "rheumat"]):
        terms.append('node["amenity"~"hospital|clinic|doctors|pharmacy"]')
    if "dentist" in q or "dental" in q:
        terms.append('node["amenity"="dentist"]')
    if "pharma" in q or "chemist" in q or "medical store" in q:
        terms.append('node["amenity"="pharmacy"]')
    if "physio" in q:
        terms.append('node["amenity"="physiotherapist"]')
    if "hospital" in q or "nursing" in q:
        terms.append('node["amenity"~"hospital|clinic"]')
    if "diagnostic" in q or "lab" in q:
        terms.append('node["amenity"="laboratory"]')
    radius = 20000
    terms.extend(_specialty_terms(q))
    union = "\n".join(t + f"(around:{radius},{lat},{lon});" for t in terms)
    data = (
        "[out:json][timeout:20];\n("
        f"{union}\n);\nout body {limit};"
    )
    headers = {"User-Agent": "SafeSpaceAI/1.0 (safespace-ai@users.noreply.github.com)"}
    endpoints = (
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    )
    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed
        def probe(endpoint: str):
            try:
                resp = httpx.post(endpoint, data={"data": data}, headers=headers, timeout=20)
                if resp.status_code != 200:
                    return None
                return resp.json().get("elements", [])
            except Exception:
                return None
        ex = ThreadPoolExecutor(max_workers=len(endpoints))
        items = None
        try:
            futures = [ex.submit(probe, ep) for ep in endpoints]
            for fut in as_completed(futures, timeout=12):
                partial = fut.result()
                if partial:
                    items = partial
                    break
        except Exception:
            items = None
        finally:
            ex.shutdown(wait=False, cancel_futures=True)
        if not items:
            return []
        results = []
        for el in items:
            tags = el.get("tags", {}) or {}
            name = (tags.get("name") or "").strip()
            if not name:
                continue
            latv = el.get("lat") or (el.get("center") or {}).get("lat")
            lonv = el.get("lon") or (el.get("center") or {}).get("lon")
            category = tags.get("healthcare") or tags.get("amenity") or "clinic"
            address = (tags.get("addr:full") or tags.get("addr:street") or "").strip()
            if tags.get("addr:housenumber") and tags.get("addr:street"):
                address = f"{tags.get('addr:housenumber')} {tags.get('addr:street')}".strip()
            phone = _pick_phone(tags)
            maps_url = f"https://www.google.com/maps/search/?api=1&query={name} near {latv},{lonv}" if (latv and lonv) else None
            results.append(SupportResource(
                name=name,
                description=address or f"{category.title()} services in this area.",
                phone=phone,
                type=category,
                address=address or None,
                maps_url=maps_url,
                url=tags.get("website") or None,
                source="openstreetmap",
            ))
        return results
    except Exception:
        return []

def _specialty_terms(q: str) -> list[str]:
    specs = []
    if any(k in q for k in ("ortho", "bone", "joint")):
        specs.append("orthopedics")
    if "cardi" in q:
        specs.append("cardiology")
    if "neuro" in q:
        specs.append("neurology")
    if "psych" in q:
        specs.extend(["psychiatry", "psychotherapy", "psychology"])
    if "dermat" in q:
        specs.append("dermatology")
    if "rheumat" in q:
        specs.append("rheumatology")
    if "gyn" in q or "obstetr" in q:
        specs.append("gynecology")
    if "pediat" in q:
        specs.append("pediatrics")
    if "ophthalm" in q or "eye" in q:
        specs.append("ophthalmology")
    if "gastro" in q:
        specs.append("gastroenterology")
    if "endocrine" in q:
        specs.append("endocrinology")
    if "urolog" in q:
        specs.append("urology")
    if "ent" in q or "ear, nose" in q:
        specs.append("otolaryngology")
    if "physio" in q:
        specs.append("physiotherapy")
    if "dentist" in q or "dental" in q:
        specs.append("dentistry")
    return [f'node["healthcare:speciality"~"{s}",i]' for s in specs]

def _pick_phone(tags: dict) -> str | None:
    for key in ("contact:mobile", "contact:phone", "phone", "contact:landline"):
        v = (tags.get(key) or "").strip()
        if v:
            return v
    return None

def _google_places_search(query: str, location: str) -> list[SupportResource]:
    if not settings.GOOGLE_MAPS_API_KEY:
        return []
    try:
        resp = httpx.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params={"query": f"{query} in {location}", "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=15,
        )
        data = resp.json()
        if data.get("status") != "OK":
            return []
        results = []
        for item in data.get("results", [])[:8]:
            name = (item.get("name") or "").strip()
            if not name:
                continue
            place_id = item.get("place_id")
            phone = ""
            website = ""
            if place_id:
                details = httpx.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={"place_id": place_id, "fields": "formatted_phone_number,website,url", "key": settings.GOOGLE_MAPS_API_KEY},
                    timeout=10,
                ).json()
                dres = details.get("result") or {}
                phone = dres.get("formatted_phone_number") or ""
                website = dres.get("website") or ""
            results.append(SupportResource(
                name=name,
                description=(item.get("formatted_address") or "").strip() or f"Near {location}.",
                phone=phone or None,
                type="local",
                address=(item.get("formatted_address") or "").strip() or None,
                rating=item.get("rating"),
                url=website or None,
                maps_url=f"https://www.google.com/maps/search/{item.get('formatted_address', '')}",
                source="google",
            ))
        return results
    except Exception:
        return []

_SEARCH_CACHE: dict[tuple[str, str], dict] = {}

def search_nearby_places(query: str, location: str) -> dict:
    normalized = normalize_search_query(query)
    cache_key = (normalized, location.lower().strip())
    if cache_key in _SEARCH_CACHE:
        return _SEARCH_CACHE[cache_key]
    if settings.GOOGLE_MAPS_API_KEY:
        google = _google_places_search(normalized, location)
        if google:
            return {
                "resources": google,
                "message": f"Showing {normalized}s near {location}.",
                "source": "google",
                "query": normalized,
            }
    coords = _geocode(location)
    if coords:
        overpass = _overpass_search(normalized, coords[0], coords[1])
        if overpass:
            result = {
                "resources": overpass,
                "message": f"Showing {normalized}s near {location}.",
                "source": "openstreetmap",
                "query": normalized,
            }
            if len(_SEARCH_CACHE) < 50:
                _SEARCH_CACHE[cache_key] = result
            return result
    result = {
        "resources": [],
        "message": (
            f"I couldn't retrieve live {normalized}s near {location} right now. "
            "Please try again in a moment, or refine your location."
        ),
        "source": "unavailable",
        "query": normalized,
    }
    if len(_SEARCH_CACHE) < 50:
        _SEARCH_CACHE[cache_key] = result
    return result

SUPPORT_QUERIES = {
    "therapist": "therapist mental health clinic",
    "counselor": "mental health counselor",
    "psychiatrist": "psychiatrist mental health doctor",
    "crisis": "mental health crisis support",
    "": "mental health therapist counselor psychiatrist",
}

COUNTRY_HINTS = [
    ("india", ["india", "indian", "delhi", "mumbai", "bangalore", "bengaluru", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad", "jaipur", "lucknow", "gurgaon", "noida", "alipurduar", "kerala", "tamil nadu", "karnataka", "gujarat", "rajasthan", "bihar", "west bengal", "uttar pradesh"]),
    ("united-states", ["united states", "usa", "u.s.", "us", "new york", "california", "texas", "florida", "chicago", "los angeles", "san francisco", "boston", "seattle", "dc", "washington"]),
    ("united-kingdom", ["united kingdom", "uk", "britain", "england", "scotland", "london", "manchester", "leeds", "birmingham"]),
    ("canada", ["canada", "toronto", "vancouver", "montreal", "calgary", "ottawa"]),
    ("australia", ["australia", "sydney", "melbourne", "brisbane", "perth", "adelaide"]),
    ("germany", ["germany", "berlin", "munich", "hamburg", "frankfurt"]),
    ("france", ["france", "paris", "lyon", "marseille"]),
    ("uae", ["uae", "united arab emirates", "dubai", "abu dhabi", "sharjah"]),
    ("singapore", ["singapore"]),
    ("bangladesh", ["bangladesh", "dhaka"]),
    ("pakistan", ["pakistan", "karachi", "lahore", "islamabad"]),
]

INDIA_RESOURCES = [
    SupportResource(
        name="Practo",
        description="Search verified doctors and mental health professionals across India.",
        url="https://www.practo.com/search/psychiatrists",
        type="directory",
    ),
    SupportResource(
        name="Tele-MANAS (Government of India)",
        description="India's national round-the-clock toll-free mental health helpline.",
        phone="14416",
        url="https://telemanas.mohfw.gov.in",
        type="helpline",
    ),
    SupportResource(
        name="iCall (TISS)",
        description="Tata Institute of Social Sciences counseling and psychosocial support.",
        phone="9152987821",
        url="https://www.icallhelpline.org",
        type="helpline",
    ),
    SupportResource(
        name="AASRA",
        description="24/7 suicide prevention helpline for those in distress.",
        phone="9820466726",
        url="https://www.aasra.info",
        type="crisis",
    ),
    SupportResource(
        name="KIRAN (MHA)",
        description="Government mental health rehabilitation helpline.",
        phone="18005990019",
        type="crisis",
    ),
    SupportResource(
        name="Emergency Services",
        description="For immediate danger, call local emergency services.",
        phone="112",
        type="crisis",
    ),
]

US_RESOURCES = [
    SupportResource(
        name="988 Suicide & Crisis Lifeline",
        description="Call or text 988 for 24/7 crisis support.",
        phone="988",
        url="https://988lifeline.org",
        type="crisis",
    ),
    SupportResource(
        name="SAMHSA National Helpline",
        description="Free referral service for substance abuse and mental health.",
        phone="1-800-662-4357",
        url="https://www.samhsa.gov/find-help/national-helpline",
        type="helpline",
    ),
    SupportResource(
        name="NAMI Helpline",
        description="National Alliance on Mental Illness helpline.",
        phone="1-800-950-6264",
        url="https://www.nami.org/help",
        type="helpline",
    ),
    SupportResource(
        name="Psychology Today Directory",
        description="Find a therapist directory with detailed provider profiles.",
        url="https://www.psychologytoday.com/us/therapists",
        type="directory",
    ),
    SupportResource(
        name="Crisis Text Line",
        description="Text HOME to 741741 for crisis support.",
        phone="741741",
        type="crisis",
    ),
]

DEFAULT_RESOURCES = [
    SupportResource(
        name="Psychology Today",
        description="International therapist directory with detailed provider profiles.",
        url="https://www.psychologytoday.com/us/therapists",
        type="directory",
    ),
    SupportResource(
        name="OpenCounseling",
        description="Free and low-cost mental health resources worldwide.",
        url="https://www.opencounseling.com",
        type="directory",
    ),
    SupportResource(
        name="WHO Mental Health",
        description="World Health Organization mental health resources and guidance.",
        url="https://www.who.int/health-topics/mental-health",
        type="info",
    ),
    SupportResource(
        name="International SOS Helpline",
        description="Confidential support for those in distress (commercial service).",
        type="helpline",
    ),
]

COUNTRY_RESOURCES = {
    "india": INDIA_RESOURCES,
    "united-states": US_RESOURCES,
    "united-kingdom": [
        SupportResource(
            name="Samaritans",
            description="24/7 confidential emotional support helpline in the UK.",
            phone="116123",
            url="https://www.samaritans.org",
            type="crisis",
        ),
        SupportResource(
            name="Mind",
            description="Mental health charity providing advice and support.",
            phone="0300 123 3393",
            url="https://www.mind.org.uk",
            type="helpline",
        ),
        SupportResource(
            name="NHS 111",
            description="Non-emergency medical advice and mental health signposting.",
            phone="111",
            url="https://www.nhs.uk",
            type="helpline",
        ),
        SupportResource(
            name="British Association for Counselling & Psychotherapy",
            description="Find accredited therapists and counselors in the UK.",
            url="https://www.bacp.co.uk/search/Therapists",
            type="directory",
        ),
    ],
    "canada": [
        SupportResource(
            name="Talk Suicide Canada",
            description="National suicide prevention helpline.",
            phone="988",
            url="https://talksuicide.ca",
            type="crisis",
        ),
        SupportResource(
            name="Canadian Mental Health Association",
            description="Community mental health programs and crisis support.",
            url="https://cmha.ca",
            type="helpline",
        ),
        SupportResource(
            name="Psychology Today Canada",
            description="Find licensed therapists and counselors in Canada.",
            url="https://www.psychologytoday.com/ca/therapists",
            type="directory",
        ),
    ],
    "australia": [
        SupportResource(
            name="Lifeline Australia",
            description="24/7 crisis support and suicide prevention services.",
            phone="131114",
            url="https://www.lifeline.org.au",
            type="crisis",
        ),
        SupportResource(
            name="Beyond Blue",
            description="Anxiety, depression and suicide prevention support.",
            phone="1300 22 4636",
            url="https://www.beyondblue.org.au",
            type="helpline",
        ),
        SupportResource(
            name="Head to Health",
            description="Government gateway to Australian mental health services.",
            url="https://www.headtohealth.gov.au",
            type="directory",
        ),
    ],
    "uae": [
        SupportResource(
            name="Ministry of Health (UAE)",
            description="Mental health and counseling services via the Ministry.",
            phone="800 68",
            url="https://mohap.gov.ae",
            type="helpline",
        ),
        SupportResource(
            name="Dubai Foundation for Women & Children",
            description="Crisis support and counseling in Dubai.",
            phone="800111",
            url="https://www.dfwac.ae",
            type="helpline",
        ),
        SupportResource(
            name="PsyCare Dubai",
            description="Find licensed psychologists and psychiatrists in the UAE.",
            url="https://www.psycare.com",
            type="directory",
        ),
    ],
}

_COUNTRY_HINT_MAP = {kw: code for code, kws in COUNTRY_HINTS for kw in kws}

DEFAULT_COUNTRY = "international"

def detect_country(location: str) -> str:
    text = (location or "").lower().strip()
    if not text:
        return DEFAULT_COUNTRY
    for hint, code in _COUNTRY_HINT_MAP.items():
        if hint in text:
            return code
    return DEFAULT_COUNTRY

def _build_query(location: str, support_type: str) -> str:
    base = SUPPORT_QUERIES.get((support_type or "").strip().lower(), SUPPORT_QUERIES[""])
    return f"{base} in {location}"

def _map_url_for(location: str, support_type: str) -> str:
    base = SUPPORT_QUERIES.get((support_type or "").strip().lower(), SUPPORT_QUERIES[""])
    q = base.replace("mental health ", "").replace(" doctor", "")
    from urllib.parse import quote
    return f"https://www.google.com/maps/search/{quote(q + ' in ' + location)}"

def _live_search(query: str, location: str, support_type: str) -> list[SupportResource]:
    if not settings.GOOGLE_MAPS_API_KEY:
        return []
    try:
        resp = httpx.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params={
                "query": query,
                "key": settings.GOOGLE_MAPS_API_KEY,
                "type": "point_of_interest",
            },
            timeout=15,
        )
        data = resp.json()
        if data.get("status") != "OK":
            return []
        results = []
        for item in data.get("results", [])[:8]:
            name = (item.get("name") or "").strip()
            if not name:
                continue
            address = (item.get("formatted_address") or "").strip()
            lat = (item.get("geometry") or {}).get("location", {}).get("lat")
            lng = (item.get("geometry") or {}).get("location", {}).get("lng")
            place_id = item.get("place_id")
            phone = ""
            if place_id:
                details = httpx.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={
                        "place_id": place_id,
                        "fields": "formatted_phone_number,website,url",
                        "key": settings.GOOGLE_MAPS_API_KEY,
                    },
                    timeout=10,
                ).json()
                phone = (details.get("result") or {}).get("formatted_phone_number") or ""
            maps_url = (
                f"https://www.google.com/maps/search/{place_id}"
                if place_id
                else _map_url_for(location, support_type)
            )
            results.append(SupportResource(
                name=name,
                description=address or f"Mental health professional near {location}.",
                url=((details.get("result") or {}).get("website")) if place_id else maps_url,
                phone=phone or None,
                type=support_type or "therapist",
            ))
        return results
    except Exception:
        return []

def search_support_resources(location: str, support_type: str) -> dict:
    country = detect_country(location)
    query = _build_query(location, support_type)
    live = _live_search(query, location, support_type)

    if live:
        return {
            "resources": live,
            "message": f"Showing verified mental health professionals near {location}.",
            "source": "live",
            "country": country,
        }

    fallback = COUNTRY_RESOURCES.get(country, DEFAULT_RESOURCES)
    return {
        "resources": fallback,
        "message": (
            f"Live provider search is not configured, so here are {country.replace('-', ' ')} "
            f"resources for you. For more specific providers near {location}, try "
            f"{_map_url_for(location, support_type)}."
        ),
        "source": "fallback",
        "country": country,
    }

EMERGENCY_NUMBERS = {
    "india": ("112", "100"),
    "united-states": ("911", "911"),
    "united-kingdom": ("999", "112"),
    "canada": ("911", "911"),
    "australia": ("000", "000"),
    "germany": ("112", "110"),
    "france": ("112", "15"),
    "uae": ("112", "999"),
    "singapore": ("995", "999"),
    "bangladesh": ("999", "999"),
    "pakistan": ("15", "1122"),
}

def emergency_numbers(location: str) -> dict:
    country = detect_country(location)
    numbers = EMERGENCY_NUMBERS.get(
        country,
        ("112", None),
    )
    return {"country": country, "emergency": numbers[0], "police": numbers[1]}

def crisis_resources(location: str = "") -> list[str]:
    info = emergency_numbers(location)
    country = info["country"]
    if country == "india":
        return [
            "Tele-MANAS (India) national helpline: 14416",
            "AASRA suicide prevention: 9820466726",
            "Emergency: 112",
        ]
    if country == "united-states":
        return [
            "988 Suicide & Crisis Lifeline: 988",
            "Crisis Text Line: text HOME to 741741",
            "Emergency: 911",
        ]
    if country == "united-kingdom":
        return ["Samaritans: 116 123", "Mental Health Helpline: 111", "Emergency: 999"]
    if country == "canada":
        return ["Talk Suicide Canada: 988", "Emergency: 911"]
    return [
        "National suicide & crisis hotline",
        "Trusted friend or family member nearby",
        "Local emergency number",
    ]