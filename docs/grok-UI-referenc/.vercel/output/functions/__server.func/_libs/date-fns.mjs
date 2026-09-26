//#region node_modules/date-fns/constants.js
/**
* @constant
* @name daysInYear
* @summary Days in 1 year.
*
* @description
* How many days in a year.
*
* One years equals 365.2425 days according to the formula:
*
* > Leap year occurs every 4 years, except for years that are divisible by 100 and not divisible by 400.
* > 1 mean year = (365+1/4-1/100+1/400) days = 365.2425 days
*/
var daysInYear = 365.2425;
-(Math.pow(10, 8) * 24 * 60 * 60 * 1e3);
/**
* @constant
* @name millisecondsInMinute
* @summary Milliseconds in 1 minute
*/
var millisecondsInMinute = 6e4;
/**
* @constant
* @name minutesInYear
* @summary Minutes in 1 year.
*/
var minutesInYear = 525600;
/**
* @constant
* @name minutesInMonth
* @summary Minutes in 1 month.
*/
var minutesInMonth = 43200;
/**
* @constant
* @name minutesInDay
* @summary Minutes in 1 day.
*/
var minutesInDay = 1440;
/**
* @constant
* @name secondsInDay
* @summary Seconds in 1 day.
*/
var secondsInDay = 86400;
secondsInDay * 7;
secondsInDay * daysInYear / 12 * 3;
/**
* @constant
* @name constructFromSymbol
* @summary Symbol enabling Date extensions to inherit properties from the reference date.
*
* The symbol is used to enable the `constructFrom` function to construct a date
* using a reference date and a value. It allows to transfer extra properties
* from the reference date to the new date. It's useful for extensions like
* [`TZDate`](https://github.com/date-fns/tz) that accept a time zone as
* a constructor argument.
*/
var constructFromSymbol = Symbol.for("constructDateFrom");
//#endregion
//#region node_modules/date-fns/constructFrom.js
/**
* @name constructFrom
* @category Generic Helpers
* @summary Constructs a date using the reference date and the value
*
* @description
* The function constructs a new date using the constructor from the reference
* date and the given value. It helps to build generic functions that accept
* date extensions.
*
* It defaults to `Date` if the passed reference date is a number or a string.
*
* Starting from v3.7.0, it allows to construct a date using `[Symbol.for("constructDateFrom")]`
* enabling to transfer extra properties from the reference date to the new date.
* It's useful for extensions like [`TZDate`](https://github.com/date-fns/tz)
* that accept a time zone as a constructor argument.
*
* @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
*
* @param date - The reference date to take constructor from
* @param value - The value to create the date
*
* @returns Date initialized using the given date and value
*
* @example
* import { constructFrom } from "./constructFrom/date-fns";
*
* // A function that clones a date preserving the original type
* function cloneDate<DateType extends Date>(date: DateType): DateType {
*   return constructFrom(
*     date, // Use constructor from the given date
*     date.getTime() // Use the date value to create a new date
*   );
* }
*/
function constructFrom(date, value) {
	if (typeof date === "function") return date(value);
	if (date && typeof date === "object" && constructFromSymbol in date) return date[constructFromSymbol](value);
	if (date instanceof Date) return new date.constructor(value);
	return new Date(value);
}
//#endregion
//#region node_modules/date-fns/toDate.js
/**
* @name toDate
* @category Common Helpers
* @summary Convert the given argument to an instance of Date.
*
* @description
* Convert the given argument to an instance of Date.
*
* If the argument is an instance of Date, the function returns its clone.
*
* If the argument is a number, it is treated as a timestamp.
*
* If the argument is none of the above, the function returns Invalid Date.
*
* Starting from v3.7.0, it clones a date using `[Symbol.for("constructDateFrom")]`
* enabling to transfer extra properties from the reference date to the new date.
* It's useful for extensions like [`TZDate`](https://github.com/date-fns/tz)
* that accept a time zone as a constructor argument.
*
* **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
*
* @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
* @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
*
* @param argument - The value to convert
*
* @returns The parsed date in the local time zone
*
* @example
* // Clone the date:
* const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
* //=> Tue Feb 11 2014 11:30:30
*
* @example
* // Convert the timestamp to date:
* const result = toDate(1392098430000)
* //=> Tue Feb 11 2014 11:30:30
*/
function toDate(argument, context) {
	return constructFrom(context || argument, argument);
}
//#endregion
//#region node_modules/date-fns/_lib/defaultOptions.js
var defaultOptions = {};
function getDefaultOptions() {
	return defaultOptions;
}
//#endregion
//#region node_modules/date-fns/startOfWeek.js
/**
* The {@link startOfWeek} function options.
*/
/**
* @name startOfWeek
* @category Week Helpers
* @summary Return the start of a week for the given date.
*
* @description
* Return the start of a week for the given date.
* The result will be in the local timezone.
*
* @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
* @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
*
* @param date - The original date
* @param options - An object with options
*
* @returns The start of a week
*
* @example
* // The start of a week for 2 September 2014 11:55:00:
* const result = startOfWeek(new Date(2014, 8, 2, 11, 55, 0))
* //=> Sun Aug 31 2014 00:00:00
*
* @example
* // If the week starts on Monday, the start of the week for 2 September 2014 11:55:00:
* const result = startOfWeek(new Date(2014, 8, 2, 11, 55, 0), { weekStartsOn: 1 })
* //=> Mon Sep 01 2014 00:00:00
*/
function startOfWeek(date, options) {
	const defaultOptions = getDefaultOptions();
	const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions.weekStartsOn ?? defaultOptions.locale?.options?.weekStartsOn ?? 0;
	const _date = toDate(date, options?.in);
	const day = _date.getDay();
	const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
	_date.setDate(_date.getDate() - diff);
	_date.setHours(0, 0, 0, 0);
	return _date;
}
//#endregion
//#region node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
/**
* Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
* They usually appear for dates that denote time before the timezones were introduced
* (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
* and GMT+01:00:00 after that date)
*
* Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
* which would lead to incorrect calculations.
*
* This function returns the timezone offset in milliseconds that takes seconds in account.
*/
function getTimezoneOffsetInMilliseconds(date) {
	const _date = toDate(date);
	const utcDate = new Date(Date.UTC(_date.getFullYear(), _date.getMonth(), _date.getDate(), _date.getHours(), _date.getMinutes(), _date.getSeconds(), _date.getMilliseconds()));
	utcDate.setUTCFullYear(_date.getFullYear());
	return +date - +utcDate;
}
//#endregion
//#region node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
	const normalize = constructFrom.bind(null, context || dates.find((date) => typeof date === "object"));
	return dates.map(normalize);
}
//#endregion
//#region node_modules/date-fns/compareAsc.js
/**
* @name compareAsc
* @category Common Helpers
* @summary Compare the two dates and return -1, 0 or 1.
*
* @description
* Compare the two dates and return 1 if the first date is after the second,
* -1 if the first date is before the second or 0 if dates are equal.
*
* @param dateLeft - The first date to compare
* @param dateRight - The second date to compare
*
* @returns The result of the comparison
*
* @example
* // Compare 11 February 1987 and 10 July 1989:
* const result = compareAsc(new Date(1987, 1, 11), new Date(1989, 6, 10))
* //=> -1
*
* @example
* // Sort the array of dates:
* const result = [
*   new Date(1995, 6, 2),
*   new Date(1987, 1, 11),
*   new Date(1989, 6, 10)
* ].sort(compareAsc)
* //=> [
* //   Wed Feb 11 1987 00:00:00,
* //   Mon Jul 10 1989 00:00:00,
* //   Sun Jul 02 1995 00:00:00
* // ]
*/
function compareAsc(dateLeft, dateRight) {
	const diff = +toDate(dateLeft) - +toDate(dateRight);
	if (diff < 0) return -1;
	else if (diff > 0) return 1;
	return diff;
}
//#endregion
//#region node_modules/date-fns/constructNow.js
/**
* @name constructNow
* @category Generic Helpers
* @summary Constructs a new current date using the passed value constructor.
* @pure false
*
* @description
* The function constructs a new current date using the constructor from
* the reference date. It helps to build generic functions that accept date
* extensions and use the current date.
*
* It defaults to `Date` if the passed reference date is a number or a string.
*
* @param date - The reference date to take constructor from
*
* @returns Current date initialized using the given date constructor
*
* @example
* import { constructNow, isSameDay } from 'date-fns'
*
* function isToday<DateType extends Date>(
*   date: DateArg<DateType>,
* ): boolean {
*   // If we were to use `new Date()` directly, the function would  behave
*   // differently in different timezones and return false for the same date.
*   return isSameDay(date, constructNow(date));
* }
*/
function constructNow(date) {
	return constructFrom(date, Date.now());
}
//#endregion
//#region node_modules/date-fns/_lib/getRoundingMethod.js
function getRoundingMethod(method) {
	return (number) => {
		const result = (method ? Math[method] : Math.trunc)(number);
		return result === 0 ? 0 : result;
	};
}
//#endregion
//#region node_modules/date-fns/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale$1 = {
	lessThanXSeconds: {
		one: "less than a second",
		other: "less than {{count}} seconds"
	},
	xSeconds: {
		one: "1 second",
		other: "{{count}} seconds"
	},
	halfAMinute: "half a minute",
	lessThanXMinutes: {
		one: "less than a minute",
		other: "less than {{count}} minutes"
	},
	xMinutes: {
		one: "1 minute",
		other: "{{count}} minutes"
	},
	aboutXHours: {
		one: "about 1 hour",
		other: "about {{count}} hours"
	},
	xHours: {
		one: "1 hour",
		other: "{{count}} hours"
	},
	xDays: {
		one: "1 day",
		other: "{{count}} days"
	},
	aboutXWeeks: {
		one: "about 1 week",
		other: "about {{count}} weeks"
	},
	xWeeks: {
		one: "1 week",
		other: "{{count}} weeks"
	},
	aboutXMonths: {
		one: "about 1 month",
		other: "about {{count}} months"
	},
	xMonths: {
		one: "1 month",
		other: "{{count}} months"
	},
	aboutXYears: {
		one: "about 1 year",
		other: "about {{count}} years"
	},
	xYears: {
		one: "1 year",
		other: "{{count}} years"
	},
	overXYears: {
		one: "over 1 year",
		other: "over {{count}} years"
	},
	almostXYears: {
		one: "almost 1 year",
		other: "almost {{count}} years"
	}
};
var formatDistance$1 = (token, count, options) => {
	let result;
	const tokenValue = formatDistanceLocale$1[token];
	if (typeof tokenValue === "string") result = tokenValue;
	else if (count === 1) result = tokenValue.one;
	else result = tokenValue.other.replace("{{count}}", count.toString());
	if (options?.addSuffix) {
		if (options.comparison && options.comparison > 0) return "in " + result;
		else return result + " ago";
	}
	return result;
};
//#endregion
//#region node_modules/date-fns/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
	return (options = {}) => {
		const width = options.width ? String(options.width) : args.defaultWidth;
		return args.formats[width] || args.formats[args.defaultWidth];
	};
}
var formatLong$1 = {
	date: buildFormatLongFn({
		formats: {
			full: "EEEE, MMMM do, y",
			long: "MMMM do, y",
			medium: "MMM d, y",
			short: "MM/dd/yyyy"
		},
		defaultWidth: "full"
	}),
	time: buildFormatLongFn({
		formats: {
			full: "h:mm:ss a zzzz",
			long: "h:mm:ss a z",
			medium: "h:mm:ss a",
			short: "h:mm a"
		},
		defaultWidth: "full"
	}),
	dateTime: buildFormatLongFn({
		formats: {
			full: "{{date}} 'at' {{time}}",
			long: "{{date}} 'at' {{time}}",
			medium: "{{date}}, {{time}}",
			short: "{{date}}, {{time}}"
		},
		defaultWidth: "full"
	})
};
//#endregion
//#region node_modules/date-fns/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale$1 = {
	lastWeek: "'last' eeee 'at' p",
	yesterday: "'yesterday at' p",
	today: "'today at' p",
	tomorrow: "'tomorrow at' p",
	nextWeek: "eeee 'at' p",
	other: "P"
};
var formatRelative$1 = (token, _date, _baseDate, _options) => formatRelativeLocale$1[token];
//#endregion
//#region node_modules/date-fns/locale/_lib/buildLocalizeFn.js
/**
* The localize function argument callback which allows to convert raw value to
* the actual type.
*
* @param value - The value to convert
*
* @returns The converted value
*/
/**
* The map of localized values for each width.
*/
/**
* The index type of the locale unit value. It types conversion of units of
* values that don't start at 0 (i.e. quarters).
*/
/**
* Converts the unit value to the tuple of values.
*/
/**
* The tuple of localized era values. The first element represents BC,
* the second element represents AD.
*/
/**
* The tuple of localized quarter values. The first element represents Q1.
*/
/**
* The tuple of localized day values. The first element represents Sunday.
*/
/**
* The tuple of localized month values. The first element represents January.
*/
function buildLocalizeFn(args) {
	return (value, options) => {
		const context = options?.context ? String(options.context) : "standalone";
		let valuesArray;
		if (context === "formatting" && args.formattingValues) {
			const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
			const width = options?.width ? String(options.width) : defaultWidth;
			valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
		} else {
			const defaultWidth = args.defaultWidth;
			const width = options?.width ? String(options.width) : args.defaultWidth;
			valuesArray = args.values[width] || args.values[defaultWidth];
		}
		const index = args.argumentCallback ? args.argumentCallback(value) : value;
		return valuesArray[index];
	};
}
//#endregion
//#region node_modules/date-fns/locale/en-US/_lib/localize.js
var eraValues$1 = {
	narrow: ["B", "A"],
	abbreviated: ["BC", "AD"],
	wide: ["Before Christ", "Anno Domini"]
};
var quarterValues$1 = {
	narrow: [
		"1",
		"2",
		"3",
		"4"
	],
	abbreviated: [
		"Q1",
		"Q2",
		"Q3",
		"Q4"
	],
	wide: [
		"1st quarter",
		"2nd quarter",
		"3rd quarter",
		"4th quarter"
	]
};
var monthValues$1 = {
	narrow: [
		"J",
		"F",
		"M",
		"A",
		"M",
		"J",
		"J",
		"A",
		"S",
		"O",
		"N",
		"D"
	],
	abbreviated: [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec"
	],
	wide: [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	]
};
var dayValues$1 = {
	narrow: [
		"S",
		"M",
		"T",
		"W",
		"T",
		"F",
		"S"
	],
	short: [
		"Su",
		"Mo",
		"Tu",
		"We",
		"Th",
		"Fr",
		"Sa"
	],
	abbreviated: [
		"Sun",
		"Mon",
		"Tue",
		"Wed",
		"Thu",
		"Fri",
		"Sat"
	],
	wide: [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday"
	]
};
var dayPeriodValues$1 = {
	narrow: {
		am: "a",
		pm: "p",
		midnight: "mi",
		noon: "n",
		morning: "morning",
		afternoon: "afternoon",
		evening: "evening",
		night: "night"
	},
	abbreviated: {
		am: "AM",
		pm: "PM",
		midnight: "midnight",
		noon: "noon",
		morning: "morning",
		afternoon: "afternoon",
		evening: "evening",
		night: "night"
	},
	wide: {
		am: "a.m.",
		pm: "p.m.",
		midnight: "midnight",
		noon: "noon",
		morning: "morning",
		afternoon: "afternoon",
		evening: "evening",
		night: "night"
	}
};
var formattingDayPeriodValues$1 = {
	narrow: {
		am: "a",
		pm: "p",
		midnight: "mi",
		noon: "n",
		morning: "in the morning",
		afternoon: "in the afternoon",
		evening: "in the evening",
		night: "at night"
	},
	abbreviated: {
		am: "AM",
		pm: "PM",
		midnight: "midnight",
		noon: "noon",
		morning: "in the morning",
		afternoon: "in the afternoon",
		evening: "in the evening",
		night: "at night"
	},
	wide: {
		am: "a.m.",
		pm: "p.m.",
		midnight: "midnight",
		noon: "noon",
		morning: "in the morning",
		afternoon: "in the afternoon",
		evening: "in the evening",
		night: "at night"
	}
};
var ordinalNumber$1 = (dirtyNumber, _options) => {
	const number = Number(dirtyNumber);
	const rem100 = number % 100;
	if (rem100 > 20 || rem100 < 10) switch (rem100 % 10) {
		case 1: return number + "st";
		case 2: return number + "nd";
		case 3: return number + "rd";
	}
	return number + "th";
};
var localize$1 = {
	ordinalNumber: ordinalNumber$1,
	era: buildLocalizeFn({
		values: eraValues$1,
		defaultWidth: "wide"
	}),
	quarter: buildLocalizeFn({
		values: quarterValues$1,
		defaultWidth: "wide",
		argumentCallback: (quarter) => quarter - 1
	}),
	month: buildLocalizeFn({
		values: monthValues$1,
		defaultWidth: "wide"
	}),
	day: buildLocalizeFn({
		values: dayValues$1,
		defaultWidth: "wide"
	}),
	dayPeriod: buildLocalizeFn({
		values: dayPeriodValues$1,
		defaultWidth: "wide",
		formattingValues: formattingDayPeriodValues$1,
		defaultFormattingWidth: "wide"
	})
};
//#endregion
//#region node_modules/date-fns/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
	return (string, options = {}) => {
		const width = options.width;
		const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
		const matchResult = string.match(matchPattern);
		if (!matchResult) return null;
		const matchedString = matchResult[0];
		const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
		const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : findKey(parsePatterns, (pattern) => pattern.test(matchedString));
		let value;
		value = args.valueCallback ? args.valueCallback(key) : key;
		value = options.valueCallback ? options.valueCallback(value) : value;
		const rest = string.slice(matchedString.length);
		return {
			value,
			rest
		};
	};
}
function findKey(object, predicate) {
	for (const key in object) if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) return key;
}
function findIndex(array, predicate) {
	for (let key = 0; key < array.length; key++) if (predicate(array[key])) return key;
}
//#endregion
//#region node_modules/date-fns/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
	return (string, options = {}) => {
		const matchResult = string.match(args.matchPattern);
		if (!matchResult) return null;
		const matchedString = matchResult[0];
		const parseResult = string.match(args.parsePattern);
		if (!parseResult) return null;
		let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
		value = options.valueCallback ? options.valueCallback(value) : value;
		const rest = string.slice(matchedString.length);
		return {
			value,
			rest
		};
	};
}
//#endregion
//#region node_modules/date-fns/locale/en-US.js
/**
* @category Locales
* @summary English locale (United States).
* @language English
* @iso-639-2 eng
* @author Sasha Koss [@kossnocorp](https://github.com/kossnocorp)
* @author Lesha Koss [@leshakoss](https://github.com/leshakoss)
*/
var enUS = {
	code: "en-US",
	formatDistance: formatDistance$1,
	formatLong: formatLong$1,
	formatRelative: formatRelative$1,
	localize: localize$1,
	match: {
		ordinalNumber: buildMatchPatternFn({
			matchPattern: /^(\d+)(th|st|nd|rd)?/i,
			parsePattern: /\d+/i,
			valueCallback: (value) => parseInt(value, 10)
		}),
		era: buildMatchFn({
			matchPatterns: {
				narrow: /^(b|a)/i,
				abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
				wide: /^(before christ|before common era|anno domini|common era)/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: { any: [/^b/i, /^(a|c)/i] },
			defaultParseWidth: "any"
		}),
		quarter: buildMatchFn({
			matchPatterns: {
				narrow: /^[1234]/i,
				abbreviated: /^q[1234]/i,
				wide: /^[1234](th|st|nd|rd)? quarter/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: { any: [
				/1/i,
				/2/i,
				/3/i,
				/4/i
			] },
			defaultParseWidth: "any",
			valueCallback: (index) => index + 1
		}),
		month: buildMatchFn({
			matchPatterns: {
				narrow: /^[jfmasond]/i,
				abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
				wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: {
				narrow: [
					/^j/i,
					/^f/i,
					/^m/i,
					/^a/i,
					/^m/i,
					/^j/i,
					/^j/i,
					/^a/i,
					/^s/i,
					/^o/i,
					/^n/i,
					/^d/i
				],
				any: [
					/^ja/i,
					/^f/i,
					/^mar/i,
					/^ap/i,
					/^may/i,
					/^jun/i,
					/^jul/i,
					/^au/i,
					/^s/i,
					/^o/i,
					/^n/i,
					/^d/i
				]
			},
			defaultParseWidth: "any"
		}),
		day: buildMatchFn({
			matchPatterns: {
				narrow: /^[smtwf]/i,
				short: /^(su|mo|tu|we|th|fr|sa)/i,
				abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
				wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: {
				narrow: [
					/^s/i,
					/^m/i,
					/^t/i,
					/^w/i,
					/^t/i,
					/^f/i,
					/^s/i
				],
				any: [
					/^su/i,
					/^m/i,
					/^tu/i,
					/^w/i,
					/^th/i,
					/^f/i,
					/^sa/i
				]
			},
			defaultParseWidth: "any"
		}),
		dayPeriod: buildMatchFn({
			matchPatterns: {
				narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
				any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
			},
			defaultMatchWidth: "any",
			parsePatterns: { any: {
				am: /^a/i,
				pm: /^p/i,
				midnight: /^mi/i,
				noon: /^no/i,
				morning: /morning/i,
				afternoon: /afternoon/i,
				evening: /evening/i,
				night: /night/i
			} },
			defaultParseWidth: "any"
		})
	},
	options: {
		weekStartsOn: 0,
		firstWeekContainsDate: 1
	}
};
//#endregion
//#region node_modules/date-fns/formatDistanceStrict.js
/**
* The {@link formatDistanceStrict} function options.
*/
/**
* The unit used to format the distance in {@link formatDistanceStrict}.
*/
/**
* @name formatDistanceStrict
* @category Common Helpers
* @summary Return the distance between the given dates in words.
*
* @description
* Return the distance between the given dates in words, using strict units.
* This is like `formatDistance`, but does not use helpers like 'almost', 'over',
* 'less than' and the like.
*
* | Distance between dates | Result              |
* |------------------------|---------------------|
* | 0 ... 59 secs          | [0..59] seconds     |
* | 1 ... 59 mins          | [1..59] minutes     |
* | 1 ... 23 hrs           | [1..23] hours       |
* | 1 ... 29 days          | [1..29] days        |
* | 1 ... 11 months        | [1..11] months      |
* | 1 ... N years          | [1..N]  years       |
*
* @param laterDate - The date
* @param earlierDate - The date to compare with
* @param options - An object with options
*
* @returns The distance in words
*
* @throws `date` must not be Invalid Date
* @throws `baseDate` must not be Invalid Date
* @throws `options.unit` must be 'second', 'minute', 'hour', 'day', 'month' or 'year'
* @throws `options.locale` must contain `formatDistance` property
*
* @example
* // What is the distance between 2 July 2014 and 1 January 2015?
* const result = formatDistanceStrict(new Date(2014, 6, 2), new Date(2015, 0, 2))
* //=> '6 months'
*
* @example
* // What is the distance between 1 January 2015 00:00:15
* // and 1 January 2015 00:00:00?
* const result = formatDistanceStrict(
*   new Date(2015, 0, 1, 0, 0, 15),
*   new Date(2015, 0, 1, 0, 0, 0)
* )
* //=> '15 seconds'
*
* @example
* // What is the distance from 1 January 2016
* // to 1 January 2015, with a suffix?
* const result = formatDistanceStrict(new Date(2015, 0, 1), new Date(2016, 0, 1), {
*   addSuffix: true
* })
* //=> '1 year ago'
*
* @example
* // What is the distance from 1 January 2016
* // to 1 January 2015, in minutes?
* const result = formatDistanceStrict(new Date(2016, 0, 1), new Date(2015, 0, 1), {
*   unit: 'minute'
* })
* //=> '525600 minutes'
*
* @example
* // What is the distance from 1 January 2015
* // to 28 January 2015, in months, rounded up?
* const result = formatDistanceStrict(new Date(2015, 0, 28), new Date(2015, 0, 1), {
*   unit: 'month',
*   roundingMethod: 'ceil'
* })
* //=> '1 month'
*
* @example
* // What is the distance between 1 August 2016 and 1 January 2015 in Esperanto?
* import { eoLocale } from 'date-fns/locale/eo'
* const result = formatDistanceStrict(new Date(2016, 7, 1), new Date(2015, 0, 1), {
*   locale: eoLocale
* })
* //=> '1 jaro'
*/
function formatDistanceStrict(laterDate, earlierDate, options) {
	const defaultOptions = getDefaultOptions();
	const locale = options?.locale ?? defaultOptions.locale ?? enUS;
	const comparison = compareAsc(laterDate, earlierDate);
	if (isNaN(comparison)) throw new RangeError("Invalid time value");
	const localizeOptions = Object.assign({}, options, {
		addSuffix: options?.addSuffix,
		comparison
	});
	const [laterDate_, earlierDate_] = normalizeDates(options?.in, ...comparison > 0 ? [earlierDate, laterDate] : [laterDate, earlierDate]);
	const roundingMethod = getRoundingMethod(options?.roundingMethod ?? "round");
	const milliseconds = earlierDate_.getTime() - laterDate_.getTime();
	const minutes = milliseconds / millisecondsInMinute;
	const dstNormalizedMinutes = (milliseconds - (getTimezoneOffsetInMilliseconds(earlierDate_) - getTimezoneOffsetInMilliseconds(laterDate_))) / millisecondsInMinute;
	const defaultUnit = options?.unit;
	let unit;
	if (!defaultUnit) {
		if (minutes < 1) unit = "second";
		else if (minutes < 60) unit = "minute";
		else if (minutes < 1440) unit = "hour";
		else if (dstNormalizedMinutes < 43200) unit = "day";
		else if (dstNormalizedMinutes < 525600) unit = "month";
		else unit = "year";
	} else unit = defaultUnit;
	if (unit === "second") {
		const seconds = roundingMethod(milliseconds / 1e3);
		return locale.formatDistance("xSeconds", seconds, localizeOptions);
	} else if (unit === "minute") {
		const roundedMinutes = roundingMethod(minutes);
		return locale.formatDistance("xMinutes", roundedMinutes, localizeOptions);
	} else if (unit === "hour") {
		const hours = roundingMethod(minutes / 60);
		return locale.formatDistance("xHours", hours, localizeOptions);
	} else if (unit === "day") {
		const days = roundingMethod(dstNormalizedMinutes / minutesInDay);
		return locale.formatDistance("xDays", days, localizeOptions);
	} else if (unit === "month") {
		const months = roundingMethod(dstNormalizedMinutes / minutesInMonth);
		return months === 12 && defaultUnit !== "month" ? locale.formatDistance("xYears", 1, localizeOptions) : locale.formatDistance("xMonths", months, localizeOptions);
	} else {
		const years = roundingMethod(dstNormalizedMinutes / minutesInYear);
		return locale.formatDistance("xYears", years, localizeOptions);
	}
}
//#endregion
//#region node_modules/date-fns/formatDistanceToNowStrict.js
/**
* The {@link formatDistanceToNowStrict} function options.
*/
/**
* @name formatDistanceToNowStrict
* @category Common Helpers
* @summary Return the distance between the given date and now in words.
* @pure false
*
* @description
* Return the distance between the given dates in words, using strict units.
* This is like `formatDistance`, but does not use helpers like 'almost', 'over',
* 'less than' and the like.
*
* | Distance between dates | Result              |
* |------------------------|---------------------|
* | 0 ... 59 secs          | [0..59] seconds     |
* | 1 ... 59 mins          | [1..59] minutes     |
* | 1 ... 23 hrs           | [1..23] hours       |
* | 1 ... 29 days          | [1..29] days        |
* | 1 ... 11 months        | [1..11] months      |
* | 1 ... N years          | [1..N]  years       |
*
* @param date - The given date
* @param options - An object with options.
*
* @returns The distance in words
*
* @throws `date` must not be Invalid Date
* @throws `options.locale` must contain `formatDistance` property
*
* @example
* // If today is 1 January 2015, what is the distance to 2 July 2014?
* const result = formatDistanceToNowStrict(
*   new Date(2014, 6, 2)
* )
* //=> '6 months'
*
* @example
* // If now is 1 January 2015 00:00:00,
* // what is the distance to 1 January 2015 00:00:15, including seconds?
* const result = formatDistanceToNowStrict(
*   new Date(2015, 0, 1, 0, 0, 15)
* )
* //=> '15 seconds'
*
* @example
* // If today is 1 January 2015,
* // what is the distance to 1 January 2016, with a suffix?
* const result = formatDistanceToNowStrict(
*   new Date(2016, 0, 1),
*   {addSuffix: true}
* )
* //=> 'in 1 year'
*
* @example
* // If today is 28 January 2015,
* // what is the distance to 1 January 2015, in months, rounded up??
* const result = formatDistanceToNowStrict(new Date(2015, 0, 1), {
*   unit: 'month',
*   roundingMethod: 'ceil'
* })
* //=> '1 month'
*
* @example
* // If today is 1 January 2015,
* // what is the distance to 1 January 2016 in Esperanto?
* const eoLocale = require('date-fns/locale/eo')
* const result = formatDistanceToNowStrict(
*   new Date(2016, 0, 1),
*   {locale: eoLocale}
* )
* //=> '1 jaro'
*/
function formatDistanceToNowStrict(date, options) {
	return formatDistanceStrict(date, constructNow(date), options);
}
//#endregion
//#region node_modules/date-fns/isSameWeek.js
/**
* The {@link isSameWeek} function options.
*/
/**
* @name isSameWeek
* @category Week Helpers
* @summary Are the given dates in the same week (and month and year)?
*
* @description
* Are the given dates in the same week (and month and year)?
*
* @param laterDate - The first date to check
* @param earlierDate - The second date to check
* @param options - An object with options
*
* @returns The dates are in the same week (and month and year)
*
* @example
* // Are 31 August 2014 and 4 September 2014 in the same week?
* const result = isSameWeek(new Date(2014, 7, 31), new Date(2014, 8, 4))
* //=> true
*
* @example
* // If week starts with Monday,
* // are 31 August 2014 and 4 September 2014 in the same week?
* const result = isSameWeek(new Date(2014, 7, 31), new Date(2014, 8, 4), {
*   weekStartsOn: 1
* })
* //=> false
*
* @example
* // Are 1 January 2014 and 1 January 2015 in the same week?
* const result = isSameWeek(new Date(2014, 0, 1), new Date(2015, 0, 1))
* //=> false
*/
function isSameWeek(laterDate, earlierDate, options) {
	const [laterDate_, earlierDate_] = normalizeDates(options?.in, laterDate, earlierDate);
	return +startOfWeek(laterDate_, options) === +startOfWeek(earlierDate_, options);
}
//#endregion
//#region node_modules/date-fns/locale/zh-CN/_lib/formatDistance.js
var formatDistanceLocale = {
	lessThanXSeconds: {
		one: "不到 1 秒",
		other: "不到 {{count}} 秒"
	},
	xSeconds: {
		one: "1 秒",
		other: "{{count}} 秒"
	},
	halfAMinute: "半分钟",
	lessThanXMinutes: {
		one: "不到 1 分钟",
		other: "不到 {{count}} 分钟"
	},
	xMinutes: {
		one: "1 分钟",
		other: "{{count}} 分钟"
	},
	xHours: {
		one: "1 小时",
		other: "{{count}} 小时"
	},
	aboutXHours: {
		one: "大约 1 小时",
		other: "大约 {{count}} 小时"
	},
	xDays: {
		one: "1 天",
		other: "{{count}} 天"
	},
	aboutXWeeks: {
		one: "大约 1 个星期",
		other: "大约 {{count}} 个星期"
	},
	xWeeks: {
		one: "1 个星期",
		other: "{{count}} 个星期"
	},
	aboutXMonths: {
		one: "大约 1 个月",
		other: "大约 {{count}} 个月"
	},
	xMonths: {
		one: "1 个月",
		other: "{{count}} 个月"
	},
	aboutXYears: {
		one: "大约 1 年",
		other: "大约 {{count}} 年"
	},
	xYears: {
		one: "1 年",
		other: "{{count}} 年"
	},
	overXYears: {
		one: "超过 1 年",
		other: "超过 {{count}} 年"
	},
	almostXYears: {
		one: "将近 1 年",
		other: "将近 {{count}} 年"
	}
};
var formatDistance = (token, count, options) => {
	let result;
	const tokenValue = formatDistanceLocale[token];
	if (typeof tokenValue === "string") result = tokenValue;
	else if (count === 1) result = tokenValue.one;
	else result = tokenValue.other.replace("{{count}}", String(count));
	if (options?.addSuffix) {
		if (options.comparison && options.comparison > 0) return result + "内";
		else return result + "前";
	}
	return result;
};
var formatLong = {
	date: buildFormatLongFn({
		formats: {
			full: "y'年'M'月'd'日' EEEE",
			long: "y'年'M'月'd'日'",
			medium: "yyyy-MM-dd",
			short: "yy-MM-dd"
		},
		defaultWidth: "full"
	}),
	time: buildFormatLongFn({
		formats: {
			full: "zzzz a h:mm:ss",
			long: "z a h:mm:ss",
			medium: "a h:mm:ss",
			short: "a h:mm"
		},
		defaultWidth: "full"
	}),
	dateTime: buildFormatLongFn({
		formats: {
			full: "{{date}} {{time}}",
			long: "{{date}} {{time}}",
			medium: "{{date}} {{time}}",
			short: "{{date}} {{time}}"
		},
		defaultWidth: "full"
	})
};
//#endregion
//#region node_modules/date-fns/locale/zh-CN/_lib/formatRelative.js
function checkWeek(date, baseDate, options) {
	const baseFormat = "eeee p";
	if (isSameWeek(date, baseDate, options)) return baseFormat;
	else if (date.getTime() > baseDate.getTime()) return "'下个'eeee p";
	return "'上个'eeee p";
}
var formatRelativeLocale = {
	lastWeek: checkWeek,
	yesterday: "'昨天' p",
	today: "'今天' p",
	tomorrow: "'明天' p",
	nextWeek: checkWeek,
	other: "PP p"
};
var formatRelative = (token, date, baseDate, options) => {
	const format = formatRelativeLocale[token];
	if (typeof format === "function") return format(date, baseDate, options);
	return format;
};
//#endregion
//#region node_modules/date-fns/locale/zh-CN/_lib/localize.js
var eraValues = {
	narrow: ["前", "公元"],
	abbreviated: ["前", "公元"],
	wide: ["公元前", "公元"]
};
var quarterValues = {
	narrow: [
		"1",
		"2",
		"3",
		"4"
	],
	abbreviated: [
		"第一季",
		"第二季",
		"第三季",
		"第四季"
	],
	wide: [
		"第一季度",
		"第二季度",
		"第三季度",
		"第四季度"
	]
};
var monthValues = {
	narrow: [
		"一",
		"二",
		"三",
		"四",
		"五",
		"六",
		"七",
		"八",
		"九",
		"十",
		"十一",
		"十二"
	],
	abbreviated: [
		"1月",
		"2月",
		"3月",
		"4月",
		"5月",
		"6月",
		"7月",
		"8月",
		"9月",
		"10月",
		"11月",
		"12月"
	],
	wide: [
		"一月",
		"二月",
		"三月",
		"四月",
		"五月",
		"六月",
		"七月",
		"八月",
		"九月",
		"十月",
		"十一月",
		"十二月"
	]
};
var dayValues = {
	narrow: [
		"日",
		"一",
		"二",
		"三",
		"四",
		"五",
		"六"
	],
	short: [
		"日",
		"一",
		"二",
		"三",
		"四",
		"五",
		"六"
	],
	abbreviated: [
		"周日",
		"周一",
		"周二",
		"周三",
		"周四",
		"周五",
		"周六"
	],
	wide: [
		"星期日",
		"星期一",
		"星期二",
		"星期三",
		"星期四",
		"星期五",
		"星期六"
	]
};
var dayPeriodValues = {
	narrow: {
		am: "上",
		pm: "下",
		midnight: "凌晨",
		noon: "午",
		morning: "早",
		afternoon: "下午",
		evening: "晚",
		night: "夜"
	},
	abbreviated: {
		am: "上午",
		pm: "下午",
		midnight: "凌晨",
		noon: "中午",
		morning: "早晨",
		afternoon: "中午",
		evening: "晚上",
		night: "夜间"
	},
	wide: {
		am: "上午",
		pm: "下午",
		midnight: "凌晨",
		noon: "中午",
		morning: "早晨",
		afternoon: "中午",
		evening: "晚上",
		night: "夜间"
	}
};
var formattingDayPeriodValues = {
	narrow: {
		am: "上",
		pm: "下",
		midnight: "凌晨",
		noon: "午",
		morning: "早",
		afternoon: "下午",
		evening: "晚",
		night: "夜"
	},
	abbreviated: {
		am: "上午",
		pm: "下午",
		midnight: "凌晨",
		noon: "中午",
		morning: "早晨",
		afternoon: "中午",
		evening: "晚上",
		night: "夜间"
	},
	wide: {
		am: "上午",
		pm: "下午",
		midnight: "凌晨",
		noon: "中午",
		morning: "早晨",
		afternoon: "中午",
		evening: "晚上",
		night: "夜间"
	}
};
var ordinalNumber = (dirtyNumber, options) => {
	const number = Number(dirtyNumber);
	switch (options?.unit) {
		case "date": return number.toString() + "日";
		case "hour": return number.toString() + "时";
		case "minute": return number.toString() + "分";
		case "second": return number.toString() + "秒";
		default: return "第 " + number.toString();
	}
};
//#endregion
//#region node_modules/date-fns/locale/zh-CN.js
/**
* @category Locales
* @summary Chinese Simplified locale.
* @language Chinese Simplified
* @iso-639-2 zho
* @author Changyu Geng [@KingMario](https://github.com/KingMario)
* @author Song Shuoyun [@fnlctrl](https://github.com/fnlctrl)
* @author sabrinaM [@sabrinamiao](https://github.com/sabrinamiao)
* @author Carney Wu [@cubicwork](https://github.com/cubicwork)
* @author Terrence Lam [@skyuplam](https://github.com/skyuplam)
*/
var zhCN = {
	code: "zh-CN",
	formatDistance,
	formatLong,
	formatRelative,
	localize: {
		ordinalNumber,
		era: buildLocalizeFn({
			values: eraValues,
			defaultWidth: "wide"
		}),
		quarter: buildLocalizeFn({
			values: quarterValues,
			defaultWidth: "wide",
			argumentCallback: (quarter) => quarter - 1
		}),
		month: buildLocalizeFn({
			values: monthValues,
			defaultWidth: "wide"
		}),
		day: buildLocalizeFn({
			values: dayValues,
			defaultWidth: "wide"
		}),
		dayPeriod: buildLocalizeFn({
			values: dayPeriodValues,
			defaultWidth: "wide",
			formattingValues: formattingDayPeriodValues,
			defaultFormattingWidth: "wide"
		})
	},
	match: {
		ordinalNumber: buildMatchPatternFn({
			matchPattern: /^(第\s*)?\d+(日|时|分|秒)?/i,
			parsePattern: /\d+/i,
			valueCallback: (value) => parseInt(value, 10)
		}),
		era: buildMatchFn({
			matchPatterns: {
				narrow: /^(前)/i,
				abbreviated: /^(前)/i,
				wide: /^(公元前|公元)/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: { any: [/^(前)/i, /^(公元)/i] },
			defaultParseWidth: "any"
		}),
		quarter: buildMatchFn({
			matchPatterns: {
				narrow: /^[1234]/i,
				abbreviated: /^第[一二三四]刻/i,
				wide: /^第[一二三四]刻钟/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: { any: [
				/(1|一)/i,
				/(2|二)/i,
				/(3|三)/i,
				/(4|四)/i
			] },
			defaultParseWidth: "any",
			valueCallback: (index) => index + 1
		}),
		month: buildMatchFn({
			matchPatterns: {
				narrow: /^(一|二|三|四|五|六|七|八|九|十[二一]?)/i,
				abbreviated: /^(一|二|三|四|五|六|七|八|九|十[二一]?|\d|1[0-2])月/i,
				wide: /^(一|二|三|四|五|六|七|八|九|十[二一]?)月/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: {
				narrow: [
					/^一/i,
					/^二/i,
					/^三/i,
					/^四/i,
					/^五/i,
					/^六/i,
					/^七/i,
					/^八/i,
					/^九/i,
					/^十(?!(一|二))/i,
					/^十一/i,
					/^十二/i
				],
				any: [
					/^(一|1(?!\d))/i,
					/^(二|2)/i,
					/^(三|3)/i,
					/^(四|4)/i,
					/^(五|5)/i,
					/^(六|6)/i,
					/^(七|7)/i,
					/^(八|8)/i,
					/^(九|9)/i,
					/^(十(?!(一|二))|10)/i,
					/^(十一|11)/i,
					/^(十二|12)/i
				]
			},
			defaultParseWidth: "any"
		}),
		day: buildMatchFn({
			matchPatterns: {
				narrow: /^[一二三四五六日]/i,
				short: /^[一二三四五六日]/i,
				abbreviated: /^周[一二三四五六日]/i,
				wide: /^星期[一二三四五六日]/i
			},
			defaultMatchWidth: "wide",
			parsePatterns: { any: [
				/日/i,
				/一/i,
				/二/i,
				/三/i,
				/四/i,
				/五/i,
				/六/i
			] },
			defaultParseWidth: "any"
		}),
		dayPeriod: buildMatchFn({
			matchPatterns: { any: /^(上午?|下午?|午夜|[中正]午|早上?|下午|晚上?|凌晨|)/i },
			defaultMatchWidth: "any",
			parsePatterns: { any: {
				am: /^上午?/i,
				pm: /^下午?/i,
				midnight: /^午夜/i,
				noon: /^[中正]午/i,
				morning: /^早上/i,
				afternoon: /^下午/i,
				evening: /^晚上?/i,
				night: /^凌晨/i
			} },
			defaultParseWidth: "any"
		})
	},
	options: {
		weekStartsOn: 1,
		firstWeekContainsDate: 4
	}
};
//#endregion
export { formatDistanceToNowStrict as n, zhCN as t };
