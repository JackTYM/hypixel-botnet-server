const mineflayer = require('mineflayer')
const fs = require('fs')
const http = require('http');
const async = require('async');
const axios = require('axios')
const port = 4976;

let maxLobbyChecks = 5;

let bots = []
let bot_translations = []
let temp_translations = []

let settings = {
    webhook: "https://discord.com/api/webhooks/1089785281017815141/DoNbGnLQIljKrd0-LYBcFDAiRCzBPULwQI4gowLcgTBMS4REFaMts7eamCHVcP0K8Mc2"
}

fs.readFile("username-cache.json", (err, data) => {
    if (err) throw err

    bot_translations = JSON.parse(data.toString());
})

fs.readFile("accounts.json", (err, data) => {
    if (err) throw err

    const accounts = JSON.parse(data.toString())

    console.log(accounts.length + " Accounts Loaded!")
    console.log(bot_translations.length + " Usernames Cached!")
    console.log('Loading Accounts. Please wait ' + accounts.length * 10 + " seconds.")
    for (let index in accounts) {
        setTimeout(() => {
            loadBot(accounts[index])
        }, 10000 * (index))
    }

    setTimeout(() => {
        save_cache()

        console.log("Done Loading Accounts!")

        trySendWebhook(
            {
                "content": null,
                "embeds": [
                    {
                        "title": "Server Started!",
                        "color": 255,
                        "fields": [
                            {
                                "name": `${accounts.length} Accounts Loaded!`,
                                "value": `${accounts.toString().replaceAll(",", "\n").replaceAll("[", "").replaceAll("]", "")}`
                            },
                            {
                                "name": `${bot_translations.length} Usernames Cached!`,
                                "value": `${bot_translations.toString().replaceAll(",", "\n").replaceAll("[", "").replaceAll("]", "")}`
                            }
                        ]
                    }
                ],
                "attachments": []
            })
    }, 10000 * accounts.length + 500)
})

function trySendWebhook(embed) {
    if (settings.webhook !== "") {
        axios({
            method: "POST",
            url: settings.webhook,
            headers: {"Content-Type": "application/json"},
            data: embed
        })
    }
}

function save_cache() {
    bot_translations = temp_translations

    fs.writeFile("username-cache.json", JSON.stringify(bot_translations), {
        encoding: "utf8",
        flag: "w",
        mode: 0o666
    }, (err) => {
        if (err) throw err
    })
}

function loadBot(account) {
    console.log("Loading " + account)
    const bot = mineflayer.createBot({
        host: 'mc.hypixel.net',
        version: '1.8.9',
        username: account,
        auth: 'microsoft'
    })
    bot.setMaxListeners(0)
    bots.push(bot)

    bot.on('message', (msg) => {
        if (msg.toString().includes("The game starts in 1 second!")) {
            //if (msg.toString().includes("▬▬")) {
            setInterval(() => {
                bot.chat("/l")
            }, 2000);
        } else if (msg.toString().includes("Friend request from ")) {
            bot.chat("/f accept " + msg.toString().split("Friend request from ")[1]);
        }
        //console.log("[" + bot.username + "] " + msg.toString())
    })
    bot.once('spawn', () => {
        console.log("  - " + bot.username + " Successfully Logged In!")

        temp_translations.push(bot.username)

        bot.chat("/f Sandal61")

        trySendWebhook(
            {
                "content": null,
                "embeds": [{
                    "title": "Account Logged In!",
                    "color": 65280,
                    "fields": [
                        {
                            "name": `${bot.username}`,
                            "value": ``
                        }
                    ],
                    "image": {
                        "url": `https://render.skinmc.net/3d.php?user=${bot.username}&vr=-10&hr0&hrh=25&aa=&headOnly=true&ratio=10`
                    }
                }],
                "attachments": []
            })
    })
    bot.on('kicked', (reason) => {
        console.log(`${bot.username} was kicked for ${reason}`);
        setTimeout(() => {
            loadBot(account)

            temp_translations = temp_translations.filter((c, index) => {
                return temp_translations.indexOf(c) === index;
            });

            save_cache()

            trySendWebhook(
                {
                    "content": null,
                    "embeds": [{
                        "title": "Account Kicked!",
                        "color": 16711680,
                        "fields": [
                            {
                                "name": `${bot.username}`,
                                "value": `Kicked For ${reason}`
                            }
                        ],
                        "image": {
                            "url": `https://render.skinmc.net/3d.php?user=${bot.username}&vr=-10&hr0&hrh=25&aa=&headOnly=true&ratio=10`
                        }
                    }
                    ],
                    "attachments": []
                })
        }, 5000);
    });
}

function floodServer(bot, callback, payload, runs) {
    bot.chat("/play " + payload.game)
    setTimeout(() => {
        const map = bot.scoreboard.sidebar.itemsMap;

        for (let index in map) {
            if (map[index].value === Object.keys(map).length) {
                let str = map[index].displayName.toString().split(" ");
                if (str[str.length - 1].replace(/[^\x00-\x7F]/g, '') !== payload.lobby) {
                    setTimeout(() => {
                        if (runs < maxLobbyChecks) {
                            floodServer(bot, callback, payload, runs + 1)
                        } else {
                            bot.chat("/l")
                        }
                    }, 4000)
                }
            }
        }
    }, 1000)
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('Received data:', data);
                if (req.url === '/flood') {
                    trySendWebhook(
                        {
                            "content": null,
                            "embeds": [{
                                "title": `Sending ${bot_translations.length} Bots!`,
                                "color": 1,
                                "fields": [
                                    {
                                        "name": `${data.game}`,
                                        "value": `${data.lobby}`
                                    }
                                ]
                            }],
                            "attachments": []
                        })

                    async.eachLimit(bots, bots.length, (bot, next) => {
                        floodServer(bot, next, data, 0)
                    }, (err) => {
                        if (err) console.log('Error: ' + err)
                    })
                } else if (req.url === "/chat") {
                    trySendWebhook(
                        {
                            "content": null,
                            "embeds": [{
                                "title": `Sending Chat Messages!`,
                                "color": 1,
                                "fields": [
                                    {
                                        "name": `Message`,
                                        "value": `${data.message}`
                                    }
                                ]
                            }],
                            "attachments": []
                        })

                    for (const bot in bots) {
                        bot.chat(data.message)
                    }
                }
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('Data received\n');

            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('Bad Request\n');
            }
        });
    } else if (req.method === 'GET' && req.url === '/accounts') {
        try {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(bot_translations));
        } catch (error) {
            console.error('Error parsing JSON:', error);
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end('Bad Request\n');
        }
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not Found\n');
    }
})

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});