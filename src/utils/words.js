const BANK = {
    quilting: [
        "batting","backing","binding","thimble","needle","seam","patch","loom","bobbin","thread","fabric","applique","bias","stitch","sashing","jellyroll","longarm",
    ],
    nascar: [
        "draft","pitstop","spoiler","wrench","helmet","restart","podium","camber","infield","apron","slicks","banking","throttle","stagger","oversteer","understeer",
    ],
    ocean: [
        "coral","kelp","current","dolphin","shark","angler","barnacle","tide","gull","reef","plankton","narwhal","orca","algae","lagoon","atoll","krill",
    ],
};

export function seedWordsByTopic(topic, count) {
    const key = (topic || "").toLowerCase().split(/[^a-z]/).find(Boolean);
    const pool = BANK[key] || pickAny();
    const words = shuffle(pool).slice(0, Math.max(3, Math.min(20, count)));
    const clues = Object.fromEntries(words.map((w) => [w.toLowerCase(), autoClue(w)]));
    return { words, clues };
}

function autoClue(word) {
    // Very simple: anagram + length; replace with a dictionary if you like.
    const mixed = shuffle(word.toUpperCase().split("")).join("");
    return `Anagram: ${mixed} (${word.length})`;
}
      
function pickAny() {
    const all = Object.values(BANK).flat();
    return all.length ? all : ["CODE","PUZZLE","LOGIC","ARRAY","REACT","MONGO","NODE","PYTHON","ALPHA","BETA"];
}

function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }