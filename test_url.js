function parseUrl(csvUrl) {
  if (csvUrl.includes('/edit')) {
    const urlObj = new URL(csvUrl);
    let gid = '0';
    if (urlObj.searchParams.has('gid')) {
        gid = urlObj.searchParams.get('gid');
    } else if (urlObj.hash && urlObj.hash.includes('gid=')) {
        gid = urlObj.hash.split('gid=')[1].split('&')[0];
    }
    csvUrl = csvUrl.split('/edit')[0] + `/export?format=csv&gid=${gid}`;
  }
  return csvUrl;
}

console.log(parseUrl('https://docs.google.com/spreadsheets/d/1xMGTUbdzWqwI0YAWYKhR3sGLqOnHat-p/edit#gid=1128950577'));
console.log(parseUrl('https://docs.google.com/spreadsheets/d/1xMGTUbdzWqwI0YAWYKhR3sGLqOnHat-p/edit?usp=sharing&ouid=112895057791585039137&rtpof=true&sd=true#gid=987654321'));
