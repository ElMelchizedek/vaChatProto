import { Elysia } from 'elysia'
import { html } from '@elysiajs/html'
import { swagger } from '@elysiajs/swagger'

const messages: string[] = []
const send_queues: string[][] = []
let user_id = 0

new Elysia()
    .use(html())
    .use(swagger())
    .get('/', () =>
        <html lang='en'>
            <head>
                <title>Message others</title>

                <script src="https://unpkg.com/htmx.org@2.0.0"></script>
                <script src="https://unpkg.com/htmx-ext-ws@2.0.0/ws.js"></script>
            </head>
            <body>
                <h1>Hello World</h1>

                <div hx-ext="ws" ws-connect="/ws">
                    <div id="messages"></div>

                    <form id="write-message" ws-send>
                        <input name="message" />
                    </form>
                </div>
            </body>
        </html>
    )
    .ws('/ws', {
        async open(ws) {
            const ws_id = user_id++
            send_queues[ws_id] = [...messages]

            setInterval(
                async () => {
                    ws.send(
                        <div id="messages" hx-swap-oob="beforeend">
                            {
                                send_queues[ws_id].map(message => 
                                    <p safe>
                                        {message}
                                    </p>
                                )
                            }
                        </div>
                    )

                    send_queues[ws_id] = []
                }, 
                200
            )
        },

        message(ws, message) {
            const msg = (message as any).message

            messages.push(msg)
            send_queues.forEach(queue => queue.push(msg))
        }
    })
    .listen(3000)
