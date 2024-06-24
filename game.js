var QUALITY = 100;
var FOV = 90;
var SPEED = 2;

var w;
var p;

function start(){
	w = new world();
	for(var i = 0; i < 10; i++){
		w.addobj(
			new obj(
				randv().add(1).mul(300), 
				randv().add(1).mul(300),
				IMG2,
				1
		));
	}
	w.addobj(new obj(new V(-1,   -1), new V(-1, 601), IMG, 2));
	w.addobj(new obj(new V(-1,   -1), new V(601, -1), IMG, 2));
	w.addobj(new obj(new V(601, 601), new V(-1, 601), IMG, 2));
	w.addobj(new obj(new V(601, 601), new V(601, -1), IMG, 2));
	p = new player(new V(100, 125), -30);
}

function loop(dt){
	p.input(w);
	p.render(w);
}

////////
////////

class player {
	constructor(p, d){
		this.p = p;
		this.d = d;
	}

	input(w) {
		this.d += 
			(((input.k.ArrowRight ?? 0) || 
				(input.k.d ?? 0)) - 
			 ((input.k.ArrowLeft ?? 0)  || 
				(input.k.a ?? 0)));

		var m = p2c(this.d, 
								(((input.k.ArrowUp ?? 0)    || 
									(input.k.w ?? 0)) - 
								 ((input.k.ArrowDown ?? 0)  || 
									(input.k.s ?? 0))) * SPEED);
		var hit = false;
		for(var j = 0; j < w.w.length; j++){
			var cast = raycast(this.p, new V(m).norm(), w.w[j].b);
			if(cast[0] && cast[2] < m.mag){
				hit = true;
				break;
			}
		}

		if(hit == false)
			this.p.add(m);
	}

	render(w) {
		var hl = [];
		for(var i = -QUALITY; i < QUALITY; i++){
			var k = p2c(FOV/QUALITY/2*i + this.d, 1);
			var m = Math.cos(FOV/QUALITY/2*i*D2R);
			var c = [Infinity, 0, 0];
			var z = [new V(0, 0), 0, 0];
			for(var j = 0; j < w.w.length; j++){
				var cast = raycast(this.p, k, w.w[j].b);
				if(cast[0] && cast[2] * m < c[0]){
					c = [cast[2] * m, cast[0], cast[1], cast[2], j];	
					//screen distance, pos, t, actual distance, object index
				}
			}
			c[0] = c[0] != Infinity ? c[0] : 0;
			hl.push(c);
		}

		for(var i = 0; i < hl.length; i++){
			var z = hl[i][0];
			var x = 10000 / z;

			var y = 200 - (z * z) / 1000;
			if(i==0)
				log(z, y)
			y = Math.floor(y).toString(16);
			y = y.length == 1 ? '0' + y : y;

			_.fillStyle = "black";
			_.fillStyle = '#' + y.repeat(3);

			//_.fillRect(i*WIDTH/QUALITY/2, 300 - x, WIDTH/QUALITY/2+1, x * 2)
			_.drawImage(
				w.w[hl[i][4]].t,                // Source image
				hl[i][2]*IMG.width, 0,          // Source x, y
				1, IMG.height,  // Source width, height
				i*WIDTH/QUALITY/2, 300 - x,               // Destination x, y
				WIDTH/QUALITY/2+1, x * 2 // Destination width, height
			);
		}

		if(input.k.Enter){
			for(var i = -QUALITY; i < QUALITY; i++){
				var k = p2c(FOV/QUALITY/2*i + this.d, 1);
				line(this.p, k.mul(10000).add(this.p), "blue", 1);
			}
			for(var i = 0; i < w.w.length; i++){
				var b = w.w[i].b;
				line(b.a, b.b, "green", 5);
			}
			line(p.p, 
					 p2c(p.d, 1).mul(30).add(p.p), 
					 "red", 10);
		}
	}
}

class world {
	constructor(){
		this.w = [];
	}

	addobj(o){
		this.w.push(o);
	}
}

class obj {
	constructor(a, b, t, h){
		this.b = new bound(a, b);
		this.t = t;
		this.h = h;
	}
}

class bound {
	constructor(a, b){
		this.a = a;
		this.b = b;
	}

	draw(){
		line(this.a, this.b, "white", 2)
	}
}

function raycast(pos, dir, wall){
	var newdir = new V(dir);
	newdir.norm();

	var x1 = wall.a.x;
	var y1 = wall.a.y;
	var x2 = wall.b.x;
	var y2 = wall.b.y;

	var x3 = pos.x;
	var y3 = pos.y;
	var x4 = pos.x + newdir.x;
	var y4 = pos.y + newdir.y;

	var d = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
	if(d == 0)
		return [];

	var t =   (x1-x3)*(y3-y4)-(y1-y3)*(x3-x4);
	var u = -((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3));

	t /= d;
	u /= d;

	if(!(t > 0 && t < 1 && u > 0))
		return [];

	return [new V(x1+t*(x2-x1), y1+t*(y2-y1)), t, u]
}
