
var app = require('express')();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');

var dictionary = require('./dictionary.json');
var dictionary_words = Object.keys(dictionary).map(function(k){
    return k;
});
//dictionary = JSON.parse(dictionary);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/'));

// GAME OBJECT
// Handles all variables associated with the game
function GAME(){
  this.clients = []; // tracks the order of who draws
  this.leaderboard = {}; // tracks the points
  this.sockets = {}; // tracks the sockets of the players
  this.roundTime = 120; // sets the round time
  this.emergencyRoundTime = 30; // sets the emergency round time
  this.currentRoundTime = 120; // tracks the current tound time
  this.firstGuess = 0; // flag: sees if someone has got the first answer
  this.assignPoints = 10; // point value to assign
  this.inactiveTimeCheck = 30; // sets the duration for someone to be inactive
  this.isHere = false; // flag: sees if they are here
  this.eraserStatus = false;
}

// initialize the game
var game = new GAME();

// get first word
game.currentWord = dictionary_words[0];

// game loop
setInterval(function(){
  //console.log(game.clients.length);
  // check if there are people
  // if there are no people skip
  if(game.clients.length > 1){
    console.log('current round time: ' + game.currentRoundTime);
    //console.log('leaderboard: ' + game.leaderboard);
    // send out the word
    // give next person that draw oppertunity
    io.emit('assignDraw', game.clients[0].id);
    game.sockets[game.clients[0].id].emit('word',game.currentWord);
    
    // wait for timer, and check against inputs from chat
    // subtract 1 second from round time
    io.emit('roundTime', game.currentRoundTime);
    game.currentRoundTime -= 1;


    // if drawer hasn't drawn anything for the first game.inactiveTimeCheck, go to next user
    if(game.currentRoundTime < game.roundTime - game.inactiveTimeCheck && game.isHere == false){
      io.emit('inactiveDrawer');
      game.clients.splice(0,1);
      reset();
    }
    if(game.currentRoundTime < 0){
      io.emit('revealWord', game.currentWord);
      reset();
    }

  }else{
    console.log('nobody in here');
    game.currentRoundTime = game.roundTime;
    game.firstGuess = 0;
    game.isHere = false;
    io.emit('emptylobby');
  }

},1000);

// resets the game state
function reset(){
  game.currentRoundTime = game.roundTime;
  game.firstGuess = 0;
  game.isHere = false;
  game.eraserStatus = false;
  // refresh to remove inactive players

  // shift everyone up a spot
  game.clients.push(game.clients.shift());

  dictionary_words.shift();
  game.currentWord = dictionary_words[0];

  io.emit('resetCanvas');
  // reset things that need to be reset
}


// intial connection
// recieves all the connections
io.on('connection', function(socket){

  socket.on('checkin',function(data){
    game.clients.push(data);

    game.sockets[data.id] = socket;
    socket.broadcast.emit('someoneJoined', data.id);
    socket.emit('checkinResponse', game.eraserStatus);
    //delete game.clients[data.id];
    //console.log(socket);
  });

  // chat and checks if person guess the word correctly
  socket.on('chat message', function(data){

    // if msg == dictionary word is first instance, set timer into emergency mode
    if(data[1].toUpperCase() == game.currentWord && game.currentRoundTime > 0){
      console.log('guess correct');
      game.firstGuess += 1;
      if(game.firstGuess == 1){
        game.currentRoundTime = game.emergencyRoundTime;
        console.log('emergency time activated')
      }

      // assign points to person
      if(data[0] in game.leaderboard){
        game.leaderboard[data[0]] += game.assignPoints;
      }else{
        game.leaderboard[data[0]] = game.assignPoints;
      }

      game.sockets[data[0]].emit('correctAnswer', game.assignPoints);
    }else{
      io.emit('chat message', data[0] + ': ' + data[1]);
    }

    //console.log('message: ' + msg);
  });

  socket.on('eraser', function(status){
    game.eraserStatus = status;
    socket.broadcast.emit('eraserStatus', status);
  });

  socket.on('draw',function(player){
    if(player.id == game.clients[0].id){
      game.isHere = true;
    }
    socket.broadcast.emit('drawOther', player);
  });


});

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on ' + process.env.PORT);
});


