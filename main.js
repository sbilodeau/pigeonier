'use strict'; // jshint node: true, browser: false, esnext: true

process.on('SIGTERM', ()=>process.exit());

const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const https   = require('https');
const express = require('express');
const app     = express();

app.use(require('morgan')('dev'));
    if (!process.env.MEDIA_PATH) throw new Error("MEDIA_PATH no set");

// Configure static files to serve

app.use('/m',    express.static(process.env.MEDIA_PATH));
app.use('/app',  express.static(__dirname + '/app'));

app.all('/app/*', (req, res)=>res.status(404).send());

app.use('/api/authentication', require('./api/authentications')());
app.use('/api/messages',       require('./api/messages')());

app.get('/',     (req, res)=>res.sendFile(__dirname + '/app/template.html'));
app.get('/chat', (req, res)=>res.sendFile(__dirname + '/app/template.html'));
app.get('/robots.txt', (req, res)=>res.sendFile(__dirname + '/app/robots.txt'));


// START SERVER(s)

let httpApp  = app;
let httpsApp = app;

if(process.env.CERT_PATH) {

    var certs = {
        key  : fs.readFileSync(path.join(process.env.CERT_PATH, 'privkey.pem')),
        cert : fs.readFileSync(path.join(process.env.CERT_PATH, 'fullchain.pem')),
    };

    allWellknown(httpsApp);
    allCatchAll (httpsApp);

    https.createServer(certs, httpsApp).listen(process.env.SECURE_PORT || 8443, function(){
        console.log("SECURE SERVER: Listening on: %j", this.address());
    });


    httpApp = express();
    httpApp.use(require('morgan')('dev'));

    allWellknown(httpApp);

    httpApp.get('/robots.txt', (req, res)=>res.sendFile(__dirname + '/app/robots.txt'));

    httpApp.use(function (req, res) { // Redirect to SSL
        res.writeHead(301, { "Location": "https://" + req.headers.host + req.url });
        res.end();
    });
}

allWellknown(httpApp);
allCatchAll (httpApp);

http.createServer(httpApp).listen(process.env.PORT || 8000, function(){
    console.log("PLAIN SERVER: Listening on: %j", this.address());
});


// Let's Encrypt
function allWellknown(app) {
    if(process.env.WELL_KNOWN) {
        app.use('/.well-known',   express.static(process.env.WELL_KNOWN));
    }
}

function allCatchAll(app) {
    app.all('/*', (req, res)=>res.status(404).send());
}

function robots(app) {
    app.get('/robots.txt',     (req, res)=>res.sendFile(__dirname + '/app/robots.txt'));
}
