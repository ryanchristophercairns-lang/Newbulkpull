import { Actor, log } from 'apify';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

await Actor.init();

const input = await Actor.getInput();
const names = (input?.names || "")
    .split("\n")
    .map(n => n.trim())
    .filter(n => n.length > 0);

log.info("Parsed names:", names);

function splitName(full) {
    if (!full) return { first_name: null, last_name: null };
    const parts = full.trim().split(/\s+/);
    return {
        first_name: parts[0] || null,
        last_name: parts.slice(1).join(" ") || null,
    };
}

function phonesToObject(phones) {
    const clean = [...new Set(
        phones.map(p => p.replace(/[^\d]/g, "")).filter(p => p.length > 0)
    )].slice(0, 5);

    return {
        phone_1: clean[0] || null,
        phone_2: clean[1] || null,
        phone_3: clean[2] || null,
        phone_4: clean[3] || null,
        phone_5: clean[4] || null,
    };
}

async function fetchHTML(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept-Language": "en-US,en;q=0.9",
            }
        });
        return await res.text();
    } catch (err) {
        log.error("Fetch failed:", err);
        return "";
    }
}

for (const name of names) {
    const searchUrl = `https://www.cyberbackgroundchecks.com/people?name=${encodeURIComponent(name)}`;
    log.info(`Searching: ${searchUrl}`);

    const searchHTML = await fetchHTML(searchUrl);
    const $search = cheerio.load(searchHTML);

    const firstLink = $search('a[href^="/people/"]').first().attr("href");

    if (!firstLink) {
        log.warning(`No profile found for: ${name}`);
        await Actor.pushData({
            first_name: null,
            last_name: null,
            phone_1: null,
            phone_2: null,
            phone_3: null,
            phone_4: null,
            phone_5: null,
        });
        continue;
    }

    const profileUrl = `https://www.cyberbackgroundchecks.com${firstLink}`;
    log.info(`Profile URL: ${profileUrl}`);

    const profileHTML = await fetchHTML(profileUrl);
    const $profile = cheerio.load(profileHTML);

    const rawName =
        $profile("h1").first().text().trim() ||
        $profile(".person-name").first().text().trim() ||
        $profile(".person-header-name").first().text().trim() ||
        name;

    const { first_name, last_name } = splitName(rawName);

    const phones = [];
    $profile('a[href^="tel:"]').each((i, el) => {
        phones.push($profile(el).attr("href") || "");
    });

    const phoneObj = phonesToObject(phones);

    await Actor.pushData({
        first_name,
        last_name,
        ...phoneObj,
    });
}

await Actor.exit();
