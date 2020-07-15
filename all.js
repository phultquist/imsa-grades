//note: this function doesn't actually work yet, and also is not a google cloud function
//i will probably move this out of this directory

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