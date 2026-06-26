import re

_GREETINGS = {
    'hi', 'hello', 'hey', 'yo', 'hiya', 'howdy', 'greetings', 'sup', 'helo'
}

_FILLERS = {
    'guys', 'mate', 'man', 'bro', 'dude', 'there', 'just', 'like', 'um', 'uh'
}

_ABBREVS = {
    'u':    'you',
    'r':    'are',
    'ur':   'your',
    'wht':  'what',
    'wat':  'what',
    'wen':  'when',
    'whr':  'where',
    'hw':   'how',
    'cn':   'can',
    'pls':  'please',
    'plz':  'please',
    'thx':  'thanks',
    'ty':   'thank you',
    'nd':   'and',
    'n':    'and',
    'abt':  'about',
    'info': 'information',
    'hrs':  'hours',
    'hr':   'hour',
    'hv':   'have',
    'wanna': 'want to',
    'gonna': 'going to',
    'lmk':  'let me know',
}


def clean_query(query: str) -> str:
    # strip punctuation for word matching, but preserve the cleaned string
    words = re.sub(r'[^\w\s]', '', query.lower()).split()

    cleaned = []
    for word in words:
        if word in _GREETINGS or word in _FILLERS:
            continue
        cleaned.append(_ABBREVS.get(word, word))

    result = ' '.join(cleaned).strip()
    return result if result else query  # fallback to original if everything stripped
