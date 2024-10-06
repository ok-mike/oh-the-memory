
// Load sound files

let audioMouseIn = new Audio("sounds/tock.mp3");
let audioRaspb = new Audio("sounds/raspb.mp3");
let piano_notes = [
    new Audio("sounds/key08.mp3"),
    new Audio("sounds/key10.mp3"),
    new Audio("sounds/key12.mp3"),
    new Audio("sounds/key13.mp3"),
    new Audio("sounds/key15.mp3"),
    new Audio("sounds/key17.mp3"),
    new Audio("sounds/key19.mp3"),
    new Audio("sounds/key20.mp3"),
];
let cheering = new Audio("/sounds/crowd-cheering-6229.mp3");

let score = 100;


// Wait for page loaded, then create the game board

$(document).ready(() => {

    // Create a 4x4 HTML grid of divs
    let markup = '<div id="memory-board">\n';
    for (let i=1; i<=4; i++) {
        for (let j=1; j<=4; j++) {
                markup += `<div id="${i}${j}"></div>`;
        }
        markup += "\n"
    }
    markup += "</div>";
    console.log(markup);

    // Assign the grid to this DIV on the host page
    $("#inner .gameboard").html(markup);

    function coverTile(i,j) {
        let tile = $("#memory-board #" + i + j);
        $(tile).css("background-color", "rgb(236, 197, 203)");
    }

    for (let i=1; i<=4; i++) 
        for (let j=1; j<=4; j++) coverTile(i,j);
});



function updateScore(x){
    score += x;
    $(".gameinfo").html(score);
}


// Subtract points every 7 seconds

function penalty(){
    updateScore(-3);
}


// When player has finished the game, do this

function scoring()
{
    $.getJSON('/score', (data) => {

        const scores = data["scores"];

        let markup = scores
        .map(item => `<li><span class="highscore">
                        ${item.score}</span>
                          = ${item.playername}
                           ("${item.verdict}")</li>`)
        .join('\n');

        let ul = "<ul> High Scores:\n" + markup + "\n</ul>";

        let scoreForm = `<form action="/score" method="POST">\
                <div>\
                    <label for="player">Your Name</label>\
                    <input type="player" name="player"\
                        placeholder="Spiderman"\
                        autocomplete="none"\
                        id="player" required>\
                </div>\
                <div>\
                    <label for="verdict">Your comment</label>\
                    <input type="verdict" name="verdict"\
                        placeholder="lorem ipsum"\
                        autocomplete="none"\
                        id="verdict">\
                </div>\
                <div hidden>\
                    <input type="score" name="score"\
                        placeholder="lorem ipsum"\
                        autocomplete="none"\
                        id="score" value="${score}">\
                </div>\
                <button type="submit">Send</button>\
            </form>`;

        $(".game").html( scoreForm + ul);
    });

};


// Pressing the "go" button starts the game and coaxes
// Chrome and the lot into not wanting to complain

