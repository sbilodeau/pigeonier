'use strict';
const fs      = require('fs');
const path    = require('path');
const express = require('express');
const bodyParser = require('body-parser');

if (!process.env.AUTH_PATH) throw new Error("AUTH_PATH no set");

const AUTH_PATH = process.env.AUTH_PATH;

//============================================================
// CTOR
//
//============================================================
function Controller() {

    var router = express.Router();

    router.get   ('/', get);
    router.post  ('/', bodyParser.json(),  create);
    router.delete('/', remove);

    return router;
}

//============================================================
//
//
//============================================================
function get(req, res) {

    if(!req.headers.authorization)
        return res.status(403).send({messages:`forbidden`});

    let json = Buffer.from(req.headers.authorization, 'base64').toString('ascii');
    let auth = JSON.parse(json);

    if(!auth.from)                  return res.status(403).send({messages:`forbidden`});
    if(!auth.to)                    return res.status(403).send({messages:`forbidden`});
    if(!/^\d{10}$/.test(auth.from)) return res.status(403).send({messages:`forbidden`});
    if(!/^\d{10}$/.test(auth.to))   return res.status(403).send({messages:`forbidden`});

    res.status(200).send();

}
//============================================================
//
//
//============================================================
function create(req, res) {

    let pin = req.body.pin;

    if(!pin)
        return res.status(400).send({messages:`pin not set`});

    if(!/^[a-z0-9]+$/.test(pin))
        return res.status(400).send({messages:`invalid pin format`});

    var authPath = path.join(AUTH_PATH, `${pin}.json`);

    if(!fs.existsSync(authPath))
        return res.status(403).send({messages:`forbidden`});

    let auth = require(authPath);

    let token = new Buffer(JSON.stringify(auth)).toString('base64');

    // res.cookie('token', token, {
    //     httpOnly : true,
    //     maxAge : 1000*60*60*24*3,
    //     path:'/'
    // });

    res.status(200).send({ token: token });
}

//============================================================
//
//
//============================================================
function remove(req, res) {
    res.clearCookie('token', {path:'/'});
    res.status(200).send();
}

module.exports = exports = Controller;
