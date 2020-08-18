# IMSA Grades
## [View the site](https://imsagrades.com)

## About
IMSA Grades was made as an easy tool to view past grade data for classes at IMSA. It is not an official site.

## Data
Two separate sets of data were attained. The first is from a 2017 FOIA request as explained on the about page. The second came from the Office of Institutional Research at IMSA.

## Usage
To run locally, first setup a firebase project. This requires the [Firebase CLI](https://firebase.google.com/docs/cli). It runs on a Node.js 10 runtime using a Google Cloud Function `app`.

Run `firebase serve` to generate the link, then make computational changes in `./index.js` and add content to any `html` page.

## Raw Data
View all the raw data at `./grades.csv` and `./grades-recent.csv`

## Some Notes
  1. IMSA Grades runs using Google Cloud Firebase. Seee more at [firebase.google.com](https://firebase.google.com)
  2. IMSA Grades uses a single cloud function built on **Node.js** to run the website. Check it out in  ```./index.js```
  3. The data was aquired through a 2017 FOIA request.
  4. Recent data (2017-2020) is currently being gathered
  5. You'll notice looking at the source code, that this is a little bit *progressive*, in terms of quality of code. I tried to do too many things and didn't consider for future situations. I'll fix this soon.

### License
MIT License
