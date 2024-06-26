var SKIPMENU = false;

var QUALITY = 150; //env vars
var FOV = 70;
var NOCLIP = false;

var SPEED = 2;

var JUMPVEL = 50;
var JUMPGRAV = 3;
var GROUNDDECEL = 0.7;
var AIRDECEL = 0.8;

var DEBUGTXT = [];
var DEBUGINDENT = 0;
var DBLOCK = 2;

var ENVVAR = ('QUALITY FOV NOCLIP SPEED JUMPVEL ' + 
	'JUMPGRAV GROUNDDECEL AIRDECEL DBLOCK').split(' ');
var ENVTRIG = 'SHOWTGR HEAL REVIVE'.split(' ');

function SHOWTGR(x){};
function HEAL(x, y){p.heal(x, y)};
function REVIVE(){p.dead=false;p.hp=p.maxhp};

var A_ID = [ //asset - image data
	["fuckibg",411, 423], 
	["mood",471, 500], 
	["med", 681, 590], 
	["gun_0", 434, 1080], 
	["gun_1", 434, 1080]
];
var A;

var w;
var p;

function start(){ //run at start
	input.m.canlock = true;

	A = new asset(IMGSH, 'sd', [A_ID,[['oof',10]]]);

	w = new world(); //make a world
	p = new player(new V(100, 125), -30); //make player
	for(var i = 0; i < 3; i++){ //add 10 objects to world
		w.addobj(
			new obj(
				'in wall',
				randv().add(1).mul(400), //random position
				randv().add(1).mul(400),  
				true, //wall
				"mood" //mood
			));
	}
	w.addobj(new obj('out wall', new V(-1,   -1), new V(-1, 801), true, "fuckibg")); //wall
	w.addobj(new obj('out wall', new V(-1,   -1), new V(801, -1), true, "fuckibg"));
	w.addobj(new obj('out wall', new V(801, 801), new V(-1, 801), true, "fuckibg"));
	w.addobj(new obj('out wall', new V(801, 801), new V(801, -1), true, "fuckibg"));
	
	w.addobj(new obj('out wall', new V(600, 600), new V(700, 700), true, "dong"));
	
	w.addobj(new obj('trigger test', new V(100, 400), new V(400, 100), true, "TRIGGER", 
									 true, true)).
		onhit=x=>p.damage(10);

	w.addobj(new obj('med obj',new V(300, 300), 4 * 3, false, "med", true, true, 0.3, true)).
		onhit=x=>{w.w.splice(w.tag('med obj'), 1);p.heal(10)};

	mkpalette(500, 500);
	/**/text('goober', 10, 0, 'white', 15, "black", 2);
	mkpdone('goober', A);
	
	w.addobj(new obj('goober obj',new V(300, 100), 100, false, "goober", true, true, 0.5, true)).
		onhit=x=>p.p.sub(1000);


	mkpalette(500, 500);
	/**/rect(0, 0, 500, 500, '#ff08');
	/**/text('TRIGGER', 120, 200, '#f00', 60);
	mkpdone('TRIGGER', A);
	A.palettestate('TRIGGER', true);

	mkpalette(500, 500);
	/**/rect(0, 	0, 500, 500, '#000');
	/**/rect(250, 0, 250, 250, '#f0f');
	/**/rect(0, 250, 250, 250, '#f0f');
	mkpdone('FALLBACK', A);
}

function loop(dt){ //loop each frame
	debug('deltatime', dt); //put dt in debug
	w.loop(dt)
	p.loop(w, dt); //update player
	resetdebug(); //reset debug text
	text("fps: " + Math.round(30 * dt), 0, 0, "white");
}

////////
////////

class asset {
	constructor(i, a, d){
		this.i = i;
		this.a = a;
		this.parsedata(d);
		this.genimgs();
		this.palette = {};
	}

	parsedata(data){
		this.d = {
			a: {'oof': {s: 0, e: 10}},
			i: []
		};
		data[0].forEach(img=>{
			var tmp = {};
			tmp.n = img[0];
			tmp.w = img[1];
			tmp.h = img[2];
			this.d.i.push(tmp);
		});
	}

	genimgs(){
		this.imgs = {};
		var data = this.d.i;
		var x = 0;
		for(var i = 0; i < data.length; i++){
			var c = document.createElement('canvas');
			c.width = data[i].w;
			c.height = data[i].h;
			c.getContext('2d').drawImage(
				this.i,
				x, 0, c.width, c.height,
				0, 0, c.width, c.height
			);
			this.imgs[data[i].n] = c;
			x += c.width;
		}
	}

