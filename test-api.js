const fetch = require('node-fetch');

async function test() {
  try {
    // 1. Create a client and an access linked to it
    const createRes = await fetch('http://localhost:3000/api/accesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TEST ACCESS',
        type: 'SUPPLIER',
        // let's assume client ID 1 exists, or we just test the parsing
      })
    });
  } catch (e) {
    console.error(e);
  }
}
test();
