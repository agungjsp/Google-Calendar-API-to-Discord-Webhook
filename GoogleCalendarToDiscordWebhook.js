// Google-Calendar-API-to-Discord-Webhook
// Original script by DJMuffinTops
// https://github.com/DjMuffinTops/Google-Calendar-API-to-Discord-Webhook

// This Google Apps Script Will Send a POST to a Discord Webhook creating embed messages of any events starting within the next minute of execution.
// Any events that have already started will not appear.
// This script should be triggered every minute using Google Triggers.
const CHANNEL_POST_URL = 'DISCORD_WEBHOOK_LINK_GOES_HERE';
const CALENDAR_ID = 'GOOGLE_CALENDAR_ID_GOES_HERE';
const NO_VALUE_FOUND = 'N/A';
const minsInAdvance = 1; // Set the number of minutes in advance you'd like events to be posted to discord. Must be 1 or greater
const minsInAdvance30 = 31; // It's a reminder for 30 minutes before the event starts
const minsInAdvance1440 = 1441; // It's a reminder for 24 hours before the event starts

// Import Luxon
eval(
    UrlFetchApp.fetch('https://cdn.jsdelivr.net/npm/luxon@2.0.2/build/global/luxon.min.js').getContentText()
);
let DateTime = luxon.DateTime;
const DTnow = DateTime.now().startOf('minute'); // Will consider 'now' as the beginning the minute to deal with second offsets issues with trigger over time.

/**
 * Main function
 */
function postEventsToChannel() {
    let events1440 = fetchEvents(minsInAdvance1440);
    sendPostRequest(events1440, minsInAdvance1440);

    let events30 = fetchEvents(minsInAdvance30);
    sendPostRequest(events30, minsInAdvance30);

    let events = fetchEvents(minsInAdvance);
    sendPostRequest(events, minsInAdvance);
}

/**
 * Fetches events from the calendar
 * @param {number} minsInAdvance
 * @returns {object}
 */
function fetchEvents(minsInAdvance) {
    let optionalArgs = {
        timeMin: DTnow.toISO(),
        timeMax: DTnow.plus({ minutes: minsInAdvance }).toISO(), // Will only show events starting in the next x minutes
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
    };
    let response = Calendar.Events.list(CALENDAR_ID, optionalArgs);
    let events = response.items;
    return events;
}

/**
 * Sends a POST request to the Discord webhook
 * @param {object} events
 * @param {number} minsInAdvance
 */
function sendPostRequest(events, minsInAdvance) {
    if (events.length > 0) {
        Logger.log(`${events.length} event(s) found.`);
        for (i = 0; i < events.length; i++) {
            let event = events[i];
            let ISOStartDate = event.start.dateTime || event.start.date;
            let ISOEndDate = event.end.dateTime || event.end.date;
            let content = '';

            if (minsInAdvance === 1) {
                content = `@everyone\n**${event.summary}** is starting now!`;
            } else {
                let eventSummary = event.summary;
                let startDate = ISOToDiscordUnix(ISOStartDate) ?? NO_VALUE_FOUND;
                let endDate = ISOToDiscordUnix(ISOEndDate) ?? NO_VALUE_FOUND;
                let eventDescription = convertHTMLToMarkdown(event.description) ?? NO_VALUE_FOUND;

                content = `Title: **${eventSummary}**\nStart: ${startDate}\nEnd: ${endDate}\nDescription: ${eventDescription}`;
            }

            if (DateTime.fromISO(ISOStartDate) < DTnow.plus({ minutes: minsInAdvance - 1 })) {
                Logger.log(`Event ${event.summary} [${event.id}] has already started. Skipping`);
                continue;
            }

            let options = {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: JSON.stringify({
                    content: content,
                }),
            };
            Logger.log(options, null, 2);
            UrlFetchApp.fetch(CHANNEL_POST_URL, options);
        }
    } else {
        Logger.log(`No events starting within ${minsInAdvance} minute(s) found.`);
    }
}

/**
 * Converts an ISO string into a discord formatted timestamp
 * @param {string} isoString
 * @returns {string}
 */
function ISOToDiscordUnix(isoString) {
    return `<t:${Math.floor(DateTime.fromISO(isoString).toSeconds())}:F>`;
}

/**
 * Converts HTML to Markdown
 * @param {string} html
 * @returns {string}
 */

function convertHTMLToMarkdown(html = '') {
    let markdown = html
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1')
        .replace(/<h4>(.*?)<\/h4>/gi, '#### $1')
        .replace(/<h5>(.*?)<\/h5>/gi, '##### $1')
        .replace(/<h6>(.*?)<\/h6>/gi, '###### $1')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n')
        .replace(/<br>/gi, '\n')
        .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '$1')
        .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<ul>/gi, '')
        .replace(/<\/ul>/gi, '')
        .replace(/<li>(.*?)<\/li>/gi, '* $1')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*');
    return markdown;
}