	image(name){
		return this.imgs[name]??
			(this.palette[name]?(this.palette[name].s?this.palette[name].i:null):null)
			??this.palette.FALLBACK.i;
	}

	playsnd(name){
		var a = this.a.cloneNode();
		a.currentTime = this.d.a[name].s;
		a.play();
		a.setTimeout(a.stop, this.d.a[name].e);
	}

	savepalette(name, data){
		this.palette[name] = {i:data,s:true};
	}

	palettestate(name, state){
		this.palette[name].s = state;
	}
}

class player { //player
	constructor(p, d){
		this.p = p; //pos
		this.d = d; //dir
		this.v = new V(0, 0);

		this.y = 0;
		this.vy= 0;

		this.st = 0;
		this.s = new V(0,0);

		this.dead = false;
		this.maxhp = 100;
		this.hp = this.maxhp;
		this.dmging = 0; 

		this.om = new V(0,0);

		this.guns = [new gun('pistol', 10, 100, 20)];
		this.curgun = 0;

		this.shoot = 0;
		this.maxammo = 10;
		this.ammo = this.maxammo;
		this.resammo = 100;
	}

	loop(w, dt){ //stuff for each frame
		this.input(w, dt);
		this.guns[this.curgun].loop(w, dt, this);
		this.debug();
		var hl = this.cast(w);
		this.render(hl, w);
	}

