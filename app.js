
var socket = io();

var game = new GAME();
var player = new PLAYER();

window.onload = init();

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
  this.emptyLobbyMsg = true;

  this.eraserStatus = false;
  this.eraserCheck = true;
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
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1; 
  }

  this.ctx.stroke();
}

// Writes MSGS to the chat
// case 0 default
// case 1 system
// case 2 user joined
// case 3 correct answer
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

// CHANGES THE DRAWER's NAME
GAME.prototype.changeDrawName = function(name){
  document.getElementById('drawname').innerHTML = name + " IS DRAWING";
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
  this.id = Math.round((new Date).getTime()*Math.random());
  this.canDraw = false;
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

  if((new Date).getTime() - player.lastEmit > 30){
    
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

socket.on('eraserStatus', function(status){
  if(status){
    game.eraser.className = 'eraseron';
  }else{
    game.eraser.className = 'eraseroff';
  }
  game.eraserStatus = status;
});

// chat
// sends message to server
var input = document.getElementById('chatInput');
input.onkeypress = function(e){
  if (!e) e = window.event;
  var keyCode = e.keyCode || e.which;
  if(keyCode == '13' && game.canChat){
    socket.emit('chat message', [player.id,input.value]);
    input.value = '';
    return false;
  };
}

// RECIEVES THAT THE DRAWER IS INACTVE
socket.on('inactiveDrawer', function(){
  console.log('inactive user');
  player.canDraw = false;
  game.canChat = false;
  game.writeMSG('Drawer is inactive, switching to next person.',1);
});

// RECIEVES CHAT FROM OTHER USERS
socket.on('chat message', function(msg){
  game.writeMSG(msg,0);
});

// CHECK TO SEE IF USER IS THE DRAWER
socket.on('assignDraw', function(data){
  game.changeDrawName(data);
  game.emptyLobbyMsg = true;

  if(data == player.id){
    player.canDraw = true;
    game.canChat = false;
    game.tools.style.display = 'block';
  }else{
    player.canDraw = false;
    game.tools.style.display = 'none';
    //player.canChat = true;
    document.getElementById('word').innerHTML = '';
  }
});

// RECIEVES THAT SOMEONE HAS JOINED THE LOBBY
socket.on('someoneJoined',function(data){
  game.writeMSG(data + ' has joined the lobby.',2);
});

// RECIEVES THAT NO ONE IS IN THE LOBBY
socket.on('emptylobby',function(){
  if(game.emptyLobbyMsg){
    game.writeMSG('There is currently no one else in the lobby.',1);
    game.emptyLobbyMsg = false;
  }
});

// UPDATES THE ROUNDTIME
socket.on('roundTime', function(time){
  document.getElementById('timeLeft').innerHTML = time;
});

// UPDATES THAT YOU GOT THE ANSWER
socket.on('correctAnswer', function(data){
  game.writeMSG('You guessed the word! +' + data + ' points',3);
  game.canChat = false;
});

// UPDATES THE DRAWN WORD
socket.on('word', function(data){
  console.log(data);
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
})

socket.on('checkinResponse',function(data){
  game.eraserStatus = data;
  if(game.eraserStatus){
    game.eraser.className = "eraseron";
  }else{
    game.eraser.className = "eraseroff";
  }
});

// START THE CHECKIN
function init(){
  socket.emit('checkin',player);
}

