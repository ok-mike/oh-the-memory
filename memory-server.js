

import fs from "fs"
import https from "https"
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();


// Connect to database
// Edit this for your setup

const db = new pg.Client({
  user:     "postgres",
  host:     DBHOST,
  database: DBASE,
  password: PASSWD,
  port:     PORT,
});
db.connect();


// Provide certificates for HTTPS

var privateKey  = fs.readFileSync('PRIVATE KEY', 'utf8');
var certificate = fs.readFileSync('PUBLIC KEY', 'utf8');
var credentials = {key: privateKey, cert: certificate};


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


// JavaScript application will ask for Postgres table with highscores

app.get( "/score", async (req, res) => {

    let scores = await db.query(
      "SELECT score, playername, verdict \
        FROM scores ORDER BY score DESC LIMIT 10");

    res.json( { "scores" : scores.rows } );
  }
);


// JavaScript application posts player score

app.post( "/score", async (req, res) => {

    const player = req.body.player;
    const verdict = req.body.verdict;
    const score = req.body.score;

    // Do a lot more sanity-checking please!
    if (player.length>10) player = player[0,10];
    if (player.length>20) player = verdict[0,20];

    const result = await db.query(
      "INSERT INTO scores (playername, verdict, score) VALUES ($1, $2, $3)",
      [player, verdict, score]
    );

    res.redirect("/");
  }
);


// Dole out the gamecode

app.get( "/", async (req, res) => {
      res.render("oh-the-memory.ejs", {
          html_lang: "en",
          html_title: "Oh-the-Misery Memory",
          html_desc: "A puny JS game",
      }
  );
});


// Run Server, edit PORT for your setup

var port = PORT;
var httpsServer = https.createServer(credentials, app);

httpsServer.listen(
    port, () => {
        console.log(`Server running on port ${port}`);
    }
);

