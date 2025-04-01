require("dotenv").config();
const express = require("express");
const requestLogger = require("./middleware/reqLogger");
const cors = require("cors")
const PORT = process.env.PORT;
const HOST = process.env.NODE_ENV == "LOCAL" ? process.env.LOCALHOST : process.env.SERVERHOST;
const routes = require('./router/index');
const db = require('./config/db');
const http = require("http");
const https = require("https");
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger)

var corsOptions = {
    origin: [`https://${HOST}:${PORT}`],
    optionsSuccessStatus: 200,
};

process.env.NODE_ENV == "LOCAL" ? app.use(cors()) : app.use(cors(corsOptions));
app.use(express.static('public'));

// const options = {
//     ...(process.env.NODE_ENV != "LOCAL" && {
//         key: fs.readFileSync(process.env.PRIVATEKEY),
//         cert: fs.readFileSync(process.env.CERTKEY),
//     }),
// };

const server = process.env.NODE_ENV == "LOCAL" ? http.createServer(app) : https.createServer(app);

app.get("/", (req, res) => {
    res.send(`<h1>AZ Work Running!</h1>`);
});

const start = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('Connection has been established successfully.');
        console.log("........................................................................")
        // await db.Company.sync({ alter: true });
        server.listen(PORT, () => {
            console.log(`AZ Work running on ${process.env.NODE_ENV == "LOCAL" ? "http" : "https"}://${HOST}:${PORT}/ ...`);
            console.log("........................................................................")
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};
start();

app.use(routes);

app.all("*", (req, res) => {
    res.status(405).json({ message: "The method is not allowed for the requested URl" });
});

