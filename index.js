const functions = require('firebase-functions');
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const CsvReadableStream = require('csv-reader');

let header, classes = [];
let labels = ['4.0', '3.67', '3.33', '3.0', '2.67', '2.33', '2.0', '1.67', '1.0'];
let labelText = ['A (4.0)', 'A- (3.67)', 'B+ (3.33)', 'B (3.0)', 'B- (2.67)', 'C+ (2.33)', 'C (2.0)', 'C- (1.67)', 'D (1.0)']

app.get('/', (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	let classNames = fs.readFileSync(path.join(__dirname, '/courses.txt'), 'utf8').split('\n');
	var data = fs.readFileSync(path.join(__dirname, '/imsa-grades/home.html'), 'utf8');
	let options = classNames.map((c) => {
		return `<option value='/${c}'>${c}</option>`
	}).join('');
	read('Biochemistry').then(classData => {
		data = data.replace('{{classes}}', options);
		data = data.replace('{{navbar}}', getNavbar(true));
		res.status(200).send(data);
	})
})

app.get('/grades', (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	res.status(200).sendFile(path.join(__dirname, '/grades.csv'))
})

app.get("/*", (req, res) => {
	res.set('Cache-Control', 'public, max-age=25200');

	var data = fs.readFileSync(path.join(__dirname, "/imsa-grades/class.html"), 'utf8');
	let currentClass = decodeURI(req.url.substring(1));

	read(currentClass).then(classData => {
		var results = classData
		if (classData.error) {
			res.status(404).sendFile(path.join(__dirname, "/imsa-grades/404.html"));
			return;
		}

		let lgDatasets = {
			labels: results.byYear.map(y => y.groupName),
			xlabel: 'Grade Year',
			ylabel: 'Grade Point',
			sets: [{
				label: 'Mean',
				backgroundColor: '#19a512',
				borderColor: '#19a512',
				data: results.byYear.map(y => y.mean),
				fill: false
			}, {
				label: 'Median',
				backgroundColor: '#db6e82',
				borderColor: '#db6e82',
				data: results.byYear.map(y => y.median),
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
				data: results.byYear.map(y => y.n),
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
				data: results.byYear.map(y => y.mean),
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

		var findReplace = [
			["{{classname}}", results.className],
			["{{description}}", ''],
			["{{tabs}}", results.byGroup.map(x => `<button class="tablinks">${x.groupName}</button>`).join("")],
			["{{tabdivs}}", results.byGroup.map(x => `<div id="${x.groupName}" class="tabcontent">
			  <table class="infotable">
				<tr>
				  <td>
					<h3>Grade Breakdown</h3>
					<p>Last Updated ${x.latest}.</p>
				  </td>
				  <td style="float:right;">
					<table class="stattable">
					  <tr>
						<td>${x.n}</td>
						<td>Count</td>
					  </tr>
					  <tr>
						<td>${x.mean}</td>
						<td>Mean</td>
					  </tr>
					  <tr>
						<td>${x.median}</td>
						<td>Median</td>
					  </tr>
					</table>
				  </td>
				</tr>
			  </table>
			  <canvas id="${x.groupName + "graph"}" width="400" height="200"></canvas>
			</div>`).join("")],
			["{{graph}}", results.byGroup.map(x => `
					graph("${x.groupName + "graph"}", [${x.counts.join(',')}], ${JSON.stringify(labelText)})
				  `).join("\n")],
			['{{navbar}}', getNavbar(true)],
			['{{lineGraph}}', `lineGraph('timegraph', ${JSON.stringify(lgDatasets)})`],
			['{{countGraph}}', `lineGraph('countgraph', ${JSON.stringify(countDatasets)})`],
			['{{gpBreakdown}}', `lineGraph('gpBreakdown', ${JSON.stringify(gpBreakdown)})`]
		];

		findReplace.forEach((x) => data = data.replace(new RegExp(escapeRegExp(x[0]), 'g'), x[1]));
		res.status(200).send(data);

	})
})

function getNavbar(showsearch) {
	let classNames = fs.readFileSync(path.join(__dirname, '/courses.txt'), 'utf8').split('\n');
	let navbartext = fs.readFileSync(path.join(__dirname, '/imsa-grades/navbar.html'), 'utf8');
	if (!showsearch) {
		navbartext = navbartext.replace('{{searchdisplay}}', 'nodisplay');
	}
	return navbartext.replace('{{classes}}', (!showsearch) ? '' : classNames.map((c) => {
		return `<option value='/${c}'>${c}</option>`
	}).join(''));
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function read(className) {
	classes = []
	let inputStream = fs.createReadStream('grades.csv', 'utf8');
	let n = 0;
	return new Promise((res, rej) => {
		inputStream
			.pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
			.on('data', function (row) {
				if (n++ == 0) {
					header = row;
				} else {
					addStudent(row)
				}
			})
			.on('end', function () {
				let cs = classes.find(c => c.name == className);
				if (!cs) {
					res({ error: true, msg: 'Class Not Found' });
					return;
				}
				let byYear = sortByYear(cs).sort((a, b) => b.name - a.name)

				let groups = [cs.export];
				byYear.forEach(y => groups.push(y.export))

				res({
					className: cs.name,
					byGroup: groups,
					byYear: byYear.sort((a, b) => a.name - b.name).map(y => y.export)
				})
			});
	});
}

function addStudent(row) {
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
		this.students = [];
	}

	student(row) {
		this.students.push({
			gender: row[header.indexOf('Gender')],
			gradYear: row[header.indexOf('IMSA_SchedYearofGraduation')],
			gradeTermId: row[header.indexOf('Grade_TermID')],
			gradeYear: row[header.indexOf('Grade_Year')],
			gradeStoreCode: row[header.indexOf('Grade_StoreCode')],
			gradePointSolid: row[header.indexOf('Grade_Point_Solid')],
			gradePoint: row[header.indexOf('Grade_Point')],
			grade: row[header.indexOf('Grade')],
			courseNumber: row[header.indexOf('Course_Number')],
			courseName: row[header.indexOf('Course_Name')],
			creditType: row[header.indexOf('Credit_Type')],
			studentGrade: row[header.indexOf('Student_GradeLevel')],
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
		return {
			n: this.students.length,
			mean: Math.round(this.gpa * 100) / 100, //because this is a getter function, i don't feel evil rounding in the Model
			median: median(this.students.map(s => s.gradePoint))
		}
	}

	get latest() {
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

			if (countInd == -1) {
				// countsMap.push([s.gradePoint, 1])
			} else {
				countsMap[countInd][1]++;
			}
		});

		countsMap = countsMap.sort((a, b) => {
			if (a[0] < b[0]) return 1;
			return -1;
		})
		return countsMap
	}

	get export() {
		return {
			groupName: this.name,
			n: this.stats.n,
			median: this.stats.median,
			mean: this.stats.mean,
			latest: this.latest,
			counts: this.counts.map(x => x[1]),
			students: this.students
		}
	}
}

function sortByYear(groupToSort) {
	let years = [];
	groupToSort.students.forEach(s => {
		let yearIndex = -1;
		years.find((y, i) => {
			if (y.name == s.gradeYear) {
				yearIndex = i;
				return true;
			}
		})

		if (yearIndex == -1) {
			years.push(new StudentGroup(s.gradeYear))
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

exports.app = functions.https.onRequest(app);
