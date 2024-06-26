import { Elysia, t } from 'elysia'
import { html } from '@elysiajs/html'

class Client {
    constructor(ws_send: (content: string) => void) {
        this.send = ws_send;
    }

    public async sendMessage(content: string | string[]) {
        this.send(await
            <div id="messages" hx-swap-oob="beforeend">
                {
                    typeof content === 'string'
                        ? <p safe>{content}</p>
                        : content.map(msg => <p safe>{msg}</p>)
                }
            </div>
        )
    }

    private send: (content: string) => void;
}

// channels' message histories and listeners
const channels = new Map<string, {listeners: string[], history: string[]}>()
channels.set("main", {listeners: [], history: []})
channels.set("other", {listeners: [], history: []})

// maps session IDs to Client handlers
const sessions = new Map<string, Client>()

new Elysia()
    .use(html())

    .get('/', ({ set }) => {
        let sessionId = ""
        do {
            sessionId = Math.random().toString(36).substring(2)
        } while(sessions.has(sessionId))

        set.headers['Set-Cookie'] = `session=${sessionId}`

        return (
            <html lang='en'>
                <head>
                    <title>Message others</title>

                    <script src="https://unpkg.com/htmx.org@2.0.0"></script>
                    <script src="https://unpkg.com/htmx-ext-ws@2.0.0/ws.js"></script>
                </head>

                <body  hx-ext="ws" ws-connect="/ws-main">
                    <h1>Message others</h1>
                    
                    <select id="channel" name="channel" hx-get="/channels" hx-trigger="change" hx-target="#messages" hx-swap="outerHTML">
                        <option value="main">Main</option>
                        <option value="other">Other</option>
                    </select>

                    <div id="messages"></div>

                    <form id="write-message" hx-include="#channel" ws-send>
                        <input name="message" />
                    </form>
                </body>
            </html>
        )
    })

    .get('/channels', 
        ({ query, cookie }) => {
            // remove listener from previous channel
            channels.forEach(channel => {
                channel.listeners = channel.listeners.filter(listener => listener !== cookie.session.value)
            })

            // add listener to new channel
            channels.get(query.channel)!.listeners.push(cookie.session.value)

            return (
                <div id="messages">
                    {channels.get(query.channel)!.history.map(msg => <p safe>{msg}</p>)}
                </div>
            )
        },
        {
            query: t.Object({
                channel: t.String()
            })
        }
    )

    .ws('/ws-main', {
        // runs whenever a new WebSocket connection is opened
        open(ws) {
            const sessionId = ws.data.cookie.session.value

            // setup Client handler for new WebSocket connection
            sessions.set(sessionId, new Client(ws.send))

            // send message history to new session
            sessions.get(sessionId)!.sendMessage(channels.get("main")!.history)

            channels.get("main")!.listeners.push(sessionId)
        },

        // runs every time a message is sent over a WebSocket connection
        message(ws, content) {
            const { channel, message } = content as { channel: string, message: string }

            // push new message to appropriate channel history
            channels.get(channel)!.history.push(message)

            // send the message to every session listening to the channel this message was posted to
            channels.get(channel)!.listeners.forEach(listener => {
                sessions.get(listener)!.sendMessage(message)
            })
        },

        // runs whenever a WebSocket connection is closed
        close(ws) {
            // delete session entry for the closed WebSocket
            sessions.delete(ws.data.cookie.session.value)

            // remove the session from all channel listeners
            channels.forEach(channel => {
                channel.listeners = channel.listeners.filter(listener => listener !== ws.data.cookie.session.value)
            })
        }
    })

    .listen(3000)