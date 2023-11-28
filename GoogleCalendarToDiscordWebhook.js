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

// Import Luxon
eval(
    UrlFetchApp.fetch('https://cdn.jsdelivr.net/npm/luxon@2.0.2/build/global/luxon.min.js').getContentText()
);
let DateTime = luxon.DateTime;
const DTnow = DateTime.now().startOf('minute'); // Will consider 'now' as the beginning the minute to deal with second offsets issues with trigger over time.

function postEventsToChannel() {
    // .list parameters for 30 minutes reminder
    let optionalArgs30 = {
        timeMin: DTnow.toISO(),
        timeMax: DTnow.plus({ minutes: minsInAdvance30 }).toISO(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
    };
    let response30 = Calendar.Events.list(CALENDAR_ID, optionalArgs30);
    let events30 = response30.items;
    if (events30.length > 0) {
        Logger.log(`${events30.length} event(s) found.`);
        for (i = 0; i < events30.length; i++) {
            let event = events30[i];
            let ISOStartDate = event.start.dateTime || event.start.date;
            let ISOEndDate = event.end.dateTime || event.end.date;

            if (DateTime.fromISO(ISOStartDate) < DTnow.plus({ minutes: minsInAdvance30 - 1 })) {
                Logger.log(`Event ${event.summary} [${event.id}] has already started. Skipping`);
                continue;
            }

            // Build the POST request for 30 minutes reminder
            let options = {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: JSON.stringify({
                    content: 'YOUR_30_MINUTES_REMINDER_CONTENT_WITH_DISCORD_MARKDOWN',
                }),
            };
            // Send the POST request
            Logger.log(options, null, 2);
            UrlFetchApp.fetch(CHANNEL_POST_URL, options);
        }
    } else {
        Logger.log(`No events starting within ${minsInAdvance30} minute(s) found.`);
    }

    // .list parameters. See https://developers.google.com/calendar/api/v3/reference/events/list?hl=en
    let optionalArgs = {
        timeMin: DTnow.toISO(),
        timeMax: DTnow.plus({ minutes: minsInAdvance }).toISO(), // Will only show events starting in the next x minutes
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
    };
    let response = Calendar.Events.list(CALENDAR_ID, optionalArgs);
    let events = response.items;
    if (events.length > 0) {
        Logger.log(`${events30.length} event(s) found.`);
        for (i = 0; i < events.length; i++) {
            let event = events[i];
            let ISOStartDate = event.start.dateTime || event.start.date;

            // The Calendar API's .list function will continously return events whose endDate has not been reached yet (timeMin is based on the event's end time)
            // Since this script is meant to run every minute, we have to skip these events ourselves
            if (DateTime.fromISO(ISOStartDate) < DTnow.plus({ minutes: minsInAdvance - 1 })) {
                Logger.log(`Event ${event.summary} [${event.id}] has already started. Skipping`);
                continue;
            }

            // Build the POST request
            let options = {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: JSON.stringify({
                    content: 'YOUR_ANNOUNCEMENT_CONTENT_WITH_DISCORD_MARKDOWN',
                }),
            };
            // Send the POST request
            Logger.log(options, null, 2);
            UrlFetchApp.fetch(CHANNEL_POST_URL, options);
        }
    } else {
        Logger.log(`No events starting within ${minsInAdvance} minute(s) found.`);
    }
}

/**
 * Converts an ISO string into a discord formatted timestamp
 *
 * @param {string} isoString
 * @returns {string}
 */
function ISOToDiscordUnix(isoString) {
    return `<t:${Math.floor(DateTime.fromISO(isoString).toSeconds())}:F>`;
}
