const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const CsvReadableStream = require('csv-reader');
const recent = require('./recent.js')

let header, classes = [];
let labels = ['4.0', '3.67', '3.33', '3.0', '2.67', '2.33', '2.0', '1.67', '1.0'];
let labelText = ['A (4.0)', 'A- (3.67)', 'B+ (3.33)', 'B (3.0)', 'B- (2.67)', 'C+ (2.33)', 'C (2.0)', 'C- (1.67)', 'D (1.0)'];

app.get('/', (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	let classNames = fs.readFileSync(path.join(__dirname, '/courses.txt'), 'utf8').split('\n');
	var data = fs.readFileSync(path.join(__dirname, '/public/home.html'), 'utf8');
	let options = classNames.map((c) => {
		return `<option value='/${c}'>${c}</option>`
	}).join('');
	read('all').then(() => {
		let countsMap = labels.map(l => [l, 0])
		classes.forEach(cla => {
			let ind = countsMap.findIndex(c => c[0] == cla.stats.median)
			if (ind == -1) {
				return;
			}
			countsMap[ind][1]++;
		})
		data = data.replace('{{classes}}', options);
		data = data.replace('{{navbar}}', getNavbar(true));
		data = data.replace('{{headboilerplate}}', headboilerplate)
		data = data.replace('{{medianGraph}}', `graph("overallgraph", [${countsMap.map(x => x[1]).join(',')}], ${JSON.stringify(labelText)}, ${JSON.stringify({ x: 'Number of Classes', y: 'Class Grade Point Median' })})`);
		data = data.replace('{{hardestClass}}', `
			$('#hardestclasstitle').html("Hardest Class: <a href='/Survey%20of%20Organic%20Chemistry'>Survey of Organic Chemistry</a>")
			graph('hardestclassgraph', [${classes.find(c => c.name == 'Survey of Organic Chemistry').counts.map(x => x[1]).join(',')}], ${JSON.stringify(labelText)}, ${JSON.stringify({ x: 'Number of Students', y: 'Student Grade' })})
		`);
		data = data.replace('{{easiestClass}}', `
			$('#easiestclasstitle').html("Easiest Class: <a href='/String%20Orchestra'>String Orchestra</a>")
			graph("easiestclassgraph", [${classes.find(c => c.name == 'String Orchestra').counts.map(x => x[1]).join(',')}], ${JSON.stringify(labelText)}, ${JSON.stringify({ x: 'Number of Students', y: 'Student Grade' })})`)
		res.status(200).send(data);
	})
})

app.get('/grades', (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	res.status(200).sendFile(path.join(__dirname, '/grades.csv'))
})

app.get('/grades-new', (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	res.status(200).sendFile(path.join(__dirname, '/grades-recent.csv'))
})

app.get('/about', (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	var data = fs.readFileSync(path.join(__dirname, '/public/about.html'), 'utf8');
	data = data.replace('{{headboilerplate}}', headboilerplate);
	data = data.replace('{{navbar}}', getNavbar(true));

	res.status(200).send(data);
})

