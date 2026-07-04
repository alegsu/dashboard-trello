async function test() {
    const url = 'https://docs.google.com/spreadsheets/d/1xMGTUbdzWqwI0YAWYKhR3sGLqOnHat-p/export?format=xlsx';
    console.log("Fetching", url);
    const res = await fetch(url);
    const text = await res.text();
    console.log("Response:", text.substring(0, 500));
}

test().catch(console.error);
