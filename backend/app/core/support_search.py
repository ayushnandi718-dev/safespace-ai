import httpx
from app.core.config import settings
from app.schemas.support import SupportResource

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