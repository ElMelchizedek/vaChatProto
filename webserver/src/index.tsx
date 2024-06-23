import { Elysia } from 'elysia'
import { html } from '@elysiajs/html'

new Elysia()
    .use(html())
    .get('/jsx', () => (
        <html lang='en'>
            <head>
                <title>Hello World</title>
            </head>
            <body>
                <h1>Hello World</h1>
            </body>
        </html>
    ))
    .listen(3000)