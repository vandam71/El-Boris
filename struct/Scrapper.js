const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
};

// Scrapes the OP.GG meta description tag which contains rank, LP, W/L and top champions.
// Format: "Name#Tag / Tier Division LP / WWin LLose Win rate WR% / Champ - ..."
const get_profile_stats = async (summoner, region = 'euw') => {
    const searchUrl = `https://op.gg/lol/summoners/search?q=${encodeURIComponent(summoner)}&region=${region}`;
    const response = await axios.get(searchUrl, { headers: HEADERS, maxRedirects: 5, timeout: 10000 });

    const $ = cheerio.load(response.data);
    const description = $('meta[name="description"]').attr('content') || '';
    const profileUrl = response.request.res?.responseUrl || searchUrl;

    // Not a summoner page if description doesn't contain " / "
    const parts = description.split(' / ');
    if (parts.length < 2) return { summoner: null, profileUrl };

    const stats = { summoner: parts[0] || null, profileUrl };

    // Rank: "Platinum 1 1 67LP", "Master 500LP", "Unranked"
    if (parts[1]) {
        const tierMatch = parts[1].match(/^(Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger)(?:\s+(\d+))?/i);
        const lpMatch = parts[1].match(/(\d+)LP/);
        if (tierMatch) {
            stats.rank = tierMatch[2] ? `${tierMatch[1]} ${tierMatch[2]}` : tierMatch[1];
            stats.lp = lpMatch ? lpMatch[1] : null;
        } else {
            stats.rank = parts[1].trim();
            stats.lp = null;
        }
    }

    // W/L/WR: "57Win 64Lose Win rate 47%"
    if (parts[2]) {
        const wlMatch = parts[2].match(/(\d+)Win\s+(\d+)Lose\s+Win rate\s+(\d+)%/);
        if (wlMatch) {
            stats.wins = wlMatch[1];
            stats.losses = wlMatch[2];
            stats.winRate = wlMatch[3];
        }
    }

    // Top champions: "Senna - 15Win 11Lose Win rate 58%, Mel - ..."
    if (parts[3]) {
        stats.champions = parts[3].split(', ').map(c => c.split(' - ')[0]).slice(0, 5);
    }

    return stats;
};

module.exports = { get_profile_stats };
