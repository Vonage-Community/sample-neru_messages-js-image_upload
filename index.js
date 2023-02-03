import { neru, Assets, Messages } from 'neru-alpha';
import express from 'express';
import busboy from 'busboy';
import path from 'path';
import os from 'os';
import fs from 'fs';

const app = express();
const port = process.env.NERU_APP_PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/_/health', async (req, res) => {
    res.sendStatus(200);
});

app.post('/upload', async (req, res, next) => {
    try { 
        const bb = busboy({ headers: req.headers });
        var filePath;
        var number;

        bb.on('field', (name, val, info) => {
            number = val;
        });

        bb.on('file', (name, file, info) => {
            filePath = path.join(os.tmpdir(), `image.png`); 
            file.pipe(fs.createWriteStream(filePath));
        });

        bb.on('close', async function() {
            const session = neru.createSession();
            const assets = new Assets(session);
            const messages = new Messages(session);

            await assets.uploadFiles([filePath], '/imgs').execute();
            const fileData = await assets.generateLink('/imgs/image.png', '5w').execute();

            await messages.send({
                message_type: 'text',
                to: number,
                from: process.env.VONAGE_NUMBER,
                channel: 'sms',
                text: `Image Link: ${fileData.downloadUrl}`
            }).execute();

            res.writeHead(303, { Connection: 'close', Location: '/' });
            res.end(); 
        });

        req.pipe(bb);
    } catch (error) {
        next(error);
    }
});

app.post('/onEvent', async (req, res) => {
    console.log('message id is: ', req.body.message_uuid);
    console.log('message status is: ', req.body.status);
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});