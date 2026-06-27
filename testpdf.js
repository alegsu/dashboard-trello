const PDFDocument = require('pdfkit');
const fs = require('fs');
const PDFParser = require("pdf2json");

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));
doc.text('Destinazioni vacanze\n- Parigi\n- Roma');
doc.end();

doc.on('end', () => {
  setTimeout(() => {
    const buffer = fs.readFileSync("./test.pdf");
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
        console.log("TEXT EXTRACTED:");
        console.log(pdfParser.getRawTextContent());
    });
    pdfParser.parseBuffer(buffer);
  }, 1000);
});
