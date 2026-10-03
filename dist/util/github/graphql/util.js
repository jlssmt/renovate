import { DateTime } from "luxon";
//#region lib/util/github/graphql/util.ts
function prepareQuery(payloadQuery) {
	return `
    query($owner: String!, $name: String!, $cursor: String, $count: Int!) {
      repository(owner: $owner, name: $name) {
        isRepoPrivate: isPrivate
        payload: ${payloadQuery}
      }
    }
  `;
}
/**
* Tells whether the time `duration` is expired starting
* from the `date` (ISO date format) at the moment of `now`.
*/
function isDateExpired(currentTime, initialTimestamp, duration) {
	return currentTime >= DateTime.fromISO(initialTimestamp).plus(duration).toUTC();
}
//#endregion
export { isDateExpired, prepareQuery };

//# sourceMappingURL=util.js.map