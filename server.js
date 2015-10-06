
var app = require('express')();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');

// read noune file line by line
var dictionary_words = [];
var dictionary = require('fs').readFileSync('nouns').toString().split('\n').forEach(function (line) { 
  dictionary_words.push(line.toUpperCase()); 
})


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/'));

// GAME OBJECT
// Handles all variables associated with the game
function GAME(){
  this.clients = []; // tracks the order of who draws
  this.namestaken = []; // tracks the usernames taken
  this.leaderboard = {}; // tracks the points
  this.sockets = {}; // tracks the sockets of the players
  this.roundTime = 120; // sets the round time
  this.emergencyRoundTime = 30; // sets the emergency round time
  this.currentRoundTime = 120; // tracks the current tound time
  this.firstGuess = 0; // flag: sees if someone has got the first answer
  this.assignPoints = 10; // point value to assign
  this.inactiveTimeCheck = 30; // sets the duration for someone to be inactive
  this.isHere = false; // flag: sees if they are here
  this.eraserStatus = false; // flag: if you erase or not
  this.pointsDecay = false; // flag: checks if the points decay
  this.startPoints = 10; // static: start points
  this.disconnect = false;
}

// initialize the game
var game = new GAME();

// get first word
game.currentWord = dictionary_words[Math.floor((Math.random() * dictionary_words.length))];
console.log(game.currentWord);

// game loop
setInterval(function(){
  //
  //console.log(game.clients.length);
  // check if there are people
  // if there are no people skip
  if(game.clients.length > 1){
    //console.log('current round time: ' + game.currentRoundTime);
    //console.log('leaderboard: ' + game.leaderboard);
    /*
    for(var i=0; i<game.clients.length; i++){
      console.log(game.clients[i].id);
    }
    console.log('--');
    */
    
    // send out the word
    // give next person that draw oppertunity
    io.emit('assignDraw', game.clients[0].id);
    game.sockets[game.clients[0].id].emit('word',game.currentWord);
    
    // wait for timer, and check against inputs from chat
    // subtract 1 second from round time
    io.emit('roundTime', game.currentRoundTime);
    game.currentRoundTime -= 1;


    // decay points
    if(game.pointsDecay && game.assignPoints > 3){
      game.assignPoints -= 0.2;
      game.assignPoints = Math.round( game.assignPoints * 10) / 10;
      //console.log('points: ' + game.assignPoints);
    }

    //console.log(game.sockets[game.clients[0].id].connected);
    // if drawer hasn't drawn anything for the first game.inactiveTimeCheck, go to next user
    if(game.currentRoundTime < game.roundTime - game.inactiveTimeCheck && game.isHere == false || game.sockets[game.clients[0].id].connected == false){
      io.emit('inactiveDrawer');

      // remove them from arrays
      game.disconnect = true;
      checkSockets();
      reset();
    }
    if(game.currentRoundTime < 0){
      reset();
    }
    checkSockets();
  }else{
    //console.log(game.clients.length);
    game.currentRoundTime = game.roundTime;
    game.firstGuess = 0;
    game.isHere = false;
    io.emit('emptylobby');
  }

},1000);

function checkSockets(){
    // check if sockets still connected
  for(var user in game.sockets){
    if (game.sockets.hasOwnProperty(user)){
      if(game.sockets[user].connected == false){
        game.clients.splice(game.namestaken.indexOf(user),1);
        game.namestaken.splice(game.namestaken.indexOf(user),1);
        delete game.sockets[user];
      }
    }
  }
}

// resets the game state
function reset(){
  // reveal word
  io.emit('revealWord', game.currentWord);

  game.currentRoundTime = game.roundTime;
  game.firstGuess = 0;
  game.isHere = false;
  game.eraserStatus = false;
  game.pointsDecay = false;
  game.assignPoints = game.startPoints;
  // refresh to remove inactive players

  // if  the person drawing didnt disconnect
  // shift everyone up a spot
  if(!game.disconnect){
    game.namestaken.push(game.namestaken.shift());
    game.clients.push(game.clients.shift());
  }

  game.disconnect = false;

  dictionary_words.push(dictionary_words.shift());
  game.currentWord = dictionary_words[Math.floor((Math.random() * dictionary_words.length))];;

  io.emit('resetCanvas');
  // reset things that need to be reset
}


// intial connection
// recieves all the connections
io.on('connection', function(socket){

  socket.on('checkin',function(data){
    game.clients.push(data);
    game.namestaken.push(data.id);

    game.sockets[data.id] = socket;
    socket.broadcast.emit('someoneJoined', data.id);
    socket.emit('checkinResponse', [game.eraserStatus, game.leaderboard]);
    //delete game.clients[data.id];
    //console.log(socket);
  });

  // check user name is in list
  socket.on("checkUserTaken", function(username){
    if(game.namestaken.indexOf(username) > -1){
      socket.emit("checkUserTakenReturn", true);
    }else{
      socket.emit("checkUserTakenReturn", false)
    }
    console.log('username: ' + username);
  });

  // chat and checks if person guess the word correctly
  socket.on('chat message', function(data){

    // if msg == dictionary word is first instance, set timer into emergency mode
    if(data[1].toUpperCase() == game.currentWord && game.currentRoundTime > 0){
      console.log('guess correct');
      game.firstGuess += 1;
      game.pointsDecay = true;
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

      if(game.clients[0].id in game.leaderboard){
        game.leaderboard[game.clients[0].id] += game.assignPoints;
      }else{
        game.leaderboard[game.clients[0].id] = game.assignPoints;
      }

      io.emit("leaderboard", game.leaderboard);
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

  socket.on('color', function(color){
    socket.broadcast.emit('colorSet', color);
  });

});

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on ' + process.env.PORT);
});