	input(w, dt) { //calc user input
		var SHIFT = ((input.k.shift ?? 0) && !this.dead);
		var JUMP  = ((input.k[' ']  ?? 0) && !this.dead);
		
		if(input.k['~']&&input.k.shift&&input.k.control){
			ENVP();
			input.k['~']=input.k.shift=input.k.control=0;
		}

		if(this.dmging > 0 || this.dmging < 0){
			if(this.dmging < 10){
				this.dmging += dt;
			}else{
				this.dmging = 0;
			}
		}
		
		var mm = new V(input.m.x, input.m.y).sub(this.om).mul(input.m.lock);
		this.om = new V(input.m.x, input.m.y);

		this.d += mm.x * 0.5;
		this.s.add(mm.x * -2.5, 0);

		var adflag = false;
		
		this.vy += this.y < 1 && !this.dead ? JUMP * JUMPVEL : 
			-JUMPGRAV * (!NOCLIP);
		this.vy -= SHIFT * JUMPGRAV * 4 * (!NOCLIP);
		this.y += this.vy * (!NOCLIP);
		var v = SHIFT * -50 - this.dead * 200;
		if(this.y < v){
			this.vy = NOCLIP?0:(this.y = v);
		}
		if(this.y > 0){
			this.v.mul(AIRDECEL);
			adflag = true;
		}
		debug('adflag', adflag)
		this.s.add(0, (this.vy/3)*(!this.dead)+(SHIFT*25));

		var v = 
			(((input.k.arrowup ?? 0)    || 
				(input.k.w ?? 0)) - 
			 ((input.k.arrowdown ?? 0)  || 
				(input.k.s ?? 0))) * !this.dead;

		var m = new V(this.v);

		m.add(
			p2c(
				this.d, //calculate movement
				v * SPEED / (SHIFT + 1) * dt
			));

		var v = //strafe
			(((input.k.arrowright ?? 0) || 
				(input.k.d ?? 0)) - 
			 ((input.k.arrowleft ?? 0)  || 
				(input.k.a ?? 0))) * !this.dead;

		m.add(
			p2c(
				this.d + 90, //calculate movement
				v * SPEED / (SHIFT + 2) * dt
			));

		m.mul(GROUNDDECEL * (!adflag) + adflag);

		var hit = false; //init hit to false

		for(var j = 0; j < w.w.length; j++){ //go through walls
			var cast = 
				raycast(this.p, new V(m).norm(), w.w[j].b); //cast ray for movement
			if(cast[0] && cast[2] < m.mag){ //if hit
				w.w[j].hit(cast[1] * w.w[j].b.len);
				if(w.w[j].hitbox == true){
					hit = cast[0]; //make so it cant move
					j = w.w.length;
				}
			}
		}

		if(!hit || NOCLIP == true) //move if it hit nothing
			this.v = m;
		else
			this.v = new V(0, 0);

		this.p.add(this.v);

		this.st += this.v.mag / SPEED;
		this.s.add(new V(
			Math.sin(this.st * 0.2) * 3,
			Math.sin(this.st * 0.4) * 3
		).mul(m.mag));
		this.s = this.s.mul(0.8);
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
					if(!w.w[j].solid) //not solid
						hl.push(b);
					else if(cast[2] * m < c[0]) //if closer
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
		//sky / ground
		var Y = this.y*0.5 + this.s.y*0.1;
		rect(0, 0, 						WIDTH, HEIGHT/2 + Y, "#8af");
		rect(0, HEIGHT/2 + Y, WIDTH, HEIGHT/2 - Y, "#0a0");
		
		var W = Math.floor(WIDTH/QUALITY/2+1);

		var cur = {};
		for(var i = 0; i < hl.length; i++){
			if(hl[i][0] == 0) //only render if necesary
				continue;

			var x = 30000 / hl[i][0]; //HEIGHT
			var y = 255 - (hl[i][3] * hl[i][3]) / 10000; //BRIGHTNESS
			y = y < 0 ? 0 : y;

			//TRANSFORM
			var X = Math.floor(hl[i][5]);
			var Y = Math.floor(HEIGHT/2 - x + 
												 this.s.y*0.1 + this.y*0.5 - 
												 x*(w.w[hl[i][4]].size-1)*2);
			var H = Math.floor(x*2 - x*(1-w.w[hl[i][4]].size)*2);
			var TEX = w.w[hl[i][4]].tex;
			var TD = A.image(TEX);
			//TEXTURES
			img(A, TEX, //source image
					[(hl[i][2]*
						w.w[hl[i][4]].b.len*
						6/w.w[hl[i][4]].size*
						WIDTH/1000)%
					 (w.w[hl[i][4]].looptex?(TD.width-5):Infinity), 
					 0, 1, TD.height], //source transform
					[X, Y, W, H], //display transform
					(y/25)
				 );

			//DEBUG
			if(Math.abs(WIDTH/2 - hl[i][5]) < 0.5){
				cur.distance = Math.floor(hl[i][3] * 1000) / 1000;
				cur.brightness = Math.floor(y/25 * 1000) / 1000;
				cur.size = (w.w[hl[i][4]]??{}).size;
				cur.texture = (w.w[hl[i][4]]??{}).tex;
				cur.type = (w.w[hl[i][4]]??{}).type ? 'wall' : 'entity';
				cur.opacity = (w.w[hl[i][4]]??{}).solid ? 'solid' : 'transparent';
				cur.hitbox = (w.w[hl[i][4]]??{}).hitbox ? 'solid' : 'not solid';
				cur.h=H;
				cur.y=y;
			}
		}

		debug('AT CURSOR');
		for(var x in cur){
			debug(x, cur[x]);
		}
		debug();

		//DAMAGE
		if(this.dmging > 0)
			rect(0, 0, WIDTH, HEIGHT, 'rgba(255, 0, 0, '+(1-this.dmging/10)+')')
		if(this.dmging < 0)
			rect(0, 0, WIDTH, HEIGHT, 'rgba(0, 255, 0, '+(0-this.dmging/10)+')')
		if(this.dead)
			rect(0, 0, WIDTH, HEIGHT, 'rgba(255, 0, 0, 0.3)');

		//MINIMAP / DEBUG
		if(input.k['='] || input.k['+'] || DBLOCK == 2){ //if enter
			if(input.k['='] || input.k['+']){
				if(DBLOCK == 2){
					DBLOCK = 0;
				}else if(input.k.DBL){
					DBLOCK = 2;
				}
			}

			var c = document.createElement('canvas');
			c.width = 200;
			c.height = 200;
			var _2 = _
			_ = c.getContext('2d');
			_.save();
			_.beginPath();
			_.arc(100, 100, 100, 0, 2 * Math.PI);
			_.clip();
			rect(0, 0, 200, 200, "#08f8");
			_.transform(0.5,0,0,0.5,0,0);
			_.translate(-this.p.x + 200, -this.p.y + 200);
			//_.rotate(D2R * this.d);
			//_.translate(100, 100);
			hl.forEach(h=>{ //rays
				line(this.p, h[1], "blue", 1);
			});
			w.w.forEach(w=>{ //walls
				line(w.b.a, w.b.b, w.type ? "green" : "orange", 5);
			});
			line(this.p, //player
					 p2c(this.d, 1).mul(-20).add(this.p), 
					 "red", 20);
			hl.forEach(pt=>{ //ray hits
				point(pt[1], "yellow");
			});
			_.restore();
			_ = _2;
			_.drawImage(c, 0, 0, 200, 200, 0, 0, 200, 200);
		}

		if(input.k['-'] || input.k['_'] || DBLOCK == 1){
			if(input.k['-'] || input.k['_']){
				if(DBLOCK == 1){
					DBLOCK = 0;
				}else if(input.k.DBL){
					DBLOCK = 1;
				}
			}
			printdebug();
		}

		//GUN OVERLAY
		var sprite = 
			"gun_"+(+(this.guns[this.curgun].shooting > 0 &&
								this.guns[this.curgun].shooting < 5));
		img(A, sprite, //source image
				[0, 0, 
				 (A.image(sprite).width), (A.image(sprite).height)], //source transform
				[WIDTH * (2/3) + this.s.x, HEIGHT - 320 + this.s.y, 
				 200, 500] //display transform
			 );
		var X = WIDTH*(2/3)+this.s.x+75;
		var Y = HEIGHT+this.s.y-15;
		if(this.guns[this.curgun].reloading > 0){
			if(this.guns[this.curgun].resammo > 0){
				rect(X, Y-50, 75, 10, "black");
				rect(X, Y-50,
						 this.guns[this.curgun].reloading *
						 (75 / this.guns[this.curgun].relt), 10, "white");
			}else{
				rect(X, Y-50, 75, 10, "red");
			}
		}
		text(this.guns[this.curgun].ammo+'/'+this.guns[this.curgun].maxammo, X, Y-40, "white");
		text(this.guns[this.curgun].resammo, X, Y-30, "white", 20);

		//HP DISPLAY
		var X = WIDTH*(3/4)+140;
		var Y = HEIGHT-170;
		var H = this.maxhp / 100 * this.hp; 
		var T = this.hp+'/'+this.maxhp;
		_.font = '15px monospace';
		var W = (_.measureText(T).width-15)/2;
		rect(X-4, Y-4, 15+8, 100+8, 				"#000");
		rect(X, Y, 15, 100, 								"#222");
		rect(X, Y+100, 15, -H,		 H > 20 ? "#0f0" : "#f00");
		text(T, X - W, Y - 30, "#fff", 15, 	"#000");

		//CURSOR
		var X = WIDTH/2;				//init vals
		var Y = HEIGHT/2;
		var W = 5;

		rect(X-7, Y-2, W+14, W+4, "black"); //draw outline
		rect(X-2, Y-7, W+4, W+14); 					//draw outline
		rect(X-4, Y+1, W+8, W-2, "white"); 	//draw cursor
		rect(X+1, Y-4, W-2, W+8); 					//draw cursor
	}

