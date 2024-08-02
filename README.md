# FileShare
FileShare it's a program that allows you to share files to different devices in your local/global internet. FileShare is open-source so you can change program as you'd like to. FileShare is written in JavaScript (more precisely - in frontend JavaScript and Node.js) and use Express and Socket.io.
## Quick start
To start you need to run program using Node.js (if you don't have installed this you can do it as it's written here: [Node.js install](https://nodejs.org/en/download)). Type following command:
```
npm install
```
Then open file config.json from the main directory:
```
{
    "mount": "I:\\",
    "ip": "localhost",
    "port": 3000
}
```
You can change this file as you want. After this you can start the server by typing following command:
```
node main.js
```
Remember, be sure that you run this command for the file in main folder (it is FileShare) not folder \public. Finally you can open your browser and type appropriate address depending on the changes above you made above. When page is loaded you see a FileShare client (for more info look below).
## How to use from the client
FileShare client is special client that allows you browse (and open them but not edit) files, just like in a file explorer, and open these files. For now FileShare mainly support video files (in example except .flv), but it can also open some audio and image files.
