'use strict';

const test = require('tape'),
      http = require('http');

const CONTENT = 'content';
const defaultHandler = (req, res) => res.end(CONTENT);
let handler1 = defaultHandler;
let handler2 = defaultHandler;

const server = http.createServer((req, res) => handler1(req, res));
server.listen(1111);

const server2 = http.createServer((req, res) => handler2(req, res));
server2.listen(2222);


test('ping', t => {
    handler1 = (req, res) => {
        res.statusCode = 678;
        res.end('pong');
    };
    http.get('http://localhost:1111', res => {
        t.equals(res.statusCode, 678);
        res.on('data', d => {
            t.equals(d.toString('utf8'), 'pong'); 
            t.end();
        });
    });
});

test('proxy', t => {
    handler1 = (req, res) => http.get('http://localhost:2222', pres => pres.pipe(res));
    handler2 = defaultHandler;
    http.get('http://localhost:1111', res => {
        res.on('data', d => {
            t.equals(d.toString('utf8'), CONTENT);
            t.end();
        });
    });
});