$("#inner").on("click", "#go", function(event) {

    $("#go").css('visibility', 'hidden');
    $(".score").removeAttr('hidden');

    let gameTimer = setInterval(penalty, 7000);
    updateScore(0);

    // This function finds a random tile that hasn't a note on it yet 
    function findEmptyTile() {
        while (1) {
           var tileNum = Math.floor(16*Math.random());
           if (!gameState[tileNum]) {
            return tileNum;
           }
        }
    }

    let gameState = new Array(16);

    // This could be used to penalize the score
    // Player should remember the tiles/notes and have fewer clicks
    let clicksPerNote = new Array(8);

    for (let i = 0; i<16; i++) gameState[i] = 0;
    for (let note = 1; note<=8; note++) {
            gameState[findEmptyTile()] = note-1;
            gameState[findEmptyTile()] = note-1;
            clicksPerNote[note] = 0;
    }

    // The following batch of functions convert between the
    // 2D game board coordinates and the "flat" 1D array representation
    // since JS is weird about tensors

    function xFromId(id) {
        return id.toString().charAt(0);
    }
    
    function yFromId(id) {
        return id.toString().charAt(1);
    }

    function flatCoord(x,y) {
        return 4 * (Number(x)-1) + (Number(y)-1);
    }

    function xyStr(flatcoord) {
        x = Math.floor(flatcoord / 4) + 1;
        y = (flatcoord % 4) + 1;
        return `${x}${y}`;
    }

    // PLayer has clicked on a "second" tile and the pair they
    // guessed was correct

    function markCorrectAt (x,y) {
        $("#memory-board #" + xyStr(firstSelected))
            .css("background-color", "green");
        gameState[flatCoord(x,y)] = -1;

        $("#memory-board #" + x + y).css("background-color", "green");
        gameState[firstSelected] = -1;

        $("#memory-board #" + x + y)
            .css({backgroundImage : 'url(note-1314940_640.png)'});

        updateScore(10);

        if (checkWin()) {
                cheering.play();
                clearInterval(gameTimer);
                scoring();
        }
    }

    // Player wants to compare a first tile with some other

    function selectFirstAt (x,y) {
        firstSelected = flatCoord(x,y);

        $("#memory-board #" + xyStr(firstSelected))
            .css({backgroundImage : 'url(note-1314940_640.png)'});
        
        $("#memory-board #" + xyStr(firstSelected))
            .css("background-color", "rgb(236, 197, 203)");
    }

    // Player guessed wrong about a pair of tiles being the same note

    function clearPairAt(x,y) {
        $("#memory-board #" + xyStr(firstSelected))
           .css({backgroundImage : ''});
        $("#memory-board #" + xyStr(firstSelected))
            .css("background-color", "rgb(236, 197, 203)");

        $("#memory-board #" + xyStr(firstSelected))
           .css({backgroundImage : ''});
        $("#memory-board #" + x + y)
            .css("background-color", "rgb(236, 197, 203)");
        
        updateScore(
            - gameState>0 ? clicksPerNote[gameState[firstSelected]] : 0
        );
    }

    function checkWin() {
        for (let i=0; i<16; i++) {
            if (gameState[i] != -1) return false;
        }
        return true;
    }

    let firstSelected = -1;
    let nowPlaying = null;

    $("#memory-board").on("click", "div", function(event) {
        
            event.preventDefault();
            let id = $(this).attr("id");
            let x = xFromId( id );
            let y = yFromId( id );
            let here = flatCoord(x,y);
            let tileNote = gameState[here];
            clicksPerNote[tileNote] += 1;

            if (tileNote == -1) return; /* ignore, has been guessed */

            if (nowPlaying) {
                nowPlaying.pause();
                nowPlaying.currentTime = 0.0;
            }
            nowPlaying = piano_notes[tileNote];
            nowPlaying.play();

            if (firstSelected != -1) {
            
                    // Player didn't guess correctly, or clicked
                    // on the same square as their first guess
                    if ( (gameState[firstSelected] != gameState[here])
                            || (firstSelected == here)) {
                        audioRaspb.play();
                        clearPairAt(x,y);
                    }
                    else markCorrectAt(x,y);
                    firstSelected = -1;
            }
            else selectFirstAt(x,y);
    });


    // These functions are just to prettify the UX with some
    // acoustic feedback

    $("#memory-board").on("mouseenter", "div", function(event) {
        
        event.preventDefault();
        let id = $(this).attr("id");
        let x = xFromId( id );
        let y = yFromId( id );

        if (gameState[flatCoord(x,y)] == -1) return; /* guessed */

        if (firstSelected != flatCoord(x,y)) {
            $(this).css("background-color", "bisque");
            audioMouseIn.play();
        }
    });
  
    $("#memory-board").on("mouseout", "div", function(event) {
        
        event.preventDefault();
        let id = $(this).attr("id");
        let x = xFromId( id );
        let y = yFromId( id );
        
        if (gameState[flatCoord(x,y)] == -1) return; /* guessed */

        if (firstSelected != flatCoord(x,y)) {
            $(this).css("background-color", "rgb(236, 197, 203)");
        }
    });

});