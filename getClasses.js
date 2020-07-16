// NOTE: this is not a cloud function, and should only be run periodically

const CsvReadableStream = require('csv-reader');
const path = require('path');
const fs = require('fs');

let courseNames = [];
let n = 0;
let inputStream = fs.createReadStream(path.join(__dirname, '/grades.csv'), 'utf8');
console.log(__dirname);

inputStream
    .pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
    .on('data', function (row) {
        if (n++ == 0) {
            header = row;
        } else {
            c(row);
        }
    })
    .on('end', function () {
        console.log('done');
        fs.writeFile('courses.txt', courseNames.join('\n'), () => null)
    });

function c(row) {
    let courseName = row[header.indexOf('Course_Name')];
    if (courseNames.indexOf(courseName) == -1) {
        courseNames.push(courseName);
    }
}