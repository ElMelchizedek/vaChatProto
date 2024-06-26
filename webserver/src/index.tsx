import { Elysia, t } from 'elysia'
import { html } from '@elysiajs/html'

// message history
const messages: string[] = []

// maps WebSocket connection IDs to functions that will send messages to those WebSocket connections
const connections = new Map<string, (content: string | string[]) => void>()

new Elysia()
    .use(html())

    .get('/', () =>
        <html lang='en'>
            <head>
                <title>Message others</title>

                <script src="https://unpkg.com/htmx.org@2.0.0"></script>
                <script src="https://unpkg.com/htmx-ext-ws@2.0.0/ws.js"></script>
            </head>
            
            <body  hx-ext="ws" ws-connect="/ws-main">
                <h1>Message others</h1>

                <div id="messages"></div>

                <form id="write-message" ws-send>
                    <input name="message" />
                </form>
            </body>
        </html>
    )

    .ws('/ws-main', {
        // runs whenever a new WebSocket connection is opened
        open(ws) {
            // setup message sender for this WebSocket connection
            connections.set(ws.id, 
                content => ws.send(
                    <div id="messages" hx-swap-oob="beforeend">
                        {
                            typeof content === 'string'
                                ? <p safe>{content}</p>
                                : content.map(msg => <p safe>{msg}</p>)
                        }
                    </div>
                )
            )

            // send message history to new client
            connections.get(ws.id)!(messages)
        },

        // runs every time a message is sent over a WebSocket connection
        message(ws, message) {
            const msg = (message as any).message

            // push new message to message history
            messages.push(msg)

            // send the message to every client
            connections.forEach(send => send(msg))
        },

        // runs whenever a WebSocket connection is closed
        close(ws) {
            // delete connection entry for the closed WebSocket
            connections.delete(ws.id)
        }
    })

    .listen(3000)