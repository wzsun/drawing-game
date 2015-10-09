
var socket = io();

var game = new GAME();
var player = new PLAYER();

// GAME OBJECT
// keeps track of all the variables associated with the game
function GAME(){
  //canvas stuff
  this.width = window.innerWidth;
  this.height = window.innerHeight;
  var c = document.getElementById('cvs');
  this.c = c;

  var eraser = document.getElementById('eraser');
  this.eraser = eraser;

  var tools = document.getElementById('tools');
  this.tools = tools;

  var ctx = c.getContext('2d');
  this.ctx = ctx;
  this.c.width = this.width;
  this.c.height = this.height;
  this.clients = {};
  this.canChat = true;
  this.oddmsg = false;

  this.eraserStatus = false;
  this.eraserCheck = true;

  var leaderboard = document.getElementById('userlist');
  this.leaderboard = leaderboard;

  var userOrderList = document.getElementById('playerOrder');
  this.userOrderList = userOrderList;

  this.nameTaken = true;
  this.initCount = 0;

  this.emergencyTime = false;
  this.timeLeftSwitch = true;
}

// draws the lines on the canvas
GAME.prototype.drawLine = function(prevx, prevy, currentx, currenty){
  this.ctx.beginPath();
  this.ctx.moveTo(prevx, prevy);
  this.ctx.lineTo(currentx, currenty);

  if(this.eraserStatus){
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 50;
  }else{
    this.ctx.strokeStyle = player.color;
    this.ctx.lineWidth = 1; 
  }

  this.ctx.stroke();
}

// Writes MSGS to the chat
// case 0 default
// case 1 system
// case 2 user joined
// case 3 correct answer
// case 4 close answer
GAME.prototype.writeMSG = function(msg, val){
  var newline = document.createElement('li');
  
  switch(val){
    case 1:
      newline.className = "systemli";
      break;
    case 2:
      newline.className = "userli";
      break;
    case 3:
      newline.className = "correctli";
      break;
    case 4:
      newline.className = "closeli";
      break;
    default:
      if(this.oddmsg){
        newline.className = "oddli";
        this.oddmsg = false;
      }else{
        newline.className = "evenli";
        this.oddmsg = true;
      }
  }

  newline.innerHTML = msg;
  var chatList = document.getElementById('chatList');
  chatList.appendChild(newline);
  chatList.scrollTop = chatList.scrollHeight;
}

GAME.prototype.updateLeaderboard = function(leaderboard){
  while(game.leaderboard.firstChild){
    game.leaderboard.removeChild(game.leaderboard.firstChild);
  }
  for(var i=0; i<leaderboard.length; i++){
      var newline = document.createElement('li');
      newline.innerHTML = (i+1) + ". " + leaderboard[i].name + ": " + Math.floor( leaderboard[i].points * 100) / 100;
      game.leaderboard.appendChild(newline);
  }
}

// CHANGES THE DRAWER's NAME
GAME.prototype.changeDrawName = function(name){
  document.getElementById('drawname').innerHTML = name.toUpperCase() + " IS DRAWING";
  document.getElementById('drawname').style.fontWeight = "bold";
}

GAME.prototype.updatePlayerList = function(playerlist){
  // show user list
  document.getElementById('emptylobby').style.display = "none";
  game.userOrderList.style.display = "block";
  var count = 1;

  while(game.userOrderList.firstChild){
    game.userOrderList.removeChild(game.userOrderList.firstChild);
  }
  for(var user in playerlist){
    if(playerlist.hasOwnProperty(user)){
      var newline = document.createElement('li');
      newline.className = "orderlist";
      newline.innerHTML = count + ': ' + playerlist[user].id;
      game.userOrderList.appendChild(newline);
      count++;
    }
  }
}

// PLAYER OBJECT
// keeps track of all the information for the player
function PLAYER(){
  this.prevx = 0;
  this.prevy = 0;
  this.x = 0;
  this.y = 0;
  this.drawing = false;
  this.lastEmit = (new Date).getTime();
  this.id = "";
  this.tempid = "";
  this.canDraw = false;

  this.color = '#000000';
}

