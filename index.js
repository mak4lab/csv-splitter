// for Emmet

const infile = 'test/data/ca_schools_lead_testing_data_geocoded.csv';
const tableNames = [
	['county', 'city'],
	['county', 'schoolName'],
	['city', 'schoolName'],
	['county', 'district'],
	['district', 'schoolName']
];

const ignoreTheseColumns = ['latitude', 'longitude', 'medianResult', 'status'];

const { readFileSync, writeFileSync } = require('fs');

//const { convertCSVToArray } = require('convert-csv-to-array');
const { toObjects } = require('jquery-csv');

const ObjectsToCsv = require('objects-to-csv');

function sortByLetter(a, b) {
	if (typeof a === 'string' && typeof b === 'string') {
		var aLowered = a.toLowerCase();
		var bLowered = b.toLowerCase();
		if (aLowered < bLowered) { return -1; }
		if (aLowered > bLowered) { return 1; }
		return 0;
	} else {
		return a - b;
	}
}

function sortByNumber(a, b) {
	return a - b;
}


const data = readFileSync(infile, 'utf-8');

// remove \r
const cleaned = data.replace(/\r/g, '');

const rows = toObjects(cleaned);

const columns = Object.keys(rows[0]).sort(sortByLetter);

console.log("columns:", columns);

const uniques = {};
columns.forEach(column => {
	uniques[column] = new Set();
});

rows.forEach(row => {
	columns.forEach(column => {
		uniques[column].add(row[column]);
	});
});

// figure out what to index and what not to
const indexTheseColumns = new Set();
tableNames.forEach(([a, b]) => {
	indexTheseColumns.add(a);
	indexTheseColumns.add(b);
});

// sort unique values for each column
for (let columnName in uniques) {
	// e.g. San Diego, San Francisco, San Pablo
	const values = Array.from(uniques[columnName]).sort(sortByLetter);
	uniques[columnName] = values;

	// save to index / lookup table
	const filename = "output/indices/" + columnName + "-index.txt";
	const fileText = values.join("\n") + "\n";
	writeFileSync(filename, fileText, "utf-8");		
}
console.log('uniques', uniques);

// replace values with index numbers
rows.forEach(row => {
	columns.forEach(column => {
		if (ignoreTheseColumns.indexOf(column) === -1) {
			const originalValue = row[column];
			row[column] = uniques[column].indexOf(originalValue);
		}
	});
});

//const outfile = infile.replace(".csv", "_compressed.csv");
const outfile = 'output/compressed.csv';
new ObjectsToCsv(rows).toString(header=true).then(string => {
	writeFileSync(outfile, string, 'utf-8');
});


// allow a user to specify tableNames
/*
const tableNames = new Set();
columns.forEach(a => {
	// e.g., column = city
	columns.forEach(b => {
		if (a !== b) {
			// e.g. a = county, b = city
			const tableName = JSON.stringify([a, b].sort());
			tableNames.add(tableName);
		}
	})
});
*/

console.log("tableNames:", tableNames);

/*
	e.g. {
		'["county", "city"]': {
			"Alameda County": {Berekley, Dublin, San Pablo},
			"San Diego County": {San Diego City, El Cajon City}
		},
		'["county", "school"]': {
			"San Diego County": "University of San Diego High School"
		}
	}
*/
const coocurrences = {};
tableNames.forEach(tableName => {
	const [a, b] = tableName; //e.g. [county, city]
	console.log("a:", a);
	console.log("b:", b);
	const table = {};
	rows.forEach(row => {
		const a_value = row[a]; //e.g. Alameda County
		const b_value = row[b]; //e.g. Berkeley
		if (a_value in table) {
			table[a_value].add(b_value);
		} else {
			table[a_value] = new Set([b_value]);
		}
	});
	// sort b values
	for (let a_value in table) {
		table[a_value] = Array.from(table[a_value]).sort(sortByNumber);
	}

	coocurrences[JSON.stringify(tableName)] = table;
});

//county,cities
//54	12,31,41,67,123
for (let tableName in coocurrences) {
	const tableNameArray = JSON.parse(tableName);
	const filename = "output/cooccurrences/" + tableNameArray.join("-to-") + '.tsv';
	console.log(filename);
	const table = coocurrences[tableName];
	let fileText = tableNameArray.join("\t") + "\n";
	for (let aNumber in table) {
		fileText += aNumber + "\t";
		const bNumbers = table[aNumber];
		console.log(bNumbers);
		fileText += bNumbers.join(",");
		fileText += "\n";
	}
	writeFileSync(filename, fileText, 'utf-8');
}

