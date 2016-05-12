'use strict';

const test = require('tape'),
      http = require('http');

const CONTENT = 'content';

const defaultHandler = (req, res) => res.end(CONTENT);

function createServers(handler1, handler2) {
    handler1 = handler1 || defaultHandler;
    handler2 = handler2 || defaultHandler;
    
    const server1 = http.createServer((req, res) => handler1(req, res));
    server1.listen(1111);

    const server2 = http.createServer((req, res) => handler2(req, res));
    server2.listen(2222);
    
    return end => Promise.all([new Promise(res => server1.close(res)), new Promise(res => server2.close(res))]).then(() => end());
}

test('ping', t => {
    const close = createServers((req, res) => {
        res.statusCode = 678;
        res.end('pong');
    });
    http.get('http://localhost:1111', res => {
        t.equals(res.statusCode, 678);
        res.on('data', d => {
            t.equals(d.toString('utf8'), 'pong'); 
            close(t.end);
        });
    });
});

test('proxy', t => {
    const close = createServers((req, res) => http.get('http://localhost:2222', pres => pres.pipe(res)));
    http.get('http://localhost:1111', res => {
        res.on('data', d => {
            t.equals(d.toString('utf8'), CONTENT);
            close(t.end);
        });
    });
});

test('error handling a bogus url', t => {
    const handler = (req, res) => http.get('http://foo.bar.lit', pres => pres.pipe(res)).on('error', e => {
        res.writeHead(500);
        res.end();
    });
    const close = createServers(handler);
    http.get('http://localhost:1111', res => {
        t.equals(res.statusCode, 500);
        close(t.end);
    });  
});

test('error in server2 req', t => {
    const handler1 = (req, res) => http.get('http://localhost:2222', pres => pres.pipe(res)).on('error', e=> {
        res.statusCode =500;
        res.end(e.message);
    }).emit('error', new Error('TROLOLOL'));
    const handler2 = (req, res) => {};

    const close = createServers(handler1, handler2);
    http.get('http://localhost:1111', res => {
        res.on('data', d => {
            t.equals(d.toString('utf8'), 'TROLOLOL');
            close(t.end);
        });
    });
});