// DRAWS WHAT THE OTHER PLAYER IS DRAWING
socket.on('drawOther',function(data){
  if(data.drawing && data.id in game.clients && data.canDraw){
    game.drawLine(game.clients[data.id].x, game.clients[data.id].y, data.x, data.y);
  }

  game.clients[data.id] = data;
  //game.clients[data.id].updated = (new Date).getTime();
});

// DETECTS MOUSE DOWN
game.c.addEventListener('mousedown', function(e) {
  player.drawing = true;
  player.prevx = e.clientX;
  player.prevy = e.clientY;
  //console.log('('+player.prevx+','+player.prevy+')');
});

// DETECTS MOUSE UP
game.c.addEventListener('mouseup', function(e){
  player.drawing = false;
});

// DETECTS WHEN MOUSE LEAVES THE WINDOW
game.c.addEventListener('mouseleave', function(e){
  player.drawing = false;
});

// DETECTS WHEN THE MOUSE MOVES
game.c.addEventListener('mousemove', function(e){
  
  // update positions
  player.x = e.clientX;
  player.y = e.clientY;

  // send time
  if((new Date).getTime() - player.lastEmit > 10){
    
    socket.emit('draw',player);
    player.lastEmit = (new Date).getTime();
  }

  if(player.drawing && player.canDraw){
    game.drawLine(player.prevx, player.prevy, player.x, player.y);
    player.prevx = e.clientX;
    player.prevy = e.clientY;
  }
});

// changes eraser
game.eraser.addEventListener('mouseup', function(e){
  if(player.canDraw){
    if(game.eraserCheck){
      game.eraser.className = "eraseron";
      game.eraserStatus = true;
      game.eraserCheck = false;
      socket.emit('eraser', game.eraserStatus);
    }else{
      game.eraser.className = "eraseroff";
      game.eraserStatus = false;
      game.eraserCheck = true;
      socket.emit('eraser', game.eraserStatus);
    }
  }
});

// give hint
document.getElementById('hint').addEventListener('mouseup', function(e){
  socket.emit('givehint');
  //console.log('press hint');
});

var resetSelection = function(){
  document.getElementById('turquoise').style.borderStyle = "none";
  document.getElementById('emerald').style.borderStyle = "none";
  document.getElementById('river').style.borderStyle = "none";
  document.getElementById('sun').style.borderStyle = "none";
  document.getElementById('carrot').style.borderStyle = "none";
  document.getElementById('alizarin').style.borderStyle = "none";
  document.getElementById('amethyst').style.borderStyle = "none";
  document.getElementById('asphalt').style.borderStyle = "none";
  document.getElementById('concrete').style.borderStyle = "none";
  document.getElementById('brown').style.borderStyle = "none";
  document.getElementById('purple').style.borderStyle = "none";
  document.getElementById('black').style.borderStyle = "none";
};

