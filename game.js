var QUALITY = 100; //env vars
var FOV = 45;
var SPEED = 4;
var TURNSPEED = 1.5;
var JUMPVEL = 50;
var JUMPGRAV = 3;
var NOCLIP = false;

var DEBUGTXT = [];
var DEBUGINDENT = 0;

var w;
var p;

function start(){ //run at start
	w = new world(); //make a world
	p = new player(new V(100, 125), -30); //make player
	for(var i = 0; i < 10; i++){ //add 10 objects to world
		w.addobj(
			new obj(
				randv().add(1).mul(300), //random position
				randv().add(1).mul(300),  
				'wall', //wall
				IMG2 //mood
			));
	}
	w.addobj(new obj(new V(-1,   -1), new V(-1, 601), true, IMG)); //fuckibg walls
	w.addobj(new obj(new V(-1,   -1), new V(601, -1), true, IMG));
	w.addobj(new obj(new V(601, 601), new V(-1, 601), true, IMG));
	w.addobj(new obj(new V(601, 601), new V(601, -1), true, IMG));

	w.addobj(new obj(new V(300, 300), 50, false, IMG));
}

function loop(dt){ //loop each frame
	debug('keyboard', input.k)
	debug('deltatime', dt); //put dt in debug
	w.loop(dt)
	p.loop(w, dt); //update player
	resetdebug(); //reset debug text
}

////////
////////

class player { //player
	constructor(p, d){
		this.p = p; //pos
		this.d = d; //dir
		this.y = 0;
		this.vy= 0;
	}

	loop(w, dt){ //stuff for each frame
		this.input(w, dt);
		this.debug();
		var hl = this.cast(w);
		this.render(hl, w);
	}

	input(w, dt) { //calc user input
		this.d += //change direction
			(((input.k.ArrowRight ?? 0) || 
				(input.k.d ?? 0)) - 
			 ((input.k.ArrowLeft ?? 0)  || 
				(input.k.a ?? 0))) * TURNSPEED * dt;
		
		this.vy += this.y < 1 ? (input.k[' '] ?? 0) * JUMPVEL : -JUMPGRAV * (!NOCLIP);
		this.vy -= (input.k.Shift ?? 0) * JUMPGRAV * 4;
		this.y += this.vy;
		if(this.y < (input.k.Shift ?? 0) * -50 && !NOCLIP){
			this.vy = 
			this.y = (input.k.Shift ?? 0) * -50;
		}
		
		var m = p2c(this.d, //calculate movement
								(((input.k.ArrowUp ?? 0)    || 
									(input.k.w ?? 0)) - 
								 ((input.k.ArrowDown ?? 0)  || 
									(input.k.s ?? 0))) * 
								(SPEED / ((input.k.Shift ?? 0) + 1)) * dt);

		var hit = false; //init hit to false

		for(var j = 0; j < w.w.length; j++){ //go through walls
			if(w.w[j].type == false)
				continue;
			var cast = 
				raycast(this.p, new V(m).norm(), w.w[j].b); //cast ray for movement
			if(cast[0] && cast[2] < m.mag){ //if hit
				hit = cast[0]; //make so it cant move
				j = w.w.length;
			}
		}

		if(!hit || NOCLIP == true) //move if it hit nothing
			this.p.add(m);
		else
			this.p = hit.sub(m.norm());
	}

	cast(w){ //raycasting
		var hl = [];
		for(var i = -QUALITY; i < QUALITY; i++){		//go through quality
			var k = p2c(FOV/QUALITY/2*i + this.d, 1); //ray direction
			var m = Math.cos((FOV/QUALITY/2*i)*D2R);	//adjustment for fisheye
			var c = [Infinity, 0, 0, 0, 0, 0];				//storage of data
			for(var j = 0; j < w.w.length; j++){			//loop through walls
				var cast = raycast(this.p, k, w.w[j].b);//do raycast
				if(cast[0]){ //if success
					var b = [
						cast[2] * m, 				//0: screen distance
						cast[0], 						//1: pos
						cast[1], 						//2: t
						cast[2], 						//3: actual distance
						j,									//4: object index
						(i+QUALITY)*WIDTH		//5: screen x
						/QUALITY/2,
						m                   //6: screen adjustment
					];	
					if(!w.w[j].solid){
						hl.push(b);
					}else if(cast[2] * m < c[0]) //if closer
						c = b
				}
			}
			if(c[0] != Infinity){
				hl.push(c);
			}
		};
		hl.sort((a,b)=>a[0]<b[0]?(a[0]==b[0]?0:1):-1)
		return hl;
	}

