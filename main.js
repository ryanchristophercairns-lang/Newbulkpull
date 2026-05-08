import { Actor, log } from 'apify';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

await Actor.init();

let input;
try {
    input = await Actor.getInput();
} catch (err) {
    log.error("Failed to get input:", err);
    await Actor.exit();
    process.exit(1);
}

if (!input || !input.names) {
    log.error("No names provided in input");
    await Actor.exit();
    process.exit(1);
}

const names = input.names
    .split("\n")
    .map(n => n.trim())
    .filter(n => n.length > 0);

if (names.length === 0) {
    log.error("No valid names found after parsing");
    await Actor.exit();
    process.exit(1);
}

log.info(`Processing ${names.length} names`, { namesCount: names.length });

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

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < names.length; i++) {
    const name = names[i];
    try {
        log.info(`[${i + 1}/${names.length}] Processing: ${name}`);
        
        const searchUrl = `https://www.cyberbackgroundchecks.com/people?name=${encodeURIComponent(name)}`;

        const searchHTML = await fetchHTML(searchUrl);
        if (!searchHTML) {
            log.warning(`Failed to fetch search page for: ${name}`);
            await Actor.pushData({
                name,
                first_name: null,
                last_name: null,
                phone_1: null,
                phone_2: null,
                phone_3: null,
                phone_4: null,
                phone_5: null,
                error: "Failed to fetch search page",
            });
            errorCount++;
            continue;
        }

        const $search = cheerio.load(searchHTML);
        const firstLink = $search('a[href^="/people/"]').first().attr("href");

        if (!firstLink) {
            log.info(`No profile found for: ${name}`);
            await Actor.pushData({
                name,
                first_name: null,
                last_name: null,
                phone_1: null,
                phone_2: null,
                phone_3: null,
                phone_4: null,
                phone_5: null,
                error: "No profile found",
            });
            errorCount++;
            continue;
        }

        const profileUrl = `https://www.cyberbackgroundchecks.com${firstLink}`;
        log.debug(`Profile URL: ${profileUrl}`);

        const profileHTML = await fetchHTML(profileUrl);
        if (!profileHTML) {
            log.warning(`Failed to fetch profile for: ${name}`);
            await Actor.pushData({
                name,
                first_name: null,
                last_name: null,
                phone_1: null,
                phone_2: null,
                phone_3: null,
                phone_4: null,
                phone_5: null,
                error: "Failed to fetch profile",
            });
            errorCount++;
            continue;
        }

        const $profile = cheerio.load(profileHTML);

        const rawName =
            $profile("h1").first().text().trim() ||
            $profile(".person-name").first().text().trim() ||
            $profile(".person-header-name").first().text().trim() ||
            name;

        const { first_name, last_name } = splitName(rawName);

        const phones = [];
        $profile('a[href^="tel:"]').each((i, el) => {
            const phoneHref = $profile(el).attr("href");
            if (phoneHref) phones.push(phoneHref);
        });

        const phoneObj = phonesToObject(phones);

        await Actor.pushData({
            name,
            first_name,
            last_name,
            ...phoneObj,
        });
        
        successCount++;
        log.info(`Successfully processed: ${name}`);
    } catch (err) {
        log.error(`Error processing ${name}:`, err);
        errorCount++;
        try {
            await Actor.pushData({
                name,
                first_name: null,
                last_name: null,
                phone_1: null,
                phone_2: null,
                phone_3: null,
                phone_4: null,
                phone_5: null,
                error: err.message || "Unknown error",
            });
        } catch (pushErr) {
            log.error(`Failed to push error data for ${name}:`, pushErr);
        }
    }
}

log.info(`Completed! Success: ${successCount}, Errors: ${errorCount}`);
await Actor.exit();