app.get("/*", (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	var data = fs.readFileSync(path.join(__dirname, "/public/class.html"), 'utf8');
	data = data.replace('{{headboilerplate}}', headboilerplate);
	let substr = req.url.substring(1).split('+').join('%20')
	let currentClass = decodeURI(substr);

	read(currentClass).then(classData => {
		let recentData = recent.congregate(currentClass);
		if (!recentData) {
			console.log('not recent data');
			recentData = { exists: false, years: [] }
		}
		var results = classData
		if (results.error) {
			if (!recentData.exists) {
				res.status(404).sendFile(path.join(__dirname, "/public/404.html"));
				return;
			}
			results = {
				byYear: [],
				byGroup: [],
				exists: false
			}
			// return; 
		}

		let lgDatasets = {
			labels: results.byYear.map(y => y.groupName).concat(recentData.years.map(y => y.name)),
			xlabel: 'Grade Year',
			ylabel: 'Grade Point',
			sets: [{
				label: 'Mean',
				backgroundColor: '#19a512',
				borderColor: '#19a512',
				data: results.byYear.map(y => y.stats.mean).concat(recentData.years.map(y => y.mean)),
				fill: false
			}, {
				label: 'Median',
				backgroundColor: '#db6e82',
				borderColor: '#db6e82',
				data: results.byYear.map(y => y.stats.median).concat(recentData.years.map(y => y.median)),
				fill: false
			}]
		}

		let enrollmentOverTime = {
			labels: results.byYear.map(y => y.groupName).concat(recentData.years.map(y => y.name)),
			xlabel: 'Grade Year',
			ylabel: 'Number of Students',
			sets: [{
				label: 'Count',
				backgroundColor: '#fcba03',
				borderColor: '#fcba03',
				data: results.byYear.map(y => y.stats.n).concat(recentData.years.map(y => y.num)),
				fill: false
			}]
		}

		let countDatasets = {
			labels: results.byYear.map(y => y.groupName),
			xlabel: 'Grade Year',
			ylabel: 'Number of Students',
			sets: [{
				label: 'All',
				backgroundColor: 'purple',
				borderColor: 'purple',
				data: results.byYear.map(y => y.stats.n),
				fill: false
			}, {
				label: 'Male',
				backgroundColor: '#35c1eb',
				borderColor: '#35c1eb',
				data: results.byYear.map(y => {
					return y.students.filter(s => s.gender == 'Male').length
				}),
				fill: false
			}, {
				label: 'Female',
				backgroundColor: '#ff6385',
				borderColor: '#ff6385',
				data: results.byYear.map(y => {
					return y.students.filter(s => s.gender == 'Female').length
				}),
				fill: false
			}, {
				label: 'Sophomores',
				backgroundColor: 'orange',
				borderColor: 'orange',
				data: results.byYear.map(y => {
					return y.students.filter(s => s.studentGrade == 10).length;
				}),
				fill: false
			}, {
				label: 'Juniors',
				backgroundColor: 'rgba(53,162,235, 1)',
				borderColor: 'rgba(53,162,235, 1)',
				data: results.byYear.map(y => {
					return y.students.filter(s => s.studentGrade == 11).length;
				}),
				fill: false
			}, {
				label: 'Seniors',
				backgroundColor: '#b19cd9',
				borderColor: '#b19cd9',
				data: results.byYear.map(y => {
					return y.students.filter(s => s.studentGrade == 12).length;
				}),
				fill: false
			}]
		}

		let gpBreakdown = {
			labels: results.byYear.map(y => y.groupName),
			xlabel: 'Grade Year',
			ylabel: 'Grade Point Average',
			sets: [{
				label: 'All',
				backgroundColor: '#19a512',
				borderColor: '#19a512',
				data: results.byYear.map(y => y.stats.mean),
				fill: false
			}, {
				label: 'Male',
				backgroundColor: '#35c1eb',
				borderColor: '#35c1eb',
				data: results.byYear.map(y => {
					return getGpa(y.students.filter(s => s.gender == 'Male'))
				}),
				fill: false
			}, {
				label: 'Female',
				backgroundColor: '#ff6385',
				borderColor: '#ff6385',
				data: results.byYear.map(y => {
					return getGpa(y.students.filter(s => s.gender == 'Female'))
				}),
				fill: false
			}, {
				label: 'Sophomores',
				backgroundColor: 'orange',
				borderColor: 'orange',
				data: results.byYear.map(y => {
					return getGpa(y.students.filter(s => s.studentGrade == 10));
				}),
				fill: false
			}, {
				label: 'Juniors',
				backgroundColor: 'rgba(53,162,235, 1)',
				borderColor: 'rgba(53,162,235, 1)',
				data: results.byYear.map(y => {
					return getGpa(y.students.filter(s => s.studentGrade == 11));
				}),
				fill: false
			}, {
				label: 'Seniors',
				backgroundColor: '#b19cd9',
				borderColor: '#b19cd9',
				data: results.byYear.map(y => {
					return getGpa(y.students.filter(s => s.studentGrade == 12));
				}),
				fill: false
			}]
		}

		let extraTab = [];
		if (results.byGroup.length == 0) {
			extraTab = [{name: 'All Years'}]
		}
		let showBreakdowns = true;
		let tabs = results.byGroup.map(x => `<button class="tablinks">${x.displayName}</button>`).concat(extraTab.map(x => `<button class="tablinks">${x.name}</button>`)).concat(recentData.years.map(x => `<button class="tablinks">${x.name}</button>`))

		var findReplace = [
			["{{classname}}", results.className ? results.className : recentData.name],
			["{{description}}", 'Data may be incomplete. Use this only for reference.'],
			["{{tabs}}", tabs.join("")],
			['{{fluidGraph}}', `overallGraph = new FluidGraph('bargraphs', ${
				(function () {
					let oldResults = results.byGroup.map(x => {
						return {
							name: x.displayName,
							data: x.counts.map(c => c[1]),
							stats: x.stats,
							lastUpdated: x.latest
						}
					});

					if (recentData.exists) {
						let old = oldResults[0];
						if (old) {
							let n, mean, medianVal,
								data = old.data.map((d, i) => parseInt(d) + parseInt(recentData.counts[i][1]));

							n = old.data.reduce((a, c) => a + c) + recentData.counts.reduce((a, c) => a + c[1], 0);
							mean = (data.reduce((a, c, i) => a + c * labels[i], 0) / n).toFixed(2);
							let list = []
							data.forEach((a, ind) => {
								for (i = 0; i < a; i++) {
									list.push(parseFloat(labels[ind]))
								}
							})
							medianVal = median(list);

							oldResults[0] = {
								name: old.name,
								data,
								stats: { n, mean, median: medianVal },
								lastUpdated: '2020'
							}
						} else {
							showBreakdowns = false;
							oldResults = [{
								name: 'All Years',
								data: recentData.counts.map(c => c[1]),
								stats: {n: recentData.num, mean: recentData.mean.toFixed(2), median: recentData.median.toFixed(2)},
								lastUpdated: recentData.years[recentData.years.length - 1].name
							}]
						}

						let newResults = recentData.years.map(y => {
							return {
								name: y.name,
								data: y.counts.map(c => c[1]),
								stats: { n: y.num, mean: y.mean.toFixed(2), median: y.median.toFixed(2) },
								lastUpdated: y.name
							}
						})
						return JSON.stringify(oldResults.concat(newResults));
					}
					return JSON.stringify(oldResults)
				})()
				}, ${JSON.stringify(labelText)})`],
			['{{navbar}}', getNavbar(true)],
			['{{lineGraph}}', `lineGraph('timegraph', ${JSON.stringify(lgDatasets)})`],
			['{{enrollmentOverTime}}', `lineGraph('enrollmentgraphs', ${JSON.stringify(enrollmentOverTime)})`],
			['{{countGraph}}', `lineGraph('countgraph', ${JSON.stringify(countDatasets)}, ${showBreakdowns})`],
			['{{gpBreakdown}}', `lineGraph('gpBreakdown', ${JSON.stringify(gpBreakdown)}, ${showBreakdowns})`]
		];

		findReplace.forEach((x) => data = data.replace(new RegExp(escapeRegExp(x[0]), 'g'), x[1]));
		res.status(200).send(data);

	})
})

