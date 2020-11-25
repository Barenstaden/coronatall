const brotli = require('brotli');
const fs = require('fs');
const zlib = require('zlib');

const brotliSettings = {
    extension: 'br',
    skipLarger: true,
    mode: 1, // 0 = generic, 1 = text, 2 = font (WOFF2)
    quality: 10, // 0 - 11,
    lgwin: 12 // default
};
const css = 'public/css';
fs.readdirSync(css).forEach(file => {
  if (file.endsWith('.css')) {
    const result = brotli.compress(fs.readFileSync(css + '/' + file), brotliSettings);
    fs.writeFileSync(css + '/' + file + '.br', result);
    const fileContents = fs.createReadStream(css + '/' + file);
    const writeStream = fs.createWriteStream(css + '/' + file + '.gz');
    const zip = zlib.createGzip();
    fileContents
        .pipe(zip)
        .on('error', err => console.error(err))
        .pipe(writeStream)
        .on('error', err => console.error(err));
  }
})
const js = 'public/js';
fs.readdirSync(js).forEach(file => {
  if (file.endsWith('.js')) {
    const result = brotli.compress(fs.readFileSync(js + '/' + file), brotliSettings);
    fs.writeFileSync(js + '/' + file + '.br', result);
    const fileContents = fs.createReadStream(js + '/' + file);
    const writeStream = fs.createWriteStream(js + '/' + file + '.gz');
    const zip = zlib.createGzip();
    fileContents
        .pipe(zip)
        .on('error', err => console.error(err))
        .pipe(writeStream)
        .on('error', err => console.error(err));
  }
})
const html = './';
fs.readdirSync(html).forEach(file => {
  if (file.endsWith('.html')) {
    const result = brotli.compress(fs.readFileSync(html + '/' + file), brotliSettings);
    fs.writeFileSync(html + '/' + file + '.br', result);
    const fileContents = fs.createReadStream(html + '/' + file);
    const writeStream = fs.createWriteStream(html + '/' + file + '.gz');
    const zip = zlib.createGzip();
    fileContents
        .pipe(zip)
        .on('error', err => console.error(err))
        .pipe(writeStream)
        .on('error', err => console.error(err));
  }
})
