# Enigma

## What is it?

Enigma is an offline Scramble, Boggle and Scrabble solver. Just take a snap of the puzzle, upload it and enigma solves it for you.

## Why is it?

This was designed as a proof-of-concept of *a completly offline* image recognition and processing system based only on local javascript with *no server side code*.

## Using Locally

If you want to run this project locally,

### Requirements

The following Node.js modules,

1. npm
2. bower
3. http-server*

*_Or any other simple server you prefer. This is just for handling xhr request for files._

### Build/Run

For the first download/clone of this repo,

1.Setup the project
  ```bash
npm install
  ```
2.Start the server
  ```bash
http-server
  ```
Once started you can view the page at [http://localhost:8080](http://localhost:8080).

## Contributing to project

The project is not yet complete.

To make it truly offline, some modifications are required to the [Tesseract](/http://tesseract.projectnaptha.com/) core, so that there are no xhr requests for Web Webworker or training data. 

Once this is done, dependency on `http-server` would be removed and application could be run just by opening _index.html_ file on any browser.

Use `npm-wiredep` to inject any newly added bower modules to _index.html_.
  ```bash
node inject
  ```

## Licence

Copy-Left Licence.
Free to copy, distribute and use.