	render(hl, w) { //render world
		var W = Math.floor(WIDTH/QUALITY/2+1);

		var cur = {};
		for(var i = 0; i < hl.length; i++){
			if(hl[i][0] == 0) //only render if necesary
				continue;

			var x = 30000 / hl[i][0]; //HEIGHT
			var y = 255 - (hl[i][3] * hl[i][3]) / 1000; //BRIGHTNESS
			y = y < 0 ? 0 : y;

			//TRANSFORM
			var X = Math.floor(hl[i][5]);
			var Y = Math.floor((HEIGHT/2) - x + (this.y) * ((0.5-hl[i][6]) * -2));
			var H = Math.floor(x * 2);
			var TEX = w.w[hl[i][4]].tex;
			//TEXTURES
			_.drawImage(
				TEX, //source image
				(hl[i][2]*w.w[hl[i][4]].b.len*6)%(TEX.width-5), 
				0, 1, TEX.height, //source transform
				X, Y, W, H //display transform
			);

			//BRIGHTNESS
			_.fillStyle = 'rgba(0, 0, 0, '+(1-(y/50))+')';	//make black w/ opacity
			_.fillRect(X, Y, W, H)													//fill area

			//DEBUG
			if(Math.abs(WIDTH/2 - hl[i][5]) < 0.5){
				cur.type = (w.w[hl[i][4]]??{}).type ? 'wall' : 'entity';
				cur.brightness = y/50;
			}
		}

		debug('AT CURSOR');
		for(var x in cur){
			debug(x, cur[x]);
		}
		debug();

		//MINIMAP / DEBUG
		if(input.k.Enter){ //if enter 
			hl.forEach(h=>{ //rays
				line(this.p, h[1], "blue", 1);
			});
			w.w.forEach(w=>{ //walls
				line(w.b.a, w.b.b, w.type ? "green" : "orange", 5);
			});
			line(this.p, //player
					 p2c(this.d, 1).mul(30).add(this.p), 
					 "red", 10);
			hl.forEach(pt=>{ //ray hits
				point(pt[1], "yellow");
			});
		}
		printdebug(); //print debug text

		//CURSOR
		var X = WIDTH/2;				//init vals
		var Y = HEIGHT/2;
		var W = 5;
		_.fillStyle = "black"; 						//make black
		_.fillRect(X-7, Y-2, W+14, W+4); 	//draw outline
		_.fillRect(X-2, Y-7, W+4, W+14); 	//draw outline
		_.fillStyle = "white"; 						//make white
		_.fillRect(X-4, Y+1, W+8, W-2); 	//draw cursor
		_.fillRect(X+1, Y-4, W-2, W+8); 	//draw cursor
	}

	debug(){
		debug('PLAYER');
		debug('pos', this.p)
		debug('y', this.y)
		debug('yvel', this.vy)
		debug('dir', this.d)
		debug();
	}
}

class world { //world class
	constructor(){
		this.w = []; //world objects
	}

	addobj(o){
		this.w.push(o); //add object to world
	}

	loop(dt){
		this.w.forEach(o=>o.loop(dt))
	}
}

class obj { //object class
	constructor(a, b, type, tex, t){
		if(type){
			this.B = new bound(a, b);
			this.tex = tex;
			this.type = true;
			this.solid = !t;
		}else{
			this.p = a;
			this.r = b;
			this.tex = tex;
			this.type = false;
			this.solid = !t;
		}
	}

	loop(dt){
		if(this.onloop)
			this.onloop(dt);
	}

	cast(pos, dir){

	}

	get b(){
		if(this.type == true)
			return this.B;

		return new bound(new V(this.p).add(this.r), new V(this.p).sub(this.r));
	}
}

class bound { //boundary class
	constructor(a, b){
		this.a = a;
		this.b = b;
	}

	get len(){
		return new V(this.a).sub(this.b).mag;
	}
}

function raycast(pos, dir, wall){ //raycast
	var newdir = new V(dir);
	newdir.norm();

	var x1 = wall.a.x; // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection
	var y1 = wall.a.y;
	var x2 = wall.b.x;
	var y2 = wall.b.y;

	var x3 = pos.x;
	var y3 = pos.y;
	var x4 = pos.x + newdir.x;
	var y4 = pos.y + newdir.y;

	var d = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
	if(d == 0)
		return []; //if parralel

	var t =   (x1-x3)*(y3-y4)-(y1-y3)*(x3-x4);
	var u = -((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3));

	t /= d;
	u /= d;

	if(!(t >= 0 && t <= 1 && u > 0))
		return []; //if not coliding

	return [new V(x1+t*(x2-x1), y1+t*(y2-y1)), t, u];
}

function debug(x, y){
	DEBUGINDENT += x != undefined ? 0 : -1;
	DEBUGTXT.push(
		'\t'.repeat(DEBUGINDENT) +
		(x != undefined ? x + (y != undefined ? ": " + 
													 (typeof y != 'object' ? y : 
														(y.constructor.name == "V" ? '('+y.x+', '+y.y+')' :
														 JSON.stringify(y)))
													 : ': {') : '}') 
	);
	DEBUGINDENT += x != undefined ? (y != undefined ? 0 : 1) : 0;
}
function printdebug(){
	_.fillStyle = "white";
	_.font = "15px monospace";
	var y = HEIGHT - (DEBUGTXT.length * 20) + 5;
	for(var i = 0; i < DEBUGTXT.length; i++){
		_.fillText(DEBUGTXT[i], 10, y + i * 20);
	}
}
function resetdebug(){
	DEBUGTXT = [];
	DEBUGINDENT = 0;
}
function rotimage(context, image, x, y, width, height, degrees) {
	context.save();
	context.translate(x + width / 2, y + height / 2);
	context.rotate(degrees * Math.PI / 180);
	context.drawImage(image, -width / 2, -height / 2, width, height);	
	context.restore();
}