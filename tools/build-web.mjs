// Builds www/ (what goes inside the APK) from src/app.html.
// src/app.html is the same file as the design artifact: replace it to ship new features.
import {readFileSync,writeFileSync,mkdirSync,rmSync,cpSync,readdirSync,renameSync} from 'node:fs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const build=process.env.BUILD_NUMBER||'0';
const version=`${pkg.version.split('.').slice(0,2).join('.')}.${build}`;
let src=readFileSync('src/app.html','utf8');

// 1. fonts come from the app, not the internet
const before=src.length;
src=src.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\s*/g,'');
if(src.length===before)console.warn('note: no Google Fonts links found');

// 2. the main script waits for saved data, so shell.js starts it
const open=src.indexOf('<script>'),close=src.lastIndexOf('</script>');
if(open<0||close<0)throw new Error('main <script> not found in src/app.html');
src=src.slice(0,open)+'<script type="text/plain" id="jjmain">'+src.slice(open+8,close)+'</script>\n<script src="shell.js"></script>'+src.slice(close+9);

// 3. a full document for the Android WebView
const title=(src.match(/<title>[\s\S]*?<\/title>/)||['<title>JJ Ecosystem</title>'])[0];
src=src.replace(title,'');
const html=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#F4F6F3">
<meta name="color-scheme" content="light dark">
${title}
<link rel="stylesheet" href="fonts/fonts.css">
</head>
<body>
${src}
</body>
</html>
`;
rmSync('www',{recursive:true,force:true});mkdirSync('www',{recursive:true});
cpSync('web','www',{recursive:true});
writeFileSync('www/index.html',html);
writeFileSync('www/shell.js',readFileSync('web/shell.js','utf8').replace('__VERSION__',version));
writeFileSync('www/version.json',JSON.stringify({version,build:+build,built:new Date().toISOString()}));
console.log('www built, version',version);
