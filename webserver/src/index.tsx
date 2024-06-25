import { Elysia, t } from 'elysia'
import { html } from '@elysiajs/html'
import { swagger } from '@elysiajs/swagger'

const messages: string[] = []
const users = new Map();

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
                <h1>Message others</h1>

                <div hx-ext="ws" ws-connect="/message-stream">
                    <div id="messages"></div>

                    <form id="write-message" ws-send>
                        <input name="message" />
                    </form>
                </div>
            </body>
        </html>
    )
    .ws('/message-stream', {
        open(ws) {
            users.set(ws.id, {
                toSend: [...messages], 
                updater: null
            })

            const user = users.get(ws.id)

            user.updater = setInterval(
                async () => {
                    ws.send(
                        <div id="messages" hx-swap-oob="beforeend">
                            {
                                users.get(ws.id).toSend.map((message: string) => 
                                    <p safe>
                                        {message}
                                    </p>
                                )
                            }
                        </div>
                    )

                    user.toSend = []
                }, 
                500
            )
        },

        message(ws, message) {
            const msg = (message as any).message

            messages.push(msg)
            users.forEach(user => user.toSend.push(msg))
        },

        close(ws) {
            clearInterval(users.get(ws.id).updater)
        }
    })
    .listen(3000)
