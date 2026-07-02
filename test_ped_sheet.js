const url = 'https://docs.google.com/spreadsheets/d/1pwBkzIOlI4WTY9cDOLuR17RvEP9_PKvW/export?format=csv&gid=104059218';

async function test() {
  const res = await fetch(url);
  const text = await res.text();
  console.log('DATA:', text.substring(0, 2000));
}

test();