	debug(){
		debug('PLAYER');
		/**/debug('pos', this.p);
		/**/debug('vel', this.v);
		/**/debug('y', this.y);
		/**/debug('yvel', this.vy);
		/**/debug('dir', Math.floor(this.d * 1000) / 1000);
		debug();

		debug('GUN');
		/**/debug('swing', this.s);
		/**/debug('shoot T', this.guns[this.curgun].shooting);
		/**/debug('reload T', this.guns[this.curgun].reloading);
		/**/debug('ammo', this.guns[this.curgun].ammo);
		/**/debug('max ammo', this.guns[this.curgun].maxammo);
		/**/debug('ammo reserve', this.guns[this.curgun].resammo);
		debug();
	}

	damage(amt){
		if(amt < 0)
			return this.heal(-amt);
		this.hp -= amt;
		if(this.hp <= 0)
			this.die();
		this.dmging = 10;
	}

	heal(amt, ex){
		if(amt < 0)
			return this.damage(-amt);
		this.hp += amt;
		if(this.hp > this.maxhp && !ex)
			this.hp = this.maxhp;
		this.dmging = -10;
	}

	die(){
		this.dead = true;
	}
}

class world { //world class
	constructor(){
		this.w = []; //world objects
	}

	addobj(o){
		return this.w[this.w.push(o)-1]; //add object to world
	}

	loop(dt){
		this.w.forEach(o=>o.loop(dt))
	}

	tag(t){
		return this.w.findIndex(x=>{
			var i = 0;
			t.split(' ').forEach(y=>{
				x.tags.forEach(z=>i+=y==z);
			});
			return i == t.split(' ').length;
		});
	}

	tags(t){
		return this.w.filter(x=>{
			var i = 0;
			t.split(' ').forEach(y=>{
				x.tags.forEach(z=>i+=y==z);
			});
			return i == t.split(' ').length;
		});
	}
}

