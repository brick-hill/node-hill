![](https://cdn.discordapp.com/attachments/601268924251897856/625840747828084757/node-hill_SMALL.png)

## What is this?
A Brick Hill legacy server written from the ground up in Node.js.

## What does this do?
It allows you to host Brick Hill servers efficiently, and headlessly (VPS hosting, etc). It comes
with a fully-packed scripting API that lets you do things the legacy server normally couldn't do.

It can load .brk files to the client extremely fast, but at the same time being memory and CPU
efficient. Allowing for long-term 24/7 hour hosting.

## What does this NOT do?
This does not provide any additional functionality to the legacy client.

ie. The client will not gain any FPS improvements.

### Installation:

1. Download Node.js 8 or above at https://nodejs.org/en/download/

2. Download and extract the template [here](https://gitlab.com/brickhill/open-source/node-hill/uploads/562d6b10d76d056a3430e0c99d955a8a/node-hill-template.zip).

3. Open the extracted folder in the file explorer, and in the top bar type "cmd" and press enter.
![](https://cdn.discordapp.com/attachments/601268924251897856/648273282315059247/unknown.png)

4. Run `npm i node-hill@latest`, as this will install the needed dependencies for node-hill to function.
![](https://cdn.discordapp.com/attachments/601268924251897856/648273827704602635/unknown.png)

5. Edit the `start.js` file to fill in your appropriate server information. \
You will need to add your host key for the set you want to host. This can be found under the set's settings page.
![](https://cdn.discordapp.com/attachments/809904816867901500/859272870114623528/unknown.png)

6. Finally, start your server by launching `launch_server.bat` or by running `node ./start.js`.
![](https://cdn.discordapp.com/attachments/601268924251897856/648274112740982794/unknown.png)

### Additional information
You __must__ port forward if you want other players to be able to play your game. The recommended port for Brick Hill is: 42480.

You are able to bundle your map/scripts into a single .bbrk file by launching your server with the --bundle option. 

For example: `node .\start.js --bundle`

For more information on bundling check out [nh-bundle](https://www.npmjs.com/package/nh-bundle). 

### Documentation
Can be found here: [https://brickhill.gitlab.io/open-source/node-hill/](https://brickhill.gitlab.io/open-source/node-hill/index.html).
