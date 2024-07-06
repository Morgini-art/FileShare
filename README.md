# FileShare
FileShare it's a program that allows you to share files to different devices in your local/global internet. FileShare is open-source so you can change program as you'd like to. FileShare is written in JavaScript (more precisely - in frontend JavaScript and Node.js) and use Express and Socket.io.
## Quick start
To start you need to run program using Node.js (if you don't have installed this you can do it as it's written here: [Node.js install](https://nodejs.org/en/download)). Type following command:
```
npm install
```
Then open file main.js from the main directory and then scroll to last fives lines:
```
const PORT = 3000;
server.listen(PORT, () => {
    console.info(`Server running at ${PORT}`);
    console.info(`Mounted at: ${config.mount}`);
});
```
At first now if you'd like to start a server at port in example 5304, you have to change line `const PORT = 3000;` to `const PORT = 5304`. Secondly if you want to start server at localhost don't change anything, otherwise if you want start server at specific ip addres i.e. `192.168.0.10`, change line `server.listen(PORT, () [...]` to `server.listen(PORT, '192.168.0.10, () [...]'`. At end you have to define your folder/disc that you want to share. To do this open file config.json and at value "mount" type your path to folder/disc. In the place of sign After this you can start the server by typing following command:
```
node main.js
```
Remember, be sure that you run this command for the file in main folder (it is FileShare) not folder \public. Finally you can open your browser and type appropriate address depending on the changes above you made above. When page is loaded you see a FileShare client (for more info look below).
## How to use from the client
FileShare client is special client that allows you browse files, just like in a file explorer, and open these files. For now FileShare mainly support video files (except .avi, .mkv, .flv), but it can also open some audio and image files.