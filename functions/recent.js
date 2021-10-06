const CsvReadableStream = require('csv-reader');
const fs = require('fs')
// const path = require('path')

let inputStream = fs.createReadStream('grades-recent.csv', 'utf8');
let i = 0;
let header;
let lines = [];

inputStream.pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
    .on('data', (row) => {
        if (i++ == 0) header = row;
        // else if (i > 20 && i != 690) return;
        else lines.push(row)
    })
    .on('end', () => {
        // parse()
        // console.log(congregate('Mathematical Investigations III').years)
    })

const parse = () => {
    let year, semester, instructor, counts, course, instructorText, instructorIndex, num, id = 0;
    let yearText;
    let newCourses = lines.map(line => {
        id++;
        if (line[ind('Term')]) semester = line[ind('Term')];
        if (line[ind('AY')]) {
            // console.log(id);
            yearText = line[ind('AY')]
        }
        year = "20" + yearText.split('-')[(semester == 'S1' ? 0 : 1)];
        if (line[ind('Course')]) {
            course = line[ind('Course')];
            instructorIndex = 0
        }
        instructorText = `Instructor ${String.fromCharCode(97 + instructorIndex++).toUpperCase()}`
        instructor = line[ind('Instructor')];
        counts = countsMap.map(c => [c[1], line[ind(c[0])] || 0])
        num = 0;
        counts.forEach(c => num += c[1])
        let composite = (semester == 'S1' ? 'F' : 'S') + year[2] + year[3]
        let schoolYearText = (semester == 'S1' ? year + '/'+(parseInt(year) + 1) : (parseInt(year) - 1) + '/' + year) + 'n'

        let data = { id, semester, year, course, instructor, counts, instructorText, num, composite, schoolYearText }
        return data
    })

    newCourses = newCourses.filter(c => c.year >= 2018 && c.year != 2020) //covid be like

    return newCourses
}

exports.congregate = (name) => {
    let courses = parse();
    // console.log(courses);
    let grouped = groupBy(courses, 'course');
    // let classNames = fs.readFileSync(path.join(__dirname, '/courses.txt'), 'utf8').split('\n').sort();
    // Object.keys(grouped).forEach(k => {
    //     if (classNames.indexOf(k) == -1) console.log(k);
    // })
    if (grouped[name]) return understand(grouped[name], name, 'year')
    else return null
}

const understand = (group, name, next) => {
    let num = 0, mean = 0, median = 0, finalCounts;

    finalCounts = group[0].counts.map(a => [a[0], 0]);
    group.forEach(t => {
        t.counts.forEach((arr, i) => {
            finalCounts[i][1] += arr[1];
        })
        num += t.num;
    });
    mean = 0;
    finalCounts.forEach(c => {
        mean += (parseFloat(c[0]) * c[1])
    })
    mean /= num;
    let list = [];
    finalCounts.forEach(a => {
        for (i = 0; i < a[1]; i++) {
            list.push(parseFloat(a[0]))
        }
    })
    median = getMedian(list);

    let years = [];

    if (next) {
        let nextGroups = groupBy(group, next);
        // console.log(nextGroups);
        Object.keys(nextGroups).forEach(groupName => {
            years.push(understand(nextGroups[groupName], groupName, false))
        });
    }

    return {group, exists: true, name, counts: finalCounts, num, mean, median, years: (years.length > 0 ? years : null)}
}

const groupBy = (xs, key) => {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

const ind = t => header.indexOf(t);

const countsMap = [
    ['A', '4.0'],
    ['A-', '3.67'],
    ['B+', '3.33'],
    ['B', '3.0'],
    ['B-', '2.67'],
    ['C+', '2.33'],
    ['C', '2.0'],
    ['C-', '1.67'],
    ['D', '1.0']
];

function getMedian(values) {
    if (values.length === 0) return 0;

    values.sort(function (a, b) {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

