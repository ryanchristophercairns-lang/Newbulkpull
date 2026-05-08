# Bulk Cyber Name & Phone Extractor

## Overview

This Apify actor extracts phone numbers and contact information from [cyberbackgroundchecks.com](https://www.cyberbackgroundchecks.com) for a bulk list of names. Perfect for people search, background check data collection, and contact research.

## Features

- **Bulk Processing**: Input multiple names and get results for all of them
- **Phone Extraction**: Automatically extracts up to 5 phone numbers per person
- **Web Scraping**: Uses Cheerio for fast HTML parsing
- **Error Handling**: Gracefully handles missing profiles and network errors
- **Structured Output**: Returns data in a clean, organized format

## How It Works

1. Takes a list of names (one per line)
2. Searches for each name on cyberbackgroundchecks.com
3. Finds the first matching profile
4. Extracts phone numbers and name information
5. Returns structured data with up to 5 phone numbers

## Input

The actor accepts the following input parameters:

```json
{
  "names": "John Smith\nJane Doe\nBob Johnson"
}
```

**names** (required): A newline-separated list of names to search for.

## Output

The actor outputs a dataset with the following fields for each person:

- `first_name`: Extracted first name
- `last_name`: Extracted last name
- `phone_1` to `phone_5`: Up to 5 phone numbers (cleaned of non-digits)

Example output:
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone_1": "5551234567",
  "phone_2": "5559876543",
  "phone_3": null,
  "phone_4": null,
  "phone_5": null
}
```

## Requirements

- Node.js 16+
- Apify account (to run on Apify platform)

## Local Testing

```bash
npm install
apify run
```

Or with Apify CLI:
```bash
apify build
apify run
```

## Performance

- **Timeout**: 5 minutes per actor run
- **Memory**: 1 GB
- **Rate**: ~1 second per name search

## Notes

- Phone numbers are deduplicated and limited to 5 per person
- Only digits are retained in phone numbers (formatting removed)
- If no profile is found, all fields will be null
- Request headers include User-Agent and Accept-Language for better success rates

## Legal & Disclaimer

Ensure you have the right to scrape cyberbackgroundchecks.com and comply with their Terms of Service and robots.txt. This actor is provided as-is for legitimate research and data collection purposes only.