document.getElementById('turquoise').addEventListener('mouseup',function(e){
  player.color = '#1abc9c';

  resetSelection();
  document.getElementById('turquoise').style.borderStyle = "solid";
  document.getElementById('turquoise').style.borderColor = "#2C3E50";
  document.getElementById('turquoise').style.borderWidth = "1px";

  socket.emit('color', player.color);
});
document.getElementById('emerald').addEventListener('mouseup',function(e){
  player.color = '#2ecc71';

  resetSelection();
  document.getElementById('emerald').style.borderStyle = "solid";
  document.getElementById('emerald').style.borderWidth = "1px";
  document.getElementById('emerald').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('river').addEventListener('mouseup',function(e){
  player.color = '#3498db';

  resetSelection();
  document.getElementById('river').style.borderStyle = "solid";
  document.getElementById('river').style.borderWidth = "1px";
  document.getElementById('river').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('sun').addEventListener('mouseup',function(e){
  player.color = '#f1c40f';

  resetSelection();
  document.getElementById('sun').style.borderStyle = "solid";
  document.getElementById('sun').style.borderWidth = "1px";
  document.getElementById('sun').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('carrot').addEventListener('mouseup',function(e){
  player.color = '#e67e22';

  resetSelection();
  document.getElementById('carrot').style.borderStyle = "solid";
  document.getElementById('carrot').style.borderWidth = "1px";
  document.getElementById('carrot').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('alizarin').addEventListener('mouseup',function(e){
  player.color = '#e74c3c';

  resetSelection();
  document.getElementById('alizarin').style.borderStyle = "solid";
  document.getElementById('alizarin').style.borderWidth = "1px";
  document.getElementById('alizarin').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('amethyst').addEventListener('mouseup',function(e){
  player.color = '#9b59b6';

  resetSelection();
  document.getElementById('amethyst').style.borderStyle = "solid";
  document.getElementById('amethyst').style.borderWidth = "1px";
  document.getElementById('amethyst').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('asphalt').addEventListener('mouseup',function(e){
  player.color = '#34495e';

  resetSelection();
  document.getElementById('asphalt').style.borderStyle = "solid";
  document.getElementById('asphalt').style.borderWidth = "1px";
  document.getElementById('asphalt').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('concrete').addEventListener('mouseup',function(e){
  player.color = '#95a5a6';

  resetSelection();
  document.getElementById('concrete').style.borderStyle = "solid";
  document.getElementById('concrete').style.borderWidth = "1px";
  document.getElementById('concrete').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('purple').addEventListener('mouseup',function(e){
  player.color = '#BB3658';

  resetSelection();
  document.getElementById('purple').style.borderStyle = "solid";
  document.getElementById('purple').style.borderWidth = "1px";
  document.getElementById('purple').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('brown').addEventListener('mouseup',function(e){
  player.color = '#6D4C41';

  resetSelection();
  document.getElementById('brown').style.borderStyle = "solid";
  document.getElementById('brown').style.borderWidth = "1px";
  document.getElementById('brown').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});
document.getElementById('black').addEventListener('mouseup',function(e){
  player.color = '#3B3C3D';

  resetSelection();
  document.getElementById('black').style.borderStyle = "solid";
  document.getElementById('black').style.borderWidth = "1px";
  document.getElementById('black').style.borderColor = "#2C3E50";
  
  socket.emit('color', player.color);
});

socket.on('eraserStatus', function(status){
  if(status){
    game.eraser.className = 'eraseron';
  }else{
    game.eraser.className = 'eraseroff';
  }
  game.eraserStatus = status;
});

socket.on('colorSet', function(color){
  player.color = color;
});

// chat
// sends message to server
var input = document.getElementById('chatInput');
input.onkeypress = function(e){
  if (!e) e = window.event;
  var keyCode = e.keyCode || e.which;
  if(keyCode == '13' && game.canChat && input.value.match(/[a-z]/i)){
    socket.emit('chat message', [player.id,input.value]);
    input.value = '';
    return false;
  };
}

// RECIEVES THAT THE DRAWER IS INACTVE
socket.on('inactiveDrawer', function(){
  //console.log('inactive user');
  player.canDraw = false;
  game.writeMSG('Drawer is inactive, switching to next person.',1);
});

socket.on('givehintreturn',function(data){
  document.getElementById('hintresult').innerHTML = data;
  document.getElementById('hintresult').style.display = "block";
});

// RECIEVES CHAT FROM OTHER USERS
socket.on('chat message', function(msg){
  game.writeMSG(msg,0);
});

// recieves that guess was close
socket.on('closeguess', function(){
  game.writeMSG("Your guess was close.",4);
});

// CHECK TO SEE IF USER IS THE DRAWER
// main loop
socket.on('assignDraw', function(data){
  game.changeDrawName(data[0].id);
  //document.getElementById('emptylobby').style.display = "none";
  game.updatePlayerList(data);

  if(data[0].id == player.id){
    player.canDraw = true;
    game.canChat = false;
    game.tools.style.display = 'block';
  }else{
    player.canDraw = false;
    game.tools.style.display = 'none';
    player.canChat = true;
    document.getElementById('word').innerHTML = '';
  }

  if(game.emergencyTime){
    if(game.timeLeftSwitch){
      document.getElementById('timeLeft').className = "timeleft1";
      game.timeLeftSwitch = false;
    }else{
      document.getElementById('timeLeft').className = "timeleft2";
      game.timeLeftSwitch = true;
    }
  }
});

// RECIEVES THAT SOMEONE HAS JOINED THE LOBBY
socket.on('someoneJoined',function(data){
  game.writeMSG(data + ' has joined the lobby.',2);
});

// RECIEVES THAT NO ONE IS IN THE LOBBY
socket.on('emptylobby',function(){
  document.getElementById('emptylobby').style.display = "block";
  game.userOrderList.style.display = "none";
  game.emergencyTime = false;
  document.getElementById('infobar').style.display = "none";
  document.getElementById('timeLeft').className = "timeleft1";
  document.getElementById('hintresult').innerHTML = "";
  document.getElementById('hintresult').style.display = "none";
});

// UPDATES THE ROUNDTIME
socket.on('roundTime', function(time){
  document.getElementById('timeLeft').innerHTML = time;
});

// UPDATES THAT YOU GOT THE ANSWER
socket.on('correctAnswer', function(data){
  game.writeMSG('You guessed the word! +' + Math.floor( data * 100) / 100 + ' points',3);
  game.canChat = false;
});

// UPDATES THE DRAWN WORD
socket.on('word', function(data){
  //console.log(data);
  document.getElementById('word').innerHTML = data;
});

// REVEALS THE WORd
socket.on('revealWord', function(word){
  game.writeMSG('The word was ' + word + '.',1);
  game.canChat = true;
});

// RESETS THE CANVAS
socket.on('resetCanvas', function(){
  game.ctx.clearRect(0, 0, game.c.width, game.c.height);
  document.getElementById('infobar').style.display = "none";
  game.emergencyTime = false;
  document.getElementById('timeLeft').className = "timeleft1";
  document.getElementById('hintresult').style.display = "none";
})

// UPDATES LEADERBOARD
socket.on('leaderboard', function(leaderboard){
  game.updateLeaderboard(leaderboard);
  //console.log("in leaderboard update");
});

// dev msg
socket.on('devmsg', function(msg){
  game.writeMSG("dev: "+msg,1);
});

socket.on('checkinResponse',function(data){
  game.eraserStatus = data[0];
  if(game.eraserStatus){
    game.eraser.className = "eraseron";
  }else{
    game.eraser.className = "eraseroff";
  }

  game.updateLeaderboard(data[1]);
  game.emergencyTime = data[2];

  if(data[2] == true){
    document.getElementById('infobar').style.display = "block";
  }
});

socket.on('canGiveHint',function(data){
  if(data){
    document.getElementById('hint').style.display = "block";
  }else{
    document.getElementById('hint').style.display = "none";
  }
});

// log-in stuff
document.getElementById('startGame').onclick = function(){
  // 1. get username
  var username = document.getElementById('username').value;
  username = username.trim();
  player.tempid = username;
  //console.log(username);
  // 2. check if its taken
  socket.emit("checkUserTaken", username);
}

// enter for login screen
document.getElementById('username').onkeypress = function(e){
  if (!e) e = window.event;
  var keyCode = e.keyCode || e.which;
  if(keyCode == '13' && document.getElementById('username').value.match(/[a-z]/i)){
    var username = document.getElementById('username').value;
    username = username.trim();
    player.tempid = username;
    //console.log(username);
    // 2. check if its taken
    socket.emit("checkUserTaken", username);
  };
}

socket.on("checkUserTakenReturn", function(taken){
  // 2.a if taken make him enter another, show error
  //console.log('checkUserTakenReturn');
  if(taken || !player.tempid.match(/[a-z]/i)){
    document.getElementById('nameerror').style.display = "block";
  }else{ // 2.b if not close login screen, start game
    //console.log("checkUserTakenReturn: false");
    document.getElementById('login').style.display = "none";
    player.id = player.tempid;
    init();
  }
});

socket.on('emergencytime',function(){
  game.emergencyTime = true;
  document.getElementById('infobar').style.display = "block";
});


// START THE CHECKIN
function init(){
  //console.log("called init");
  socket.emit('checkin',player);
}