class obj { //object class
	constructor(tags, a, b, type, tex, t, h, size=1, loop){
		if(type){
			this.B = new bound(a, b);
		}else{
			this.p = a;
			this.r = b;
		}
		this.tex = tex;
		this.type = type;
		this.solid = !t;
		this.hitbox = !h;
		this.looptex = !loop;
		this.size = size;
		this.tags = tags.split(' ');
		this.onhit = null;
	}

	loop(dt){
		if(this.onloop)
			this.onloop(dt);
	}

	hit(t){
		if(this.onhit)
			this.onhit(t);
	}

	cast(pos, dir){
	}

	get b(){
		if(this.type == true)
			return this.B;

		var x = new V(this.p).sub(p.p);
		var y = p2c(-x.head, 1).mul(this.r);

		return new bound(
			new V(this.p).add(y), 
			new V(this.p).sub(y)
		);
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

class gun {
	constructor(name, maxammo, resammo, relt){
		this.name = name;

		this.shooting = 0;
		this.maxammo = maxammo;
		this.ammo = this.maxammo;
		this.resammo = resammo;
		this.relt = relt;
	}

	getammo(ammo){
		this.resammo += ammo;
	}

	loop(w, dt, p){
		if(input.m.r || input.k.x){ //reload
			this.reloading += dt;
			if(this.reloading > this.relt){
				this.reload();
				this.reloading = this.relt;
			}
		}else{
			this.reloading = 0;
		}

		if((input.m.l || input.k.z) && 
			 this.ammo > 0 && this.reloading == 0){ //shoot
			if(this.shooting == 0){
				this.shoot(w, p);
				p.s.add(30, -50);
			}
			if(this.shooting < 10)
				p.s.add(5, -5);
			if(this.shooting > 5 && this.shooting < 6)
				p.s.add(5, -10);
			this.shooting += dt;
		}else{
			this.shooting = 0;
		}
	}

	shoot(w, p){
		this.ammo--;
	}

	reload(){
		if(this.ammo < this.maxammo){
			var diff = this.maxammo - this.ammo;
			if(this.resammo - diff <= 0){
				diff = this.resammo;
			}
			this.resammo -= diff;
			this.ammo += diff;
		}
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
		(x != undefined ? x + 
		 (y != undefined ? ": " + 
			(typeof y != 'object' ? y : 
			 (y.constructor.name == "V" ? 
				'('+Math.round(y.x * 1000) / 1000+', '+Math.round(y.y * 1000) / 1000+')' :
				JSON.stringify(y))): ': {') : '}') 
	);
	DEBUGINDENT += x != undefined ? (y != undefined ? 0 : 1) : 0;
}
function printdebug(){
	_.fillStyle   = "white";
	_.strokeStyle = "black";
	_.lineWidth = 2;
	_.font = "15px monospace";
	var y = 30//HEIGHT - (DEBUGTXT.length * 20) + 5;
	for(var i = 0; i < DEBUGTXT.length; i++){
		_.strokeText(DEBUGTXT[i], 10, y + i * 20);
		_.fillText  (DEBUGTXT[i], 10, y + i * 20);
	}
}
function resetdebug(){
	DEBUGTXT = [];
	DEBUGINDENT = 0;
}
function ENVP(){
	document.exitPointerLock();
	var x = prompt('enter command (variable and value to set or to trigger).\n'+
								 'available triggers:\n- '+ENVVAR.join('\n- ')+'\n'+
								 'available variables:\n- '+ENVVAR.join('\n- '));

	if(!x)
		return;
	var y = x.split(' ');
	x = y.shift();
	x = x.toUpperCase();
	y = y.map(x=>parseFloat(x)!=NaN?parseFloat(x):x);
	
	if(ENVVAR.indexOf(x)==-1&&ENVTRIG.indexOf(x)==-1)
		return alert(x + ' does not exist');
	try{
		if(ENVTRIG.indexOf(x)!=-1)
			return eval(x).apply(null, y);
		
		y = y.join(' ');
		eval('x=>'+x+'=x')(y)
	}catch(e){return alert('failed: '+e)}
}
function mkpalette(w, h){
	newpalette = document.createElement('canvas');
	newpalette.width = w;
	newpalette.height = h;
	_2 = _
	_ = newpalette.getContext('2d');
	_.save();
	//_.transform(20, 0, 0, 1, 0, 0);
}
function mkpdone(name, A){
	_.restore();
	_ = _2;
	A.savepalette(name, newpalette);
}
function SHOWTGR(x){
	A.palette.TRIGGER.s = x;
}