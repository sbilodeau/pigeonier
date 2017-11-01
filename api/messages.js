'use strict';
const path    = require('path');
const fs      = require('fs');
const co      = require('co');
const moment  = require('moment');
const express = require('express');
const request = require('superagent');
const bodyParser = require('body-parser');
const mime       = require('mime-types')
const MongoClient = require('mongodb').MongoClient;
const ObjectID    = require('mongodb').ObjectID;

if (!process.env.MEDIA_PATH) throw new Error("MEDIA_PATH no set");
if (!process.env.MONGO_URL)  throw new Error("MONGO_URL no set");

const media_path = process.env.MEDIA_PATH;

function cowrap(fn) { return function (req, res, next) { co(function* () { return yield fn(req, res, next); }).catch(next); }; }

//============================================================
// CTOR
//
//============================================================
function Controller() {

    var router = express.Router();

    router.get   ('/',    authenticate,                    cowrap(list));
    router.post  ('/',    authenticate, saveMedias, bodyParser.json(), cowrap(post));
    router.delete('/:id', authenticate,                    cowrap(remove));
    return router;
}
//============================================================
//
//
//============================================================
function authenticate (req, res, next) {

    if(!req.headers)               return res.status(403).send({messages:`forbidden`});
    if(!req.headers.authorization) return res.status(403).send({messages:`forbidden`});

    let json = Buffer.from(req.headers.authorization, 'base64').toString('ascii');
    let auth = JSON.parse(json);

    if(!auth.from)                  return res.status(403).send({messages:`forbidden`});
    if(!auth.to)                    return res.status(403).send({messages:`forbidden`});
    if(!/^\d{10}$/.test(auth.from)) return res.status(403).send({messages:`forbidden`});
    if(!/^\d{10}$/.test(auth.to))   return res.status(403).send({messages:`forbidden`});

    req.auth = auth;

    next();
}
//============================================================
//
//
//============================================================
function* list(req, res) {

    let db = yield getConnection();
    let dbMessages = db.collection('messages');

    let q = { $or: [ { from: req.auth.from }, { to: req.auth.from }], deletedBy: { $ne: req.auth.from } };
    let s = { date: 1 };

    let messages = yield dbMessages.find(q).sort(s).toArray();

    messages.forEach(m=>m.me=m.from==req.auth.from);

    res.status(200).send(messages);
}

//============================================================
//
//
//============================================================
function* post(req, res) {

    let db = yield getConnection();
    let dbMessages = db.collection('messages');

    let result = yield dbMessages.insertOne({
        date: new Date(),
        from: req.auth.from,
        to:   req.auth.to,
        text: req.body.text,
        contentType: req.body.contentType || mime.lookup('.txt')
    });

    if(!result || !result.insertedCount)
        return res.status(400).send({ message: "Message not saved" });

    res.status(200).send(result.ops[0]);
}

//============================================================
//
//
//============================================================
function* remove(req, res) {

    req.params.id = ObjectID(req.params.id);

    let db = yield getConnection();
    let dbMessages = db.collection('messages');

    let q = { _id: req.params.id, $or: [ { from: req.auth.from }, { to: req.auth.from }], deletedBy: { $ne: req.auth.from } };
    let u = { $push: { deletedBy: req.auth.from } };

    yield dbMessages.findOneAndUpdate(q, u);

    res.status(200).send();

    //cleanup
    //remove when deleted by both
    yield dbMessages.deleteMany({ 'deletedBy.1': {$exists: true} });
}

//============================================================
//
//
//============================================================
function saveMedias(req, res, next) {

    let contentType = req.headers['content-type'];

    if(/^(image|video)\//.test(contentType)) {

        let streamName = `${randomString(64)}.${mime.extension(contentType)}`;

        req.body = {
            text: `${req.protocol}://${req.get('host')}/m/${streamName}`,
            contentType: contentType
        };

        console.log(req.body);

        let filePath = path.join(media_path, `${streamName}`);
        let data = new Buffer([]);

        req.on('data',(d)=> data = Buffer.concat([data, d]));
        req.on('end', ( )=> fs.writeFile(filePath, data, next) );
    }
    else {
        next();
    }
}

//============================================================
//
//
//============================================================
function randomString(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


//============================================================
//
//
//============================================================
var GLOBAL_MONGODB;
function getConnection() {

    if(!GLOBAL_MONGODB) {

        let mongoClient = new MongoClient();

        GLOBAL_MONGODB = mongoClient.connect(process.env.MONGO_URL);

        Promise.resolve(GLOBAL_MONGODB).then(conn => {

            return (GLOBAL_MONGODB = conn);

        }).catch(err => {

            GLOBAL_MONGODB = null;

            console.error("Connection error to mongo: " + err);

            throw err; //log and re-throw
        });
    }

    return Promise.resolve(GLOBAL_MONGODB);
}

module.exports = exports = Controller;
