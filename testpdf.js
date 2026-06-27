const fs = require('fs');
async function test() {
  const { extractText } = await import('unpdf');
  const buffer = fs.readFileSync("./test.pdf");
  const data = new Uint8Array(buffer);
  const { text } = await extractText(data);
  console.log("TEXT EXTRACTED:");
  console.log(text);
}
test().catch(console.error);