function getNavbar(showsearch) {
	let classNames = fs.readFileSync(path.join(__dirname, '/courses.txt'), 'utf8').split('\n').sort();
	let navbartext = fs.readFileSync(path.join(__dirname, '/public/navbar.html'), 'utf8');
	if (!showsearch) {
		navbartext = navbartext.replace('{{searchdisplay}}', 'nodisplay');
	}
	return navbartext.replace('{{classes}}', (!showsearch) ? '' : classNames.map((c) => {
		return (c.startsWith('#') ? null : `<option description="something" value='/${c.split(' ').join('+')}'>${c}</option>`)
	}).join(''));
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function read(className) {
	//the base of this script, the thing that does the reading
	classes = []
	let inputStream = fs.createReadStream('grades.csv', 'utf8');
	let n = 0;
	return new Promise((res, rej) => {
		inputStream
			.pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
			.on('data', function (row) {
				if (n++ == 0) {
					header = row;
				} else if (row[header.indexOf('Course_Name')] == className || className == 'all') {
					addStudent(row);
				}
			})
			.on('end', function () {
				let cs = classes.find(c => c.name == className);
				if (!cs) {
					res({ error: true, msg: 'Class Not Found' });
					return;
				}
				let byYear = sortByYear(cs, 'gradeYear').sort((a, b) => a.name - b.name)

				let tabs = [cs];
				byYear.forEach(y => tabs.push(y))

				res({
					className: cs.name,
					byGroup: tabs,
					byYear: byYear.map(y => y)
				})
			});
	});
}

function addStudent(row) {
	//adds data to the classes array
	let name = row[header.indexOf('Course_Name')];
	let classIndex = -1;

	classes.find((c, i) => {
		if (c.name == name) {
			classIndex = i;
		}
	});

	if (classIndex == -1) {
		classes.push(new StudentGroup(name))
	} else {
		classes[classIndex].student(row);
	}
}

class StudentGroup {
	constructor(name) {
		this.name = name;
		this.groupName = name;
		this.students = [];
	}

	student(row) {
		let sem = (row[header.indexOf('Grade_StoreCode')] == 'S1' ? 'F' : 'S');
		let composite = sem + row[header.indexOf('Grade_Year')],
			gradeYear = row[header.indexOf('Grade_Year')],
			gradeYearText = parseInt(gradeYear);
		let schoolYearText = (gradeYearText - 1).toString() + '/' + gradeYearText.toString();
		if (sem == 'F') {
			schoolYearText = gradeYearText.toString() + '/' + (gradeYearText + 1).toString()
		}
		this.students.push({
			gender: row[header.indexOf('Gender')],
			gradYear: row[header.indexOf('IMSA_SchedYearofGraduation')],
			gradeTermId: row[header.indexOf('Grade_TermID')],
			gradeYear,
			semester: row[header.indexOf('Grade_StoreCode')],
			gradePointSolid: row[header.indexOf('Grade_Point_Solid')],
			gradePoint: row[header.indexOf('Grade_Point')],
			grade: row[header.indexOf('Grade')],
			courseNumber: row[header.indexOf('Course_Number')],
			courseName: row[header.indexOf('Course_Name')],
			creditType: row[header.indexOf('Credit_Type')],
			studentGrade: row[header.indexOf('Student_GradeLevel')],
			composite,
			schoolYearText
		});
	}

	setName(n) {
		this.name = n;
	}

	get gpa() {
		//gets average gpa of this class
		return getGpa(this.students)
	}

	get stats() {
		//some useful stats
		return {
			n: this.students.length,
			mean: Math.round(this.gpa * 100) / 100, //because this is a getter function, i don't feel evil rounding in the Model
			median: median(this.students.map(s => (s.gradePoint == 'P' || s.gradePoint == 'F') ? null : s.gradePoint))
		}
	}

	get latest() {
		//last time this group was updated
		return this.students.sort((a, b) => b.gradeYear - a.gradeYear)[0].gradeYear
	}

	get counts() {
		let countsMap = labels.map(l => [l, 0])
		this.students.forEach(s => {
			let countInd = -1;
			countsMap.find((c, i) => {
				if (c[0] == s.gradePoint) {
					countInd = i;
					return true;
				}
			});

			if (countInd != -1) {
				countsMap[countInd][1]++;
			}
		});

		countsMap = countsMap.sort((a, b) => {
			if (a[0] < b[0]) return 1;
			return -1;
		})
		return countsMap
	}

	get displayName() {
		//this function is the bane of my existence <3
		return this.students[0].courseName == this.name ? 'All Years' : this.name
	}
}

function sortByYear(groupToSort, byKey) {
	let years = [];
	groupToSort.students.forEach(s => {
		let yearIndex = -1;
		years.find((y, i) => {
			if (y.name == s[byKey]) {
				yearIndex = i;
				return true;
			}
		})

		if (yearIndex == -1) {
			years.push(new StudentGroup(s[byKey]))
		} else {
			years[yearIndex].students.push(s) //because .student() expects a .csv row
		}
	})
	return years;
}

function median(values) {
	if (values.length === 0) return 0;

	values.sort(function (a, b) {
		return a - b;
	});

	var half = Math.floor(values.length / 2);

	if (values.length % 2)
		return values[half];

	return (values[half - 1] + values[half]) / 2.0;
}

function getGpa(students) {
	let total = 0;
	let defunct = 0;
	students.forEach(s => {
		if (!isNaN(s.gradePoint)) {
			total += s.gradePoint
		} else {
			defunct++;
		}
	});

	return total / (students.length - defunct)
}

const headboilerplate = `
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
		integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
	<link rel="icon" href="assets/icon.png" </link>
	<link rel="stylesheet" type="text/css"
		href="https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.12.1/css/selectize.default.css">
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.12.1/js/standalone/selectize.min.js"></script>
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css"
		integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">
	<link rel="stylesheet"
		href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.9/dist/css/bootstrap-select.min.css">
	<script src="https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.min.js"></script>
	<meta property="og:url" content="https://imsagrades.com" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta property="og:image" content="/assets/preview.png" />
	<meta property="og:type" content="website">
	<!-- Global site tag (gtag.js) - Google Analytics -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-154027590-5"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag() { dataLayer.push(arguments); }
		gtag('js', new Date());

		gtag('config', 'UA-154027590-5');
	</script>
`

exports.app = functions.https.onRequest(app);